import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || "").trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: "Server is missing Supabase environmental configuration." });
    }

    const { id, email, db_id, user_id, status = "approved" } = req.body || {};

    const cleanEmail = typeof email === "string" ? email.replace(/200$/, "").trim().toLowerCase() : "";
    const cleanId = typeof id === "string" ? id.trim() : "";
    const cleanDbId = typeof db_id === "string" ? db_id.trim() : "";
    const cleanUserId = typeof user_id === "string" ? user_id.trim() : "";
    const normalizedStatus: "pending" | "approved" | "disapproved" =
      status === "approved" ? "approved" : status === "disapproved" ? "disapproved" : "pending";
    const isApprovedFlag = normalizedStatus === "approved";

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    const payloadsToTry = [
      { badge_status: normalizedStatus, status: normalizedStatus, is_approved: isApprovedFlag },
      { badge_status: normalizedStatus, is_approved: isApprovedFlag },
      { status: normalizedStatus, is_approved: isApprovedFlag },
      { is_approved: isApprovedFlag },
      { badge_status: normalizedStatus, status: normalizedStatus },
      { badge_status: normalizedStatus },
      { status: normalizedStatus }
    ];

    const tablesToTry = ["ambassadors", "Ambassadors"];
    let updatedRecord: any = null;

    for (const tableName of tablesToTry) {
      for (const payload of payloadsToTry) {
        try {
          // 1. If email is provided, updating by email is the safest and most direct
          if (cleanEmail) {
            const { data, error } = await supabaseClient
              .from(tableName)
              .update(payload)
              .ilike("email", cleanEmail)
              .select();
            if (!error && data && data.length > 0) {
              updatedRecord = data[0];
              break;
            }
          }

          // 2. If valid UUID primary key db_id
          if (!updatedRecord && cleanDbId && isUuid(cleanDbId)) {
            const { data, error } = await supabaseClient
              .from(tableName)
              .update(payload)
              .eq("id", cleanDbId)
              .select();
            if (!error && data && data.length > 0) {
              updatedRecord = data[0];
              break;
            }
          }

          // 3. If valid UUID user_id
          if (!updatedRecord && cleanUserId && isUuid(cleanUserId)) {
            const { data, error } = await supabaseClient
              .from(tableName)
              .update(payload)
              .eq("user_id", cleanUserId)
              .select();
            if (!error && data && data.length > 0) {
              updatedRecord = data[0];
              break;
            }
          }

          // 4. If cleanId is UUID
          if (!updatedRecord && cleanId && isUuid(cleanId)) {
            const { data, error } = await supabaseClient
              .from(tableName)
              .update(payload)
              .or(`id.eq.${cleanId},user_id.eq.${cleanId}`)
              .select();
            if (!error && data && data.length > 0) {
              updatedRecord = data[0];
              break;
            }
          }

          // 5. If cleanId looks like an email
          if (!updatedRecord && cleanId && cleanId.includes("@")) {
            const { data, error } = await supabaseClient
              .from(tableName)
              .update(payload)
              .ilike("email", cleanId.toLowerCase())
              .select();
            if (!error && data && data.length > 0) {
              updatedRecord = data[0];
              break;
            }
          }
        } catch (innerErr) {
          // Continue to next payload variation
        }
      }
      if (updatedRecord) break;
    }

    if (updatedRecord) {
      return res.status(200).json({
        success: true,
        message: `Successfully updated ambassador status to '${normalizedStatus}'`,
        record: updatedRecord
      });
    }

    // If no row matched via ID/email, report cleanly without 500 error
    return res.status(200).json({
      success: false,
      message: "No matching ambassador row found to update in database."
    });
  } catch (err: any) {
    console.error("[API APPROVE ERROR]:", err);
    return res.status(500).json({ error: err.message || "Failed to update ambassador status." });
  }
}
