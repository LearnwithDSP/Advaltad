import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());
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
    const reviewerId = String(admin_id || adminId || '00000000-0000-0000-0000-000000000000').trim();
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
    let foundTable = 'avu_withdrawals';

    for (const tName of ['avu_withdrawals', 'withdrawals', 'AvuWithdrawals']) {
      try {
        const { data } = await supabaseClient.from(tName).select('*').eq('id', targetWithdrawalId).maybeSingle();
        if (data) {
          withdrawalRecord = data;
          foundTable = tName;
          break;
        }
      } catch (_) {}
    }

    const reqAmount = Number(
      withdrawalRecord?.amount ??
      withdrawalRecord?.requested_avu ??
      withdrawalRecord?.avu_amount ??
      0
    );
    const targetAmbassadorId = String(withdrawalRecord?.ambassador_id || '').trim();
    const targetEmail = String(withdrawalRecord?.email || withdrawalRecord?.ambassador_email || '').trim().toLowerCase();
    const targetName = String(
      withdrawalRecord?.ambassador_name ||
      withdrawalRecord?.account_name ||
      'Ambassador'
    ).trim();

    // 2. Update status in withdrawal table
    const targetStatus = isApprove ? 'Approved' : 'Disapproved';
    const targetStatusLower = isApprove ? 'approved' : 'disapproved';

    for (const tName of ['avu_withdrawals', 'withdrawals', 'AvuWithdrawals']) {
      try {
        await supabaseClient
          .from(tName)
          .update({
            status: targetStatus,
            reviewed_by: reviewerEmail,
            reviewed_at: timestamp,
            admin_note: noteText || undefined,
            updated_at: timestamp
          })
          .eq('id', targetWithdrawalId);

        // Also try lowercase status
        await supabaseClient
          .from(tName)
          .update({
            status: targetStatusLower,
            reviewed_by: reviewerEmail,
            reviewed_at: timestamp,
            admin_note: noteText || undefined,
            updated_at: timestamp
          })
          .eq('id', targetWithdrawalId);
      } catch (_) {}
    }

    let computedNewBal: number | undefined = undefined;

    // 3. If approving: Deduct exact AVU tokens from wallet
    if (isApprove && reqAmount > 0) {
      // Deduct in ambassadors table
      for (const tName of ['ambassadors', 'Ambassadors']) {
        try {
          let ambRow: any = null;
          if (targetAmbassadorId && isUuid(targetAmbassadorId)) {
            const { data } = await supabaseClient
              .from(tName)
              .select('*')
              .or(`id.eq.${targetAmbassadorId},user_id.eq.${targetAmbassadorId}`)
              .maybeSingle();
            ambRow = data;
          }
          if (!ambRow && targetEmail) {
            const { data } = await supabaseClient
              .from(tName)
              .select('*')
              .ilike('email', targetEmail)
              .maybeSingle();
            ambRow = data;
          }

          if (ambRow) {
            const curBal = Number(ambRow.avu_balance ?? ambRow.wallet_balance ?? ambRow.balance ?? 0);
            computedNewBal = Math.max(0, Number((curBal - reqAmount).toFixed(3)));

            await supabaseClient.from(tName).update({
              avu_balance: computedNewBal,
              wallet_balance: computedNewBal,
              ledger_balance: computedNewBal
            }).eq('id', ambRow.id);
          }
        } catch (_) {}
      }

      // Deduct in ambassador_wallets table
      try {
        let wRow: any = null;
        if (targetEmail) {
          const { data } = await supabaseClient.from('ambassador_wallets').select('*').ilike('email', targetEmail).maybeSingle();
          wRow = data;
        }
        if (!wRow && targetAmbassadorId && isUuid(targetAmbassadorId)) {
          const { data } = await supabaseClient.from('ambassador_wallets').select('*').eq('ambassador_id', targetAmbassadorId).maybeSingle();
          wRow = data;
        }
        if (wRow) {
          const curBal = Number(wRow.balance || 0);
          const newB = Math.max(0, Number((curBal - reqAmount).toFixed(3)));
          await supabaseClient.from('ambassador_wallets').update({ balance: newB }).eq('id', wRow.id);
        }
      } catch (_) {}

      // Deduct in ambassador_wallet table
      try {
        if (targetAmbassadorId && isUuid(targetAmbassadorId)) {
          const { data: wRow } = await supabaseClient.from('ambassador_wallet').select('*').eq('ambassador_id', targetAmbassadorId).maybeSingle();
          if (wRow) {
            const curBal = Number(wRow.balance || 0);
            const newB = Math.max(0, Number((curBal - reqAmount).toFixed(3)));
            await supabaseClient.from('ambassador_wallet').update({ balance: newB }).eq('id', wRow.id);
          }
        }
      } catch (_) {}
    }

    // 4. Log in activities and audit_logs
    try {
      await supabaseClient.from('activities').insert([
        {
          id: 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          ambassador_id: targetAmbassadorId || '',
          ambassador_name: targetName,
          type: 'avu_transfer',
          desc: isApprove
            ? `Treasury approved AVU liquidation of ${reqAmount} AVU. Account debited & disbursed.`
            : `Treasury rejected AVU liquidation request of ${reqAmount} AVU.${noteText ? ` Note: ${noteText}` : ''}`,
          amount: isApprove ? `-${reqAmount} AVU` : `0 AVU`,
          created_at: timestamp
        }
      ]);
    } catch (_) {}

    try {
      await supabaseClient.from('audit_logs').insert([
        {
          id: 'AUD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          admin_id: reviewerId,
          admin_name: reviewerEmail,
          admin_email: reviewerEmail,
          ambassador_id: targetAmbassadorId || '',
          ambassador_name: targetName,
          action: isApprove ? `APPROVE_WITHDRAWAL: ${targetWithdrawalId}` : `REJECT_WITHDRAWAL: ${targetWithdrawalId}`,
          created_at: timestamp
        }
      ]);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      action: isApprove ? 'approve' : 'reject',
      status: targetStatus,
      newBalance: computedNewBal,
      requestedAmount: reqAmount,
      withdrawalId: targetWithdrawalId
    });
  } catch (error: any) {
    console.error('[/api/withdraw-action] Exception:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error processing withdrawal action.'
    });
  }
}
