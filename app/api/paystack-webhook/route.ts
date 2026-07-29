import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecret) {
      return Response.json({ error: "PAYSTACK_SECRET_KEY is missing on server." }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseServiceRole) {
      return Response.json({ error: "Supabase service configuration is missing." }, { status: 500 });
    }

    // Get the raw text from the webhook request body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return Response.json({ error: "Missing x-paystack-signature header." }, { status: 400 });
    }

    // Crytographic validation using HMAC-SHA512
    const hmacHash = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (hmacHash !== signature) {
      console.warn("Invalid signature webhook attempt.");
      return Response.json({ error: "Invalid x-paystack-signature validation failed." }, { status: 401 });
    }

    // Parse verified payload body
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Check for transaction success event
    if (event === "charge.success") {
      const transactionData = payload.data;
      const reference = transactionData.reference || "";
      
      if (!reference) {
        return Response.json({ error: "Reference key not found in payload data." }, { status: 400 });
      }

      // Initialize Supabase Client with service-role to enable safe DB updates
      const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

      const isWalletDeposit = reference.startsWith("WAL-") || 
                              (transactionData.metadata?.custom_fields?.some((f: any) => f.variable_name === "ambassador_id")) ||
                              (transactionData.metadata?.ambassador_id);

      if (isWalletDeposit) {
        // WALLET DEPOSIT (FUNDING) WORKFLOW
        // 1. Check if the deposit already completed to prevent double crediting
        const { data: existingDep, error: depFetchError } = await supabaseClient
          .from("deposits")
          .select("*")
          .eq("paystack_reference", reference)
          .maybeSingle();

        if (existingDep && existingDep.status === "success") {
          console.log(`[WEBHOOK CONTROL] Reference ${reference} already marked success. Skipping to avoid double-crediting.`);
          return Response.json({ status: "success", msg: "Already processed" });
        }

        // 2. Parse payload metadata or default values
        const metadata = transactionData.metadata || {};
        const customFields = metadata.custom_fields || [];
        
        const ambIdField = customFields.find((f: any) => f.variable_name === "ambassador_id");
        const fundingNameField = customFields.find((f: any) => f.variable_name === "funding_by_name");
        const programField = customFields.find((f: any) => f.variable_name === "program_sponsored");
        const avuEarnedField = customFields.find((f: any) => f.variable_name === "avu_earned");

        const ambassadorId = ambIdField?.value || metadata.ambassador_id || "";
        const email = transactionData.customer?.email || metadata.email || "";
        const amountNaira = transactionData.amount ? transactionData.amount / 100 : 0;
        
        // Calculate or read AVU
        let avuToEarn = 0;
        if (avuEarnedField?.value !== undefined) {
          avuToEarn = Number(avuEarnedField.value);
        } else if (metadata.avu_earned !== undefined) {
          avuToEarn = Number(metadata.avu_earned);
        } else {
          avuToEarn = Number(((amountNaira / 1000) * 1.002).toFixed(3));
        }

        const fundingByName = fundingNameField?.value || metadata.funding_by_name || "Self / Webhook Fallback";
        const programSponsored = programField?.value || metadata.program_sponsored || "General";
        const phone = transactionData.customer?.phone || "";

        // 3. Upsert deposit with success status
        if (existingDep) {
          await supabaseClient
            .from("deposits")
            .update({ status: "success" })
            .eq("paystack_reference", reference);
        } else {
          await supabaseClient
            .from("deposits")
            .insert({
              ambassador_id: ambassadorId,
              funding_by_name: fundingByName,
              phone_number: phone,
              program_sponsored: programSponsored,
              amount_naira: amountNaira,
              avu_earned: avuToEarn,
              paystack_reference: reference,
              status: "success",
              created_at: transactionData.created_at || new Date().toISOString()
            });
        }

        // 4. Find the ambassador to get current balance and database primary key row ID
        let { data: ambassador, error: fetchAmbError } = await supabaseClient
          .from("ambassadors")
          .select("*")
          .or(`id.eq.${ambassadorId},user_id.eq.${ambassadorId},email.eq.${email}`)
          .maybeSingle();

        if (fetchAmbError || !ambassador) {
          const fallbackQuery = await supabaseClient
            .from("ambassadors")
            .select("*")
            .ilike("email", email.trim().toLowerCase())
            .maybeSingle();
          ambassador = fallbackQuery.data;
        }

        if (ambassador) {
          const dbRowId = ambassador.id; // Correct database primary key UUID
          const currentAvuBalance = Number(ambassador.avu_balance || 0);
          const newAvuBalance = Number((currentAvuBalance + avuToEarn).toFixed(3));

          // 5. Update ambassador's avu_balance
          await supabaseClient
            .from("ambassadors")
            .update({ avu_balance: newAvuBalance })
            .eq("id", dbRowId);

          // 6. Update Plural ambassador_wallets table
          const { data: pluralWallets, error: pluralFetchErr } = await supabaseClient
            .from("ambassador_wallets")
            .select("*")
            .or(`ambassador_id.eq.${dbRowId},email.eq.${email.trim().toLowerCase()}`);

          if (!pluralFetchErr && pluralWallets && pluralWallets.length > 0) {
            const currentWalletBalance = Number(pluralWallets[0].balance || 0);
            const newWalletBalance = Number((currentWalletBalance + avuToEarn).toFixed(3));
            await supabaseClient
              .from("ambassador_wallets")
              .update({ balance: newWalletBalance })
              .eq("id", pluralWallets[0].id);
          } else {
            await supabaseClient
              .from("ambassador_wallets")
              .insert({
                ambassador_id: dbRowId,
                email: email,
                balance: avuToEarn
              });
          }

          // 7. Update Singular ambassador_wallet table
          const { data: singularWallet, error: singularFetchErr } = await supabaseClient
            .from("ambassador_wallet")
            .select("*")
            .eq("ambassador_id", dbRowId);

          if (!singularFetchErr && singularWallet && singularWallet.length > 0) {
            const currentWalletBalance = Number(singularWallet[0].balance || 0);
            const newWalletBalance = Number((currentWalletBalance + avuToEarn).toFixed(3));
            await supabaseClient
              .from("ambassador_wallet")
              .update({ balance: newWalletBalance })
              .eq("id", singularWallet[0].id);
          } else {
            await supabaseClient
              .from("ambassador_wallet")
              .insert({
                ambassador_id: dbRowId,
                balance: avuToEarn
              });
          }

          // 8. Log activity
          await supabaseClient
            .from("activities")
            .insert({
              id: "ACT-" + Math.floor(Math.random() * 89999 + 10000),
              ambassador_id: dbRowId,
              ambassador_name: ambassador.professional_name || ambassador.name || "Ambassador",
              type: "avu_transfer",
              desc: `Funded wallet with ₦${amountNaira.toLocaleString()} Naira via Webhook. Received ${avuToEarn} AVU tokens (Reference: ${reference}).`,
              amount: `${avuToEarn} AVU`,
              created_at: new Date().toISOString()
            });

          console.log(`[WEBHOOK SUCCESS] Successfully processed WALLET funding for ${email}. Credited ${avuToEarn} AVU.`);
        } else {
          console.error(`[WEBHOOK ERROR] Could not locate ambassador record for wallet funding (ID: ${ambassadorId}, Email: ${email})`);
        }
      } else {
        // GENERAL DONATION WORKFLOW
        // Verify if the donation record already exists
        const { data: existingDonation, error: fetchError } = await supabaseClient
          .from("donations")
          .select("*")
          .eq("reference", reference)
          .maybeSingle();

        if (fetchError) {
          console.error(`Error selecting donation reference ${reference}:`, fetchError);
        }

        const completedAt = transactionData.paid_at || new Date().toISOString();

        if (existingDonation) {
          // Record exists, update status & timestamp
          const { error: updateError } = await supabaseClient
            .from("donations")
            .update({
              status: "success",
              completed_at: completedAt,
              gateway_response: transactionData.gateway_response || "Success",
            })
            .eq("reference", reference);

          if (updateError) {
            console.error(`Failed updating database status for reference ${reference}:`, updateError);
            return Response.json({ error: "Database update error." }, { status: 500 });
          }
        } else {
          // Record doesn't exist, upsert/insert the completed transaction directly
          const metadata = transactionData.metadata;
          const customFields = metadata?.custom_fields || [];
          
          const nameField = customFields.find((f: any) => f.variable_name === "donor_name");
          const phoneField = customFields.find((f: any) => f.variable_name === "donor_phone");
          const programField = customFields.find((f: any) => f.variable_name === "program_id");
          const noteField = customFields.find((f: any) => f.variable_name === "donor_note");

          const { error: insertError } = await supabaseClient
            .from("donations")
            .insert({
              reference,
              email: transactionData.customer?.email || "anonymous@advaltad.org",
              name: nameField?.value || "Anonymous Donor",
              phone: phoneField?.value || "",
              amount: transactionData.amount ? transactionData.amount / 100 : 0, // Convert minor to major
              currency: transactionData.currency || "NGN",
              program_id: programField?.value || "general",
              note: noteField?.value || "",
              status: "success",
              created_at: transactionData.created_at || new Date().toISOString(),
              completed_at: completedAt,
              gateway_response: transactionData.gateway_response || "Success",
            });

          if (insertError) {
            console.error(`Failed inserting completed donation for reference ${reference}:`, insertError);
            return Response.json({ error: "Database insertion error." }, { status: 500 });
          }
        }

        console.log(`Donation with reference ${reference} successfully set to success status.`);
      }
    }

    return Response.json({ status: "success" });
  } catch (err: any) {
    console.error("Paystack Webhook internal error:", err);
    return Response.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
