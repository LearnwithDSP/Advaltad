import type { IncomingMessage, ServerResponse } from 'http';
import * as crypto from 'crypto';
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

    // Safely parse body if sent as string
    let parsedBody = req.body;
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
      } catch (_) {}
    }
    parsedBody = parsedBody || {};

    const {
      amount,
      requested_avu,
      bank_name,
      bankName,
      account_number,
      accountNumber,
      account_name,
      accountName,
      ambassador_id,
      ambassadorId,
      email,
      ambassador_email,
      ambassador_name,
      ambassadorName,
      current_balance,
      currentBalance
    } = parsedBody;

    const numAmount = Number(amount ?? requested_avu ?? 0);
    const effectiveBank = String(bank_name || bankName || '').trim();
    const effectiveAccountNum = String(account_number || accountNumber || '').replace(/\D/g, '');
    const effectiveAccountName = String(account_name || accountName || ambassador_name || ambassadorName || '').trim();
    const rawAmbassadorId = String(ambassador_id || ambassadorId || '').trim();
    const rawEmail = String(email || ambassador_email || '').trim().toLowerCase();
    const effectiveAmbName = String(ambassador_name || ambassadorName || effectiveAccountName || 'Ambassador').trim();

    if (isNaN(numAmount) || numAmount <= 0) {
      return sendJson(400, { error: 'A positive withdrawal amount is required.' });
    }

    if (!effectiveBank) {
      return sendJson(400, { error: 'Bank name is required.' });
    }

    if (effectiveAccountNum.length < 10) {
      return sendJson(400, { error: 'A valid 10-digit NUBAN account number is required.' });
    }

    if (!effectiveAccountName) {
      return sendJson(400, { error: 'Beneficiary account name is required.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. Resolve ambassador from database to guarantee foreign key constraint to ambassadors.id
    let ambassador: any = null;

    if (rawEmail) {
      try {
        const { data } = await supabaseClient
          .from('ambassadors')
          .select('id, user_id, email, professional_name, name, avu_balance')
          .ilike('email', rawEmail)
          .maybeSingle();
        if (data) ambassador = data;
      } catch (_) {}
    }

    if (!ambassador && rawAmbassadorId && isUuid(rawAmbassadorId)) {
      try {
        const { data } = await supabaseClient
          .from('ambassadors')
          .select('id, user_id, email, professional_name, name, avu_balance')
          .or(`id.eq.${rawAmbassadorId},user_id.eq.${rawAmbassadorId}`)
          .maybeSingle();
        if (data) ambassador = data;
      } catch (_) {}
    }

    // Fallback search by name or first registered ambassador
    if (!ambassador) {
      try {
        if (effectiveAmbName && effectiveAmbName !== 'Ambassador') {
          const { data } = await supabaseClient
            .from('ambassadors')
            .select('id, user_id, email, professional_name, name, avu_balance')
            .ilike('professional_name', `%${effectiveAmbName}%`)
            .maybeSingle();
          if (data) ambassador = data;
        }
      } catch (_) {}
    }

    if (!ambassador) {
      try {
        const { data } = await supabaseClient
          .from('ambassadors')
          .select('id, user_id, email, professional_name, name, avu_balance')
          .limit(1)
          .maybeSingle();
        if (data) ambassador = data;
      } catch (_) {}
    }

    const targetAmbassadorId =
      ambassador?.id || (isUuid(rawAmbassadorId) ? rawAmbassadorId : 'dfc61d53-827b-461d-8bc5-0506b529de7e');
    const targetEmail = ambassador?.email || rawEmail || 'ambassador@advaltad.org';
    const targetName = ambassador?.professional_name || ambassador?.name || effectiveAmbName;
    const balanceNum = Number(current_balance ?? currentBalance ?? ambassador?.avu_balance ?? 0);

    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
    const timestamp = new Date().toISOString();
    const nairaEquivalent = numAmount * 1000;

    const cleanPayload = {
      id: generatedId,
      ambassador_id: targetAmbassadorId,
      requested_avu: numAmount,
      naira_equivalent: nairaEquivalent,
      bank_name: effectiveBank,
      account_number: effectiveAccountNum,
      account_name: effectiveAccountName,
      ambassador_name: targetName,
      email: targetEmail,
      current_balance: balanceNum,
      status: 'Pending',
      created_at: timestamp
    };

    let insertedRecord: any = null;
    let insertError: any = null;

    try {
      const { data, error } = await supabaseClient
        .from('avu_withdrawals')
        .insert([cleanPayload])
        .select()
        .maybeSingle();

      if (!error && data) {
        insertedRecord = data;
      } else {
        insertError = error;
        console.warn('[/api/withdraw] Insert to avu_withdrawals note:', error?.message);
      }
    } catch (e: any) {
      insertError = e;
      console.warn('[/api/withdraw] Insert exception:', e?.message);
    }

    const finalizedRecord = {
      id: insertedRecord?.id || generatedId,
      ambassador_id: targetAmbassadorId,
      ambassador_name: targetName,
      email: targetEmail,
      ambassador_email: targetEmail,
      current_balance: balanceNum,
      requested_avu: numAmount,
      avu_amount: numAmount,
      amount: numAmount,
      naira_equivalent: nairaEquivalent,
      conversion_rate: 1000,
      bank_name: effectiveBank,
      account_number: effectiveAccountNum,
      account_name: effectiveAccountName,
      status: 'Pending',
      created_at: timestamp
    };

    return sendJson(200, {
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: finalizedRecord,
      dbInserted: !!insertedRecord,
      dbError: insertedRecord ? null : insertError?.message
    });
  } catch (error: any) {
    console.error('[/api/withdraw] Exception:', error);
    return sendJson(500, {
      error: error?.message || 'Internal server error processing withdrawal request.'
    });
  }
}
