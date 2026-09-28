import type { IncomingMessage, ServerResponse } from 'http';
import { createClient } from '@supabase/supabase-js';

// Self-contained Vercel serverless request/response types
// Avoids hard build-time dependency on external @vercel/node module definitions
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
      action = 'approve', // 'approve' | 'reject' | 'disapprove'
      withdrawal_id,
      withdrawalId,
      admin_id,
      adminId,
      admin_email,
      adminEmail,
      admin_note,
      adminNote
    } = parsedBody;

    const targetWithdrawalId = String(withdrawal_id || withdrawalId || '').trim();
    const effectiveAction = String(action || 'approve').toLowerCase().trim();
    const isApprove = effectiveAction === 'approve';
    const reviewerEmail = String(admin_email || adminEmail || 'Executive Treasury Admin').trim();
    const noteText = String(admin_note || adminNote || '').trim();
    const timestamp = new Date().toISOString();

    if (!targetWithdrawalId) {
      return sendJson(400, { error: 'withdrawal_id is required.' });
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

    // 2. Target status to update: 'Approved' or 'Disapproved'
    const targetStatus = isApprove ? 'Approved' : 'Disapproved';

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
      if (
        updateError.message?.toLowerCase().includes('insufficient') ||
        updateError.details?.toLowerCase().includes('insufficient') ||
        updateError.code === 'P0001'
      ) {
        return sendJson(400, {
          success: false,
          error: 'Insufficient AVU balance in ambassador wallet to approve this withdrawal request.',
          code: 'INSUFFICIENT_BALANCE'
        });
      }

      return sendJson(500, {
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

    return sendJson(200, {
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
    return sendJson(500, {
      error: error?.message || 'Internal server error processing withdrawal action.'
    });
  }
}
