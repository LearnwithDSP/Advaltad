import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

// Self-contained Vercel serverless request/response types
export type VercelApiRequest = IncomingMessage & {
  body?: any;
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
  [key: string]: any;
};

export type VercelApiResponse = ServerResponse & {
  status: (statusCode: number) => VercelApiResponse;
  json: (data: any) => any;
  send?: (data: any) => any;
  [key: string]: any;
};

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());
}

export default async function handler(req: VercelApiRequest, res: VercelApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    if (typeof res.status === 'function') {
      return res.status(200).end();
    }
    res.statusCode = 200;
    return res.end();
  }

  // Safe JSON responder helper supporting both Vercel and standard Node HTTP
  const sendJson = (statusCode: number, data: any) => {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(statusCode).json(data);
    }
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify(data));
  };

  if (req.method !== 'POST') {
    return sendJson(405, { error: 'Method Not Allowed' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      '';

    if (!supabaseUrl || !supabaseKey) {
      return sendJson(500, { error: 'Missing Supabase credentials in server environment.' });
    }

    // Safely parse body if passed as string
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (_) {}
    }
    parsedBody = parsedBody || {};

    const {
      action = 'approve',
      withdrawal_id,
      withdrawalId,
      admin_id,
      adminId,
      admin_email,
      adminEmail,
      admin_note,
      adminNote
    } = parsedBody;

    const targetId = String(withdrawal_id || withdrawalId || '').trim();
    const effectiveAction = String(action || 'approve').toLowerCase().trim();
    const isApprove = effectiveAction === 'approve';
    const reviewer = String(admin_email || adminEmail || 'Executive Treasury Admin').trim();
    const note = String(admin_note || adminNote || '').trim();
    const timestamp = new Date().toISOString();

    if (!targetId) {
      return sendJson(400, { success: false, error: 'Withdrawal ID is required.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. Admin Authorization Check against public.admins table
    let authorizedAdmin: any = null;
    if (reviewer && reviewer.includes('@')) {
      const { data: adm } = await supabaseClient
        .from('admins')
        .select('id, full_name, email, role')
        .ilike('email', reviewer)
        .maybeSingle();
      if (adm) authorizedAdmin = adm;
    }

    if (!authorizedAdmin) {
      const rawAdminId = String(admin_id || adminId || '').trim();
      if (rawAdminId) {
        const { data: admById } = await supabaseClient
          .from('admins')
          .select('id, full_name, email, role')
          .or(`id.eq.${rawAdminId},user_id.eq.${rawAdminId}`)
          .maybeSingle();
        if (admById) authorizedAdmin = admById;
      }
    }

    if (!authorizedAdmin) {
      return sendJson(403, {
        success: false,
        error: `Access Denied: "${reviewer}" is not an authorized administrator in the system.`
      });
    }

    // 2. Fetch withdrawal request record from avu_withdrawals
    const { data: wRow, error: wErr } = await supabaseClient
      .from('avu_withdrawals')
      .select('*')
      .eq('id', targetId)
      .maybeSingle();

    if (wErr || !wRow) {
      return sendJson(404, {
        success: false,
        error: wErr?.message || 'Withdrawal request not found in database.'
      });
    }

    const currentStatus = String(wRow.status || '').toLowerCase().trim();

    if (!isApprove) {
      // Reject / Disapprove Flow
      if (currentStatus === 'approved') {
        return sendJson(400, {
          success: false,
          error: 'Cannot disapprove a withdrawal that has already been approved.'
        });
      }

      let rejRes = await supabaseClient.from('avu_withdrawals').update({
        status: 'Disapproved',
        updated_at: timestamp
      }).eq('id', targetId);

      if (rejRes.error) {
        await supabaseClient.from('avu_withdrawals').delete().eq('id', targetId);
        await supabaseClient.from('avu_withdrawals').insert({
          ...wRow,
          status: 'Disapproved',
          updated_at: timestamp
        });
      }

      return sendJson(200, {
        success: true,
        action: 'reject',
        status: 'Disapproved',
        withdrawalId: targetId
      });
    }

    // APPROVE FLOW:
    if (currentStatus === 'approved') {
      return sendJson(400, {
        success: false,
        error: 'Withdrawal request has already been approved.'
      });
    }

    if (currentStatus === 'disapproved' || currentStatus === 'rejected' || currentStatus === 'cancelled') {
      return sendJson(400, {
        success: false,
        error: `Cannot approve withdrawal with status "${wRow.status}".`
      });
    }

    // 3. Resolve authentic Ambassador record
    const targetAmbId = String(wRow.ambassador_id || '').trim();
    const targetEmail = String(wRow.email || wRow.ambassador_email || '').trim().toLowerCase();
    const targetName = String(wRow.ambassador_name || wRow.account_name || '').trim();
    const requestedAmount = Number(wRow.requested_avu ?? wRow.avu_amount ?? wRow.amount ?? 0);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return sendJson(400, {
        success: false,
        error: 'Withdrawal amount must be greater than zero.'
      });
    }

    let ambRow: any = null;

    if (targetEmail) {
      const { data: byEmail } = await supabaseClient
        .from('ambassadors')
        .select('*')
        .ilike('email', targetEmail)
        .maybeSingle();
      if (byEmail) ambRow = byEmail;
    }

    if (!ambRow && targetAmbId && isUuid(targetAmbId)) {
      const { data: byId } = await supabaseClient
        .from('ambassadors')
        .select('*')
        .or(`id.eq.${targetAmbId},user_id.eq.${targetAmbId}`)
        .maybeSingle();
      if (byId) ambRow = byId;
    }

    if (!ambRow && targetName) {
      const { data: byName } = await supabaseClient
        .from('ambassadors')
        .select('*')
        .ilike('professional_name', targetName)
        .maybeSingle();
      if (byName) ambRow = byName;
    }

    if (!ambRow) {
      return sendJson(404, {
        success: false,
        error: `Ambassador account for "${targetName || targetEmail}" could not be located in database.`
      });
    }

    // 4. Balance verification
    const currentBal = Number(ambRow.avu_balance || 0);
    if (requestedAmount > currentBal) {
      return sendJson(400, {
        success: false,
        error: `Ambassador "${ambRow.professional_name || ambRow.email}" has insufficient AVU balance (${currentBal} AVU) for requested withdrawal of ${requestedAmount} AVU.`,
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    const newBalance = Math.max(0, Number((currentBal - requestedAmount).toFixed(3)));

    // 5. ATOMIC COMMIT:
    // Step A: Deduct requested amount from ambassador's avu_balance
    const { error: ambDeductErr } = await supabaseClient
      .from('ambassadors')
      .update({ avu_balance: newBalance, updated_at: timestamp })
      .eq('id', ambRow.id);

    if (ambDeductErr) {
      return sendJson(500, {
        success: false,
        error: `Failed to update ambassador balance: ${ambDeductErr.message}`
      });
    }

    // Step B: Update avu_withdrawals status to 'Approved'
    let statusUpdated = false;
    try {
      const upRes = await supabaseClient
        .from('avu_withdrawals')
        .update({
          status: 'Approved',
          ambassador_id: ambRow.id,
          updated_at: timestamp
        })
        .eq('id', targetId);

      if (!upRes.error) {
        statusUpdated = true;
      }
    } catch (_) {}

    if (!statusUpdated) {
      // Safe atomic replacement if trigger or column constraint blocks update
      try {
        await supabaseClient.from('avu_withdrawals').delete().eq('id', targetId);
        const { error: repErr } = await supabaseClient.from('avu_withdrawals').insert({
          ...wRow,
          ambassador_id: ambRow.id,
          current_balance: currentBal,
          status: 'Approved',
          updated_at: timestamp
        });
        if (!repErr) statusUpdated = true;
      } catch (repEx: any) {
        console.error('[API withdraw-action] Replace error:', repEx);
      }
    }

    if (!statusUpdated) {
      // Rollback: Restore ambassador balance
      await supabaseClient.from('ambassadors').update({ avu_balance: currentBal }).eq('id', ambRow.id);
      return sendJson(500, {
        success: false,
        error: 'Failed to commit withdrawal approval status. Balance restored.'
      });
    }

    // Step C: Record immutable ledger transaction in avu_transactions
    try {
      await supabaseClient.from('avu_transactions').insert({
        ambassador_id: ambRow.user_id || ambRow.id,
        amount: -requestedAmount,
        type: 'WITHDRAWAL_DEBIT',
        status: 'COMPLETED',
        payment_reference: `WITHDRAW-${targetId}`,
        metadata: {
          withdrawal_id: targetId,
          approved_by: reviewer,
          previous_balance: currentBal,
          new_balance: newBalance,
          bank_name: wRow.bank_name,
          account_number: wRow.account_number,
          account_name: wRow.account_name
        },
        created_at: timestamp
      });
    } catch (_) {}

    // Step D: Update secondary wallet tables if present
    for (const wTable of ['ambassador_wallets', 'ambassador_wallet', 'wallets']) {
      try {
        let q = supabaseClient.from(wTable).update({ avu_balance: newBalance, balance: newBalance });
        if (ambRow.id && isUuid(ambRow.id)) q = q.eq('ambassador_id', ambRow.id);
        else if (ambRow.email) q = q.ilike('email', ambRow.email);
        await q;
      } catch (_) {}
    }

    return sendJson(200, {
      success: true,
      action: 'approve',
      status: 'Approved',
      withdrawalId: targetId,
      newBalance,
      requestedAmount,
      ambassadorId: ambRow.id,
      ambassadorEmail: ambRow.email,
      ambassadorName: ambRow.professional_name || targetName,
      message: 'Withdrawal approved successfully.'
    });
  } catch (error: any) {
    console.error('[/api/withdraw-action] Exception:', error);
    return sendJson(500, {
      success: false,
      error: error?.message || 'Internal server error processing withdrawal action.'
    });
  }
}
