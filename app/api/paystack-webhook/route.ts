import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackKey) {
      return NextResponse.json({ error: "PAYSTACK_SECRET_KEY is missing." }, { status: 500 });
    }
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json({ error: "Supabase configuration is missing." }, { status: 500 });
    }

    // Get the raw body text for signature verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing x-paystack-signature header." }, { status: 400 });
    }

    // Cryptographic signature verification using SHA512 HMAC
    const hash = crypto
      .createHmac("sha512", paystackKey)
      .update(rawBody)
      .digest("hex");

    if (hash !== signature) {
      console.warn("Unauthorized webhook request attempt. Signature mismatch.");
      return NextResponse.json({ error: "Invalid cryptographic signature." }, { status: 401 });
    }

    // Parse the webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;

    // Check if event is charge.success
    if (event === "charge.success") {
      const transactionData = payload.data;
      const reference = transactionData.reference;
      const metadata = transactionData.metadata;

      if (!reference) {
        return NextResponse.json({ error: "Missing reference in transaction payload." }, { status: 400 });
      }

      // Initialize Supabase Client with Service Role
      const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

      // Check if row exists in donations table
      const { data: existingDonation, error: fetchError } = await supabaseClient
        .from("donations")
        .select("*")
        .eq("reference", reference)
        .maybeSingle();

      if (fetchError) {
        console.error(`Error querying donation with reference ${reference}:`, fetchError);
      }

      const completedAt = transactionData.paid_at || new Date().toISOString();

      if (existingDonation) {
        // Update existing row
        const { error: updateError } = await supabaseClient
          .from("donations")
          .update({
            status: "success",
            completed_at: completedAt,
            gateway_response: transactionData.gateway_response || "Successful",
          })
          .eq("reference", reference);

        if (updateError) {
          console.error(`Failed to update donation status in database for reference ${reference}:`, updateError);
          return NextResponse.json({ error: "Database update failed." }, { status: 500 });
        }
      } else {
        // Upsert if it wasn't pre-logged (e.g., custom payment link)
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
            name: nameField?.value || null,
            phone: phoneField?.value || null,
            amount: transactionData.amount ? transactionData.amount / 100 : 0, // Convert minor to major
            currency: transactionData.currency || "NGN",
            program_id: programField?.value || "general",
            note: noteField?.value || null,
            status: "success",
            created_at: transactionData.created_at || new Date().toISOString(),
            completed_at: completedAt,
            gateway_response: transactionData.gateway_response || "Successful",
          });

        if (insertError) {
          console.error(`Failed to insert custom webhook donation for reference ${reference}:`, insertError);
          return NextResponse.json({ error: "Database insert failed." }, { status: 500 });
        }
      }

      console.log(`Donation successfully processed and recorded. Reference: ${reference}`);
    }

    return NextResponse.json({ status: "success" });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
