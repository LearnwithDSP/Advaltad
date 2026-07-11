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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: "Server is missing environmental configuration variables." });
    }

    const { name, city, field, email, phone, user_id, password, professional_name, base_city, focus_interest, phone_number } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Missing required field: email." });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

    // Explicit conversion/mapping of input parameters
    const mappedName = professional_name || name || "";
    const mappedCity = base_city || city || "";
    const mappedField = focus_interest || field || "";
    const mappedPhone = phone_number || phone || "";

    // Format row to match database columns tightly
    const rowData = {
      user_id: user_id || null,
      professional_name: mappedName,
      base_city: mappedCity,
      focus_interest: mappedField,
      email: email.trim().toLowerCase(),
      phone_number: mappedPhone,
      badge_status: "pending"
    };

    console.log("[SERVER REGISTER] Upserting row into public.ambassadors:", rowData);

    let dbData: any = null;
    let dbError: any = null;

    // Try first on standard lowercase table
    try {
      const { data, error } = await supabaseClient
        .from("ambassadors")
        .upsert(rowData, { onConflict: "email" })
        .select()
        .single();
      
      dbData = data;
      dbError = error;
    } catch (err: any) {
      dbError = err;
    }

    // Fallback if table name is capitalized
    if (dbError) {
      console.warn("[SERVER REGISTER] Fallback to uppercase Ambassadors table name due to error:", dbError);
      try {
        const { data, error } = await supabaseClient
          .from("Ambassadors")
          .upsert(rowData, { onConflict: "email" })
          .select()
          .single();
        if (!error) {
          dbData = data;
          dbError = null;
        }
      } catch (_) {}
    }

    if (dbError) {
      console.error("[SERVER REGISTER] Error saving ambassador to database:", dbError);
      return res.status(500).json({ error: "Failed to save to Supabase: " + (dbError.message || JSON.stringify(dbError)) });
    }

    // Dynamic wallet setup: ensure the ambassador has a wallet initialized with 1250 AVU
    try {
      const { error: walletErr } = await supabaseClient
        .from("ambassador_wallets")
        .upsert({
          ambassador_id: dbData.id,
          email: dbData.email,
          balance: 1250
        }, { onConflict: "email" });
      
      if (walletErr) {
        // Fallback capitalize table name
        await supabaseClient
          .from("Ambassador_wallets")
          .upsert({
            ambassador_id: dbData.id,
            email: dbData.email,
            balance: 1250
          }, { onConflict: "email" });
      }
    } catch (wErr) {
      console.warn("[SERVER REGISTER] Wallet setup warning:", wErr);
    }

    console.log("[SERVER REGISTER] Registration harvested successfully:", dbData);

    return res.status(200).json({
      status: true,
      data: dbData
    });

  } catch (err: any) {
    console.error("[SERVER REGISTER] Exception handler:", err);
    return res.status(500).json({ error: err?.message || "Internal server register error." });
  }
}
