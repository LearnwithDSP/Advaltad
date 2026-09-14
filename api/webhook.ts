import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Vercel handles raw body parsing differently. We need the raw body buffer to verify signatures.
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecret || !supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: "Missing required environmental architecture keys." });
    }

    // 1. Validate Paystack Signature Security
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing mandatory payment origin signature headers." });
    }

    // Convert payload back to string to calculate valid hash
    const payload = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(payload)
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).json({ error: "Security check failed: Cryptographic signature mismatch." });
    }

    // 2. Extract Event Core Data
    const { event, data } = req.body;

    // We only care about successful charges
    if (event === 'charge.success') {
      const reference = data.reference || "";
      const gatewayResponse = data.gateway_response || "Successful transaction";
      const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

      const isWalletDeposit = reference.startsWith("WAL-") || 
                              (data.metadata?.custom_fields?.some((f: any) => f.variable_name === "ambassador_id")) ||
                              (data.metadata?.ambassador_id);

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
          return res.status(200).json({ received: true, msg: "Already processed" });
        }

        // 2. Parse payload metadata or default values
        const metadata = data.metadata || {};
        const customFields = metadata.custom_fields || [];
        
        const ambIdField = customFields.find((f: any) => f.variable_name === "ambassador_id");
        const ambEmailField = customFields.find((f: any) => f.variable_name === "ambassador_email");
        const fundingNameField = customFields.find((f: any) => f.variable_name === "funding_by_name");
        const programField = customFields.find((f: any) => f.variable_name === "program_sponsored");
        const avuEarnedField = customFields.find((f: any) => f.variable_name === "avu_earned");

        const ambassadorId = ambIdField?.value || metadata.ambassador_id || (existingDep?.ambassador_id && existingDep.ambassador_id !== "00000000-0000-0000-0000-000000000000" ? existingDep.ambassador_id : "") || "";
        const email = ambEmailField?.value || metadata.ambassador_email || (existingDep?.ambassador_id?.includes("@") ? existingDep.ambassador_id : "") || data.customer?.email || metadata.email || "";
        const amountNaira = data.amount ? data.amount / 100 : 0;
        
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
        const phone = data.customer?.phone || "";

        // 3. Upsert deposit with success status
        if (existingDep) {
          await supabaseClient
            .from("deposits")
            .update({ status: "success", avu_earned: avuToEarn })
            .eq("paystack_reference", reference);
        } else {
          await supabaseClient
            .from("deposits")
            .insert({
              ambassador_id: ambassadorId || email,
              funding_by_name: fundingByName,
              phone_number: phone,
              program_sponsored: programSponsored,
              amount_naira: amountNaira,
              avu_earned: avuToEarn,
              paystack_reference: reference,
              status: "success",
              created_at: data.created_at || new Date().toISOString()
            });
        }

        // 4. Find the ambassador safely across tables without UUID type cast crashes
        const cleanEmail = (email || "").trim().toLowerCase();
        const cleanAmbId = (ambassadorId || "").trim();
        const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || "").trim());

        let ambassador: any = null;
        let foundTable = "ambassadors";

        for (const tableName of ["ambassadors", "Ambassadors"]) {
          if (cleanEmail) {
            const { data } = await supabaseClient
              .from(tableName)
              .select("*")
              .ilike("email", cleanEmail)
              .maybeSingle();
            if (data) {
              ambassador = data;
              foundTable = tableName;
              break;
            }
          }
          if (cleanAmbId && isUuid(cleanAmbId)) {
            const { data } = await supabaseClient
              .from(tableName)
              .select("*")
              .or(`id.eq.${cleanAmbId},user_id.eq.${cleanAmbId}`)
              .maybeSingle();
            if (data) {
              ambassador = data;
              foundTable = tableName;
              break;
            }
          }
          if (cleanAmbId && !isUuid(cleanAmbId) && !cleanAmbId.includes("@")) {
            try {
              const { data } = await supabaseClient
                .from(tableName)
                .select("*")
                .eq("ambassador_id", cleanAmbId)
                .maybeSingle();
              if (data) {
                ambassador = data;
                foundTable = tableName;
                break;
              }
            } catch (_) {}
          }
        }

        if (ambassador) {
          const dbRowId = ambassador.id; // Primary key UUID
          const currentAvuBalance = Math.max(
            Number(ambassador.avu_balance || 0),
            Number(ambassador.ledger_balance || 0)
          );
          const newAvuBalance = Number((currentAvuBalance + avuToEarn).toFixed(3));

          // 5. Update ambassador's avu_balance and ledger_balance in database
          for (const tableName of ["ambassadors", "Ambassadors"]) {
            try {
              const updates = {
                avu_balance: newAvuBalance,
                ledger_balance: newAvuBalance
              };
              if (dbRowId && isUuid(dbRowId)) {
                await supabaseClient
                  .from(tableName)
                  .update(updates)
                  .eq("id", dbRowId);
              }
              if (cleanEmail) {
                await supabaseClient
                  .from(tableName)
                  .update(updates)
                  .ilike("email", cleanEmail);
              }
              if (ambassador.user_id && isUuid(ambassador.user_id)) {
                await supabaseClient
                  .from(tableName)
                  .update(updates)
                  .eq("user_id", ambassador.user_id);
              }
            } catch (uErr) {
              console.warn(`[webhook] Error updating ${tableName}:`, uErr);
            }
          }

          // 6. Update Singular ambassador_wallet table (UUID ambassador_id)
          if (dbRowId && isUuid(dbRowId)) {
            try {
              const { data: singularWallet } = await supabaseClient
                .from("ambassador_wallet")
                .select("id")
                .eq("ambassador_id", dbRowId)
                .maybeSingle();

              if (singularWallet) {
                await supabaseClient
                  .from("ambassador_wallet")
                  .update({ balance: newAvuBalance })
                  .eq("id", singularWallet.id);
              } else {
                await supabaseClient
                  .from("ambassador_wallet")
                  .insert({
                    ambassador_id: dbRowId,
                    balance: newAvuBalance
                  });
              }
            } catch (wErr) {
              console.warn("[webhook] Error updating ambassador_wallet:", wErr);
            }
          }

          // 7. Update Plural ambassador_wallets table (Single Source of Truth)
          try {
            const walletAmbId = ambassador.user_id && isUuid(ambassador.user_id) ? ambassador.user_id : (dbRowId && isUuid(dbRowId) ? dbRowId : null);
            if (walletAmbId) {
              const { error: upsertErr } = await supabaseClient
                .from("ambassador_wallets")
                .upsert({
                  ambassador_id: walletAmbId,
                  avu_balance: newAvuBalance,
                  balance: newAvuBalance,
                  email: cleanEmail,
                  updated_at: new Date().toISOString()
                }, { onConflict: "ambassador_id" });

              if (upsertErr) {
                console.warn("[webhook] ambassador_wallets upsert warning:", upsertErr);
              }
            }
          } catch (_) {}

          // 7b. Log into avu_transactions immutable ledger
          try {
            const txAmbId = ambassador.user_id && isUuid(ambassador.user_id) ? ambassador.user_id : (dbRowId && isUuid(dbRowId) ? dbRowId : null);
            if (txAmbId) {
              await supabaseClient
                .from("avu_transactions")
                .insert({
                  ambassador_id: txAmbId,
                  amount: avuToEarn,
                  type: "PAYSTACK_DEPOSIT",
                  status: "COMPLETED",
                  payment_reference: reference,
                  metadata: {
                    amount_naira: amountNaira,
                    funding_by_name: fundingByName,
                    program_sponsored: programSponsored,
                    customer_email: cleanEmail
                  },
                  created_at: new Date().toISOString()
                });
            }
          } catch (_) {}

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
        const { error: dbError } = await supabaseClient
          .from('donations')
          .update({ 
            status: 'success',
            note: `Paid via Paystack. Gateway ref: ${gatewayResponse}`,
            updated_at: new Date().toISOString()
          })
          .eq('reference', reference);

        if (dbError) {
          console.error("Database status adjustment error:", dbError);
          return res.status(500).json({ error: "Failed to update internal record status." });
        }
      }
    }

    // Always return a 200 OK back to Paystack within 2 seconds
    return res.status(200).json({ received: true });

  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: err?.message || "Internal server webhook infrastructure error." });
  }
}
