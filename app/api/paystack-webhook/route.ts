import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecret) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is missing on server." }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json({ error: "Supabase service configuration is missing." }, { status: 500 });
    }

    // Get the raw text from the webhook request body for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-paystack-signature header." }, { status: 400 });
    }

    // Crytographic validation using HMAC-SHA512
    const hmacHash = crypto
      .createHmac("sha512", paystackSecret)
      .update(rawBody)
      .digest("hex");

    if (hmacHash !== signature) {
      console.warn("Invalid signature webhook attempt.");
      return NextResponse.json({ error: "Invalid x-paystack-signature validation failed." }, { status: 401 });
    }

    // Parse verified payload body
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Check for transaction success event
    if (event === "charge.success") {
      const transactionData = payload.data;
      const reference = transactionData.reference;
      
      if (!reference) {
        return NextResponse.json({ error: "Reference key not found in payload data." }, { status: 400 });
      }

      // Initialize Supabase Client with service-role to enable safe DB updates
      const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

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
          return NextResponse.json({ error: "Database update error." }, { status: 500 });
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
          return NextResponse.json({ error: "Database insertion error." }, { status: 500 });
        }
      }

      console.log(`Donation with reference ${reference} successfully set to success status.`);
    }

    return NextResponse.json({ status: "success" });
  } catch (err: any) {
    console.error("Paystack Webhook internal error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
