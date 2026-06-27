import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL;

    // Check configuration
    if (!paystackKey) {
      return NextResponse.json(
        { error: "PAYSTACK_SECRET_KEY is not configured on the server." },
        { status: 500 }
      );
    }
    if (!supabaseUrl || !supabaseServiceRole) {
      return NextResponse.json(
        { error: "Supabase service role configurations are missing." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const { email, name, phone, amount, currency, program_id, note } = body;

    if (!email || !amount || !currency || !program_id) {
      return NextResponse.json(
        { error: "Missing required donation fields (email, amount, currency, program_id)." },
        { status: 400 }
      );
    }

    // Convert to minor units (Kobo/Cents) for Paystack
    const amountInMinor = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInMinor) || amountInMinor <= 0) {
      return NextResponse.json(
        { error: "Invalid donation amount." },
        { status: 400 }
      );
    }

    // Generate reference
    const reference = `don_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

    // Initialize transaction with Paystack live API
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
        callback_url: siteUrl ? `${siteUrl}/donate/success?reference=${reference}` : undefined,
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
        { error: `Paystack transaction initialization failed: ${errorText}` },
        { status: 502 }
      );
    }

    const paystackData = await paystackResponse.json();
    if (!paystackData.status || !paystackData.data?.authorization_url) {
      return NextResponse.json(
        { error: "Paystack did not return a valid authorization URL." },
        { status: 502 }
      );
    }

    // Log a pending row in Supabase 'donations' table using Service Role key for security
    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
    const { error: dbError } = await supabaseClient.from("donations").insert({
      reference,
      email,
      name: name || null,
      phone: phone || null,
      amount: parseFloat(amount),
      currency,
      program_id,
      note: note || null,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error("Supabase logger error:", dbError);
    }

    return NextResponse.json({
      status: true,
      data: {
        authorization_url: paystackData.data.authorization_url,
        reference,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
