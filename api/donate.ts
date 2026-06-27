import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS for client browser fetching
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const paystackKey = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const callbackUrl = process.env.VITE_SITE_URL || "https://advaltad.org";

    if (!paystackKey || !supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: "Server missing environmental variables configuration keys." });
    }

    const { email, amount, name, phone, currency = "NGN", program_id = "general", note = "" } = req.body;

    if (!email || !amount) {
      return res.status(400).json({ error: "Missing required fields: email and amount parameters." });
    }

    const amountInMinor = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInMinor) || amountInMinor <= 0) {
      return res.status(400).json({ error: "Invalid currency conversion calculation limit handled." });
    }

    const reference = `don_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

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
          ],
        },
      }),
    });

    const paystackData = await paystackResponse.json();
    if (!paystackResponse.ok || !paystackData.status || !paystackData.data?.authorization_url) {
      return res.status(502).json({ error: "Paystack server engine initialization response rejected mapping tokens." });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);
    
    await supabaseClient.from("donations").insert({
      reference,
      email,
      name: name || "Anonymous Donor",
      phone: phone || "",
      amount: parseFloat(amount),
      currency,
      program_id,
      note: note || "Advaltad system donation via Quick Form",
      status: "pending",
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({
      status: true,
      authorization_url: paystackData.data.authorization_url,
    });

  } catch (err: any) {
    console.error("Donate server function catch block:", err);
    return res.status(500).json({ error: err?.message || "Internal network framework processor failure." });
  }
}
