import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    // Explicitly target the specified callback URL
    const callbackUrl = process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://advaltad.org";

    // Validate configuration
    if (!paystackKey) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY is not configured on the server." },
        { status: 500 }
      );
    }
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { error: "Supabase configuration variables are missing on the server." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, amount, name, phone, currency = "NGN", program_id = "general", note = "" } = body;

    // Validate required fields
    if (!email || !amount) {
      return NextResponse.json(
        { error: "Missing required fields: email and amount." },
        { status: 400 }
      );
    }

    // Convert amount in Naira to minor unit (Kobo)
    const amountInMinor = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInMinor) || amountInMinor <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount." },
        { status: 400 }
      );
    }

    // Generate unique reference ID
    const reference = `don_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // Call Paystack transaction initialization endpoint
    const paystackResponse = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: amountInMinor,
        currency,
        reference,
        callback_url: callbackUrl,
        metadata: {
          custom_fields: [
            { display_name: "Donor Name", variable_name: "donor_name", value: name || "" },
            { display_name: "Donor Phone", variable_name: "donor_phone", value: phone || "" },
            { display_name: "Target Program ID", variable_name: "program_id", value: program_id },
            { display_name: "Donor Note", variable_name: "donor_note", value: note || "" },
          ],
        },
      }),
    });

    if (!paystackResponse.ok) {
      const errorText = await paystackResponse.text();
      return NextResponse.json(
        { error: `Paystack initialisation failure: ${errorText}` },
        { status: 502 }
      );
    }

    const paystackData = await paystackResponse.json();
    if (!paystackData.status || !paystackData.data?.authorization_url) {
      return NextResponse.json(
        { error: "Paystack response did not yield a valid authorization URL." },
        { status: 502 }
      );
    }

    // Create a database client using the Supabase Service Role key for secure insert bypasses
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
    
    // Log the donation into our Postgres database as 'pending'
    const { error: dbError } = await supabaseClient.from("donations").insert({
      reference,
      email,
      name: name || "Anonymous Donor",
      phone: phone || "",
      amount: parseFloat(amount),
      currency,
      program_id,
      note: note || "",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Supabase Database log error on pending insert:", dbError);
    }

    return NextResponse.json({
      status: true,
      authorization_url: paystackData.data.authorization_url,
      data: {
        authorization_url: paystackData.data.authorization_url,
        reference,
      },
    });
  } catch (err: any) {
    console.error("Donate route error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}