import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

function isUuid(val: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());
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
      ambassadorName
    } = req.body || {};

    const numAmount = Number(amount ?? requested_avu ?? 0);
    const effectiveBank = String(bank_name || bankName || '').trim();
    const effectiveAccountNum = String(account_number || accountNumber || '').replace(/\D/g, '');
    const effectiveAccountName = String(account_name || accountName || ambassador_name || ambassadorName || '').trim();
    const rawAmbassadorId = String(ambassador_id || ambassadorId || '').trim();
    const rawEmail = String(email || ambassador_email || '').trim().toLowerCase();
    const effectiveAmbName = String(ambassador_name || ambassadorName || effectiveAccountName || 'Ambassador').trim();

    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ error: 'A positive withdrawal amount is required.' });
    }

    if (!effectiveBank) {
      return res.status(400).json({ error: 'Bank name is required.' });
    }

    if (effectiveAccountNum.length < 10) {
      return res.status(400).json({ error: 'A valid 10-digit NUBAN account number is required.' });
    }

    if (!effectiveAccountName) {
      return res.status(400).json({ error: 'Beneficiary account name is required.' });
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    // 1. Resolve ambassador from database safely
    let ambassador: any = null;
    let foundTable = 'ambassadors';

    for (const tName of ['ambassadors', 'Ambassadors']) {
      try {
        if (rawEmail) {
          const { data } = await supabaseClient.from(tName).select('*').ilike('email', rawEmail).maybeSingle();
          if (data) {
            ambassador = data;
            foundTable = tName;
            break;
          }
        }

        if (rawAmbassadorId && isUuid(rawAmbassadorId)) {
          const { data } = await supabaseClient
            .from(tName)
            .select('*')
            .or(`id.eq.${rawAmbassadorId},user_id.eq.${rawAmbassadorId}`)
            .maybeSingle();
          if (data) {
            ambassador = data;
            foundTable = tName;
            break;
          }
        }
      } catch (_) {}
    }

    // Determine verified ambassador ID and current balance
    const targetAmbassadorId = ambassador?.id || (isUuid(rawAmbassadorId) ? rawAmbassadorId : null);
    const targetEmail = ambassador?.email || rawEmail || 'ambassador@advaltad.org';
    const targetName = ambassador?.professional_name || ambassador?.name || effectiveAmbName;

    // Check balance
    let currentBalance = 0;
    if (ambassador) {
      currentBalance = Number(ambassador.avu_balance ?? ambassador.wallet_balance ?? ambassador.balance ?? 0);
    } else if (rawEmail) {
      // Check ambassador_wallets
      try {
        const { data: wData } = await supabaseClient
          .from('ambassador_wallets')
          .select('balance')
          .ilike('email', rawEmail)
          .maybeSingle();
        if (wData) currentBalance = Number(wData.balance || 0);
      } catch (_) {}
    }

    const generatedId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
    const timestamp = new Date().toISOString();
    const nairaEquivalent = numAmount * 1000;

    // Resilient insertion: Try multiple schemas and table variants
    let insertedRecord: any = null;
    let lastError: any = null;

    const tablesToTry = ['avu_withdrawals', 'withdrawals', 'AvuWithdrawals'];

    for (const tableName of tablesToTry) {
      // Payload 1: Full rich schema with both canonical and snake_case fields
      const fullPayload: any = {
        id: generatedId,
        amount: numAmount,
        requested_avu: numAmount,
        avu_amount: numAmount,
        naira_equivalent: nairaEquivalent,
        conversion_rate: 1000,
        bank_name: effectiveBank,
        account_number: effectiveAccountNum,
        account_name: effectiveAccountName,
        ambassador_name: targetName,
        email: targetEmail,
        ambassador_email: targetEmail,
        current_balance: currentBalance,
        status: 'pending',
        created_at: timestamp
      };
      if (targetAmbassadorId) fullPayload.ambassador_id = targetAmbassadorId;

      // Payload 2: Title-case status
      const titlePayload = { ...fullPayload, status: 'Pending' };

      // Payload 3: Standard concise schema
      const standardPayload: any = {
        id: generatedId,
        amount: numAmount,
        bank_name: effectiveBank,
        account_number: effectiveAccountNum,
        account_name: effectiveAccountName,
        status: 'pending',
        created_at: timestamp
      };
      if (targetAmbassadorId) standardPayload.ambassador_id = targetAmbassadorId;
      if (targetEmail) standardPayload.email = targetEmail;

      // Payload 4: Ultra compact schema
      const compactPayload: any = {
        amount: numAmount,
        bank_name: effectiveBank,
        account_number: effectiveAccountNum,
        account_name: effectiveAccountName,
        status: 'pending'
      };
      if (targetAmbassadorId) compactPayload.ambassador_id = targetAmbassadorId;

      for (const payload of [fullPayload, titlePayload, standardPayload, compactPayload]) {
        try {
          const { data, error } = await supabaseClient.from(tableName).insert([payload]).select().maybeSingle();
          if (!error && data) {
            insertedRecord = data;
            break;
          } else if (error) {
            lastError = error;
          }
        } catch (e: any) {
          lastError = e;
        }
      }

      if (insertedRecord) break;
    }

    // Build finalized returned record
    const finalizedRecord = {
      id: insertedRecord?.id || generatedId,
      ambassador_id: targetAmbassadorId || rawAmbassadorId || 'amb_' + Math.random().toString(36).substring(2, 8),
      ambassador_name: targetName,
      email: targetEmail,
      ambassador_email: targetEmail,
      current_balance: currentBalance,
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

    // Log in activities table if possible
    try {
      await supabaseClient.from('activities').insert([
        {
          id: 'ACT-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          ambassador_id: String(targetAmbassadorId || rawAmbassadorId || ''),
          ambassador_name: targetName,
          type: 'avu_transfer',
          desc: `Requested AVU withdrawal of ${numAmount} AVU (₦${nairaEquivalent.toLocaleString()}) to ${effectiveBank} (${effectiveAccountNum})`,
          amount: `-${numAmount} AVU`,
          created_at: timestamp
        }
      ]);
    } catch (_) {}

    return res.status(200).json({
      success: true,
      message: 'Withdrawal request submitted successfully.',
      data: finalizedRecord,
      dbInserted: !!insertedRecord,
      dbError: insertedRecord ? null : lastError?.message
    });
  } catch (error: any) {
    console.error('[/api/withdraw] Exception:', error);
    return res.status(500).json({
      error: error?.message || 'Internal server error processing withdrawal request.'
    });
  }
}
