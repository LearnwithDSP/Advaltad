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

    const { name, city, field, email, phone, user_id, professional_name, base_city, focus_interest, phone_number } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Missing required field: email." });
    }

    // Clean up input values safely
    const cleanEmail = email.replace(/200$/, "").trim().toLowerCase();
    const mappedName = professional_name || name || "Registered Ambassador";
    const mappedCity = base_city || city || "";
    const mappedField = focus_interest || field || "";
    const mappedPhone = phone_number || phone || "";

    const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

    // 1. Check if user already exists in lowercase or uppercase table variants to avoid unique constraint crashes
    let existingUser = null;
    let targetTable = "ambassadors";

    try {
      const { data } = await supabaseClient
        .from("ambassadors")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();
      existingUser = data;
    } catch (e) {
      // Fallback check on capitalized table name
      const { data } = await supabaseClient
        .from("Ambassadors")
        .select("*")
        .ilike("email", cleanEmail)
        .maybeSingle();
      if (data) {
        existingUser = data;
        targetTable = "Ambassadors";
      }
    }

    let dbData: any = null;
    let dbError: any = null;

    const rowData = {
      user_id: user_id || null,
      professional_name: mappedName,
      base_city: mappedCity,
      focus_interest: mappedField,
      email: cleanEmail,
      phone_number: mappedPhone,
      badge_status: "pending"
    };

    if (existingUser) {
      // Update existing record safely
      console.log(`[SERVER REGISTER] Updating existing record in ${targetTable}:`, cleanEmail);
      const { data, error } = await supabaseClient
        .from(targetTable)
        .update(rowData)
        .eq("email", cleanEmail)
        .select()
        .single();
      dbData = data;
      dbError = error;
    } else {
      // Insert fresh row safely without relying on broken ON CONFLICT upserts
      console.log(`[SERVER REGISTER] Inserting fresh row into ${targetTable}:`, rowData);
      const { data, error } = await supabaseClient
        .from(targetTable)
        .insert([rowData])
        .select()
        .single();
      dbData = data;
      dbError = error;

      // Dynamic fallback for capitalized table insertion if lowercase failed
      if (error && targetTable === "ambassadors") {
        console.warn("[SERVER REGISTER] Lowercase insert failed, attempting capitalized fallback...");
        const fallbackRes = await supabaseClient
          .from("Ambassadors")
          .insert([rowData])
          .select()
          .single();
        if (!fallbackRes.error) {
          dbData = fallbackRes.data;
          dbError = null;
          targetTable = "Ambassadors";
        } else {
          dbError = fallbackRes.error;
        }
      }
    }

    if (dbError || !dbData) {
      console.error("[SERVER REGISTER] Error saving ambassador to database:", dbError);
      return res.status(500).json({ error: "Failed to save to Supabase: " + (dbError?.message || "Unknown Insert Error") });
    }

    // 2. Setup Wallet initialized with 1250 AVU tokens linking using the correct fallback ID
    try {
      const resolvedAmbassadorId = dbData.user_id || dbData.id;
      const walletTableName = targetTable === "Ambassadors" ? "Ambassador_wallets" : "ambassador_wallets";

      await supabaseClient
        .from(walletTableName)
        .upsert({
          ambassador_id: resolvedAmbassadorId,
          email: dbData.email,
          balance: 1250
        }, { onConflict: "email" });
    } catch (wErr) {
      console.warn("[SERVER REGISTER] Wallet setup notification:", wErr);
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