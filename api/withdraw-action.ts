import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ error: 'Missing Supabase credentials in server environment.' });
    }

    const {
      action = 'approve', // 'approve' | 'reject' | 'disapprove'
      withdrawal_id,
      withdrawalId,
      admin_id,
      adminId,
      admin_email,
      adminEmail,
      admin_note,
      adminNote
    } = req.body || {};

    const targetWithdrawalId = String(withdrawal_id || withdrawalId || '').trim();
    const effectiveAction = String(action || 'approve').toLowerCase().trim();
    const isApprove = effectiveAction === 'approve';
    const reviewerEmail = String(admin_email || adminEmail || 'Executive Treasury Admin').trim();
    const noteText = String(admin_note || adminNote || '').trim();
    const timestamp = new Date().toISOString();

    if (!targetWithdrawalId) {
      return res.status(400).json({ error: 'withdrawal_id is required.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. Locate the withdrawal request record
    let withdrawalRecord: any = null;
    try {
      const { data } = await supabaseClient
        .from('avu_withdrawals')
        .select('*')
        .eq('id', targetWithdrawalId)
        .maybeSingle();
      if (data) withdrawalRecord = data;
    } catch (_) {}

    // 2. Target status to update
    const targetStatus = isApprove ? 'Approved' : 'Disapproved';

    // In avu_withdrawals table, the columns are:
    // id, ambassador_id, requested_avu, naira_equivalent, bank_name, account_number, account_name,
    // ambassador_name, email, current_balance, status, created_at, updated_at
    // NOTE: Setting status = 'Approved' fires a database trigger that checks ambassador's balance and deducts it.
    let updateResult: any = null;
    let updateError: any = null;

    try {
      const { data, error } = await supabaseClient
        .from('avu_withdrawals')
        .update({
          status: targetStatus,
          updated_at: timestamp
        })
        .eq('id', targetWithdrawalId)
        .select()
        .maybeSingle();

      if (!error && data) {
        updateResult = data;
      } else if (error) {
        updateError = error;
      }
    } catch (e: any) {
      updateError = e;
    }

    if (updateError) {
      console.warn('[/api/withdraw-action] Update error:', updateError);
      // If error is insufficient balance from trigger
      if (
        updateError.message?.toLowerCase().includes('insufficient') ||
        updateError.details?.toLowerCase().includes('insufficient') ||
        updateError.code === 'P0001'
      ) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient AVU balance in ambassador wallet to approve this withdrawal request.',
          code: 'INSUFFICIENT_BALANCE'
        });
      }

      return res.status(500).json({
        success: false,
        error: updateError.message || 'Database update failed.'
      });
    }

    // 3. Fetch latest ambassador balance if approved
    let newBalance: number | undefined = undefined;
    const ambId = withdrawalRecord?.ambassador_id || updateResult?.ambassador_id;
    if (ambId) {
      try {
        const { data: amb } = await supabaseClient
          .from('ambassadors')
          .select('avu_balance')
          .eq('id', ambId)
          .maybeSingle();
        if (amb) newBalance = Number(amb.avu_balance || 0);
      } catch (_) {}
    }

    return res.status(200).json({
      success: true,
      action: isApprove ? 'approve' : 'reject',
      status: targetStatus,
      withdrawalId: targetWithdrawalId,
      newBalance,
      updatedRecord: updateResult,
      reviewedBy: reviewerEmail,
      reviewedAt: timestamp,
      adminNote: noteText
    });
  } catch (error: any) {
    console.error('[/api/withdraw-action] Exception:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error processing withdrawal action.'
    });
  }
}
