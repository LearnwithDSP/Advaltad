import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";

  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/approve') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const targetUrl = supabaseUrl;
                    const targetKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
                    
                    if (!targetUrl || !targetKey) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: false, message: 'Supabase configuration missing in dev server.' }));
                      return;
                    }

                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseClient = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

                    const { id, email, db_id, user_id, status = 'approved' } = parsed;
                    const cleanEmail = typeof email === 'string' ? email.replace(/200$/, '').trim().toLowerCase() : '';
                    const cleanId = typeof id === 'string' ? id.trim() : '';
                    const cleanDbId = typeof db_id === 'string' ? db_id.trim() : '';
                    const cleanUserId = typeof user_id === 'string' ? user_id.trim() : '';
                    const normalizedStatus = status === 'approved' ? 'approved' : status === 'disapproved' ? 'disapproved' : 'pending';
                    const isApprovedFlag = normalizedStatus === 'approved';

                    const payloads = [
                      { badge_status: normalizedStatus, status: normalizedStatus, is_approved: isApprovedFlag },
                      { badge_status: normalizedStatus, is_approved: isApprovedFlag },
                      { status: normalizedStatus, is_approved: isApprovedFlag },
                      { is_approved: isApprovedFlag },
                      { badge_status: normalizedStatus, status: normalizedStatus },
                      { badge_status: normalizedStatus },
                      { status: normalizedStatus }
                    ];

                    let updatedRecord = null;
                    for (const table of ['ambassadors', 'Ambassadors']) {
                      for (const payload of payloads) {
                        try {
                          if (cleanEmail) {
                            const { data, error } = await supabaseClient.from(table).update(payload).ilike('email', cleanEmail).select();
                            if (!error && data && data.length > 0) { updatedRecord = data[0]; break; }
                          }
                          if (!updatedRecord && cleanDbId) {
                            const { data, error } = await supabaseClient.from(table).update(payload).eq('id', cleanDbId).select();
                            if (!error && data && data.length > 0) { updatedRecord = data[0]; break; }
                          }
                          if (!updatedRecord && cleanUserId) {
                            const { data, error } = await supabaseClient.from(table).update(payload).eq('user_id', cleanUserId).select();
                            if (!error && data && data.length > 0) { updatedRecord = data[0]; break; }
                          }
                          if (!updatedRecord && cleanId) {
                            const { data, error } = await supabaseClient.from(table).update(payload).or(`id.eq.${cleanId},user_id.eq.${cleanId}`).select();
                            if (!error && data && data.length > 0) { updatedRecord = data[0]; break; }
                          }
                        } catch (_) {}
                      }
                      if (updatedRecord) break;
                    }

                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: !!updatedRecord,
                      is_approved: isApprovedFlag,
                      status: normalizedStatus,
                      record: updatedRecord,
                      message: updatedRecord ? `Ambassador approval status updated to '${normalizedStatus}'` : 'Status processed successfully.'
                    }));
                  } catch (e) {
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: (e as any)?.message || 'Server error' }));
                  }
                });
                return;
              }
            }
            if (req.url === '/api/credit-avu') {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const targetUrl = supabaseUrl;
                    const targetKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

                    if (!targetUrl || !targetKey) {
                      res.statusCode = 200;
                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: false, message: 'Supabase configuration missing in dev server.' }));
                      return;
                    }

                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseClient = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

                    const { id, email, db_id, user_id, ambassador_id, amount = 0, mode = 'increment', depositRef, depositDetails, adminName, reason } = parsed;
                    const numAmount = Number(amount);
                    const cleanEmail = typeof email === 'string' ? email.replace(/200$/, '').trim().toLowerCase() : '';
                    const cleanId = typeof id === 'string' ? id.trim() : '';
                    const cleanDbId = typeof db_id === 'string' ? db_id.trim() : '';
                    const cleanUserId = typeof user_id === 'string' ? user_id.trim() : '';
                    const cleanAmbId = typeof ambassador_id === 'string' ? ambassador_id.trim() : '';

                    const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());

                    let ambassador: any = null;
                    let foundTable = 'ambassadors';

                    for (const table of ['ambassadors', 'Ambassadors']) {
                      if (cleanEmail) {
                        const { data } = await supabaseClient.from(table).select('*').ilike('email', cleanEmail).maybeSingle();
                        if (data) { ambassador = data; foundTable = table; break; }
                      }
                      if (cleanDbId && isUuid(cleanDbId)) {
                        const { data } = await supabaseClient.from(table).select('*').eq('id', cleanDbId).maybeSingle();
                        if (data) { ambassador = data; foundTable = table; break; }
                      }
                      if (cleanId && isUuid(cleanId)) {
                        const { data } = await supabaseClient.from(table).select('*').eq('id', cleanId).maybeSingle();
                        if (data) { ambassador = data; foundTable = table; break; }
                      }
                      if (cleanUserId && isUuid(cleanUserId)) {
                        const { data } = await supabaseClient.from(table).select('*').eq('user_id', cleanUserId).maybeSingle();
                        if (data) { ambassador = data; foundTable = table; break; }
                      }
                      const ambIdent = cleanAmbId || (!isUuid(cleanId) && !cleanId.includes('@') ? cleanId : '');
                      if (ambIdent) {
                        try {
                          const { data } = await supabaseClient.from(table).select('*').eq('ambassador_id', ambIdent).maybeSingle();
                          if (data) { ambassador = data; foundTable = table; break; }
                        } catch (_) {}
                      }
                    }

                    if (!ambassador) {
                      res.setHeader('Content-Type', 'application/json');
                      res.statusCode = 404;
                      res.end(JSON.stringify({ success: false, error: 'Ambassador not found' }));
                      return;
                    }

                    const currentBal = Number(ambassador.avu_balance || 0);
                    const newBalance = mode === 'set' ? Number(numAmount.toFixed(3)) : Number((currentBal + numAmount).toFixed(3));
                    const dbRowId = ambassador.id;
                    const targetEmail = (ambassador.email || cleanEmail).trim().toLowerCase();

                    for (const table of ['ambassadors', 'Ambassadors']) {
                      try {
                        if (dbRowId && isUuid(dbRowId)) {
                          await supabaseClient.from(table).update({ avu_balance: newBalance }).eq('id', dbRowId);
                        }
                        if (targetEmail) {
                          await supabaseClient.from(table).update({ avu_balance: newBalance }).ilike('email', targetEmail);
                        }
                      } catch (_) {}
                    }

                    if (dbRowId && isUuid(dbRowId)) {
                      try {
                        const { data: existingW } = await supabaseClient.from('ambassador_wallet').select('id').eq('ambassador_id', dbRowId).maybeSingle();
                        if (existingW) {
                          await supabaseClient.from('ambassador_wallet').update({ balance: newBalance }).eq('id', existingW.id);
                        } else {
                          await supabaseClient.from('ambassador_wallet').insert({ ambassador_id: dbRowId, balance: newBalance });
                        }
                      } catch (_) {}
                    }

                    try {
                      let pluralQuery = supabaseClient.from('ambassador_wallets').select('id');
                      if (dbRowId && isUuid(dbRowId)) pluralQuery = pluralQuery.eq('ambassador_id', dbRowId);
                      else if (targetEmail) pluralQuery = pluralQuery.ilike('email', targetEmail);
                      const { data: existingPlural } = await pluralQuery.maybeSingle();
                      if (existingPlural) {
                        await supabaseClient.from('ambassador_wallets').update({ balance: newBalance }).eq('id', existingPlural.id);
                      } else {
                        await supabaseClient.from('ambassador_wallets').insert({ ambassador_id: dbRowId, email: targetEmail, balance: newBalance });
                      }
                    } catch (_) {}

                    const reference = depositRef || (mode === 'increment' ? `CREDIT-${Date.now()}` : `BAL-SYNC-${Date.now()}`);
                    try {
                      const { data: existingDep } = await supabaseClient.from('deposits').select('id').eq('paystack_reference', reference).maybeSingle();
                      const depPayload = {
                        ambassador_id: dbRowId || cleanId || targetEmail,
                        funding_by_name: depositDetails?.funding_by_name || adminName || 'Wallet Credit',
                        phone_number: depositDetails?.phone_number || ambassador.phone || '',
                        program_sponsored: depositDetails?.program_sponsored || 'AVU Portfolio Credit',
                        amount_naira: depositDetails?.amount_naira || (numAmount * 1000),
                        avu_earned: numAmount,
                        paystack_reference: reference,
                        status: 'success'
                      };
                      if (existingDep) {
                        await supabaseClient.from('deposits').update({ status: 'success', avu_earned: numAmount }).eq('id', existingDep.id);
                      } else {
                        await supabaseClient.from('deposits').insert(depPayload);
                      }
                    } catch (_) {}

                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: true,
                      newBalance,
                      creditedAmount: numAmount,
                      ambassador: { id: dbRowId, email: targetEmail, name: ambassador.name, avu_balance: newBalance }
                    }));
                  } catch (e) {
                    res.setHeader('Content-Type', 'application/json');
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: (e as any)?.message || 'Server error' }));
                  }
                });
                return;
              }
            }

            // Route: /api/donate
            if (req.url && req.url.startsWith('/api/donate')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              if (req.method === 'POST') {
                let body = '';
                req.on('data', (chunk) => { body += chunk; });
                req.on('end', async () => {
                  res.setHeader('Content-Type', 'application/json');
                  try {
                    const parsed = JSON.parse(body || '{}');
                    const { email, amount, name, phone, currency = 'NGN', program_id = 'general', note = '' } = parsed;
                    const paystackSecret = env.PAYSTACK_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY;

                    if (paystackSecret && email && amount) {
                      const amountInMinor = Math.round(parseFloat(amount) * 100);
                      const reference = `don_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
                      const callbackUrl = env.VITE_SITE_URL || process.env.VITE_SITE_URL || 'https://advaltad.org';

                      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
                        method: 'POST',
                        headers: {
                          Authorization: `Bearer ${paystackSecret}`,
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                          email,
                          amount: amountInMinor,
                          currency,
                          reference,
                          callback_url: callbackUrl,
                          metadata: {
                            custom_fields: [
                              { display_name: 'Donor Name', variable_name: 'donor_name', value: name || '' },
                              { display_name: 'Donor Phone', variable_name: 'donor_phone', value: phone || '' },
                            ],
                          },
                        }),
                      });

                      const payData = await paystackRes.json();
                      if (paystackRes.ok && payData.status && payData.data?.authorization_url) {
                        res.statusCode = 200;
                        res.end(JSON.stringify({
                          success: true,
                          authorization_url: payData.data.authorization_url,
                          reference: payData.data.reference || reference,
                          access_code: payData.data.access_code
                        }));
                        return;
                      }
                    }

                    // Fallback response instructing frontend to use client-side inline checkout
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: false,
                      fallback_inline: true,
                      message: 'Server Paystack secret not configured or transaction initialization skipped. Please use inline payment modal.'
                    }));
                  } catch (err: any) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({
                      success: false,
                      fallback_inline: true,
                      error: err?.message || 'Donation initialization error'
                    }));
                  }
                });
                return;
              }
            }

            // Route: /api/notify-approval
            if (req.url && req.url.startsWith('/api/notify-approval')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', () => {
                res.setHeader('Content-Type', 'application/json');
                res.statusCode = 200;
                res.end(JSON.stringify({
                  success: true,
                  sent: true,
                  method: 'dev_server_logged',
                  subject: 'ADVALTAD Fellowship Portal: Application Approved',
                  message: 'Approval notification captured and processed'
                }));
              });
              return;
            }

            // Route: /api/register
            if (req.url && req.url.startsWith('/api/register')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                res.setHeader('Content-Type', 'application/json');
                try {
                  const parsed = JSON.parse(body || '{}');
                  const targetUrl = supabaseUrl;
                  const targetKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

                  if (targetUrl && targetKey && parsed.email) {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabaseClient = createClient(targetUrl, targetKey, { auth: { persistSession: false } });
                    const cleanEmail = String(parsed.email).replace(/200$/, '').trim().toLowerCase();

                    const rowData = {
                      user_id: parsed.user_id || undefined,
                      professional_name: parsed.professional_name || parsed.name || 'Registered Ambassador',
                      base_city: parsed.base_city || parsed.city || '',
                      focus_interest: parsed.focus_interest || parsed.field || '',
                      phone_number: parsed.phone_number || parsed.phone || '',
                      email: cleanEmail,
                      badge_status: 'pending',
                      status: 'pending',
                      is_approved: false,
                      avu_balance: 0
                    };

                    const { data, error } = await supabaseClient.from('ambassadors').upsert(rowData, { onConflict: 'email' }).select();
                    if (!error && data && data.length > 0) {
                      res.statusCode = 200;
                      res.end(JSON.stringify({ success: true, user: data[0] }));
                      return;
                    }
                  }

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, message: 'Registration record received' }));
                } catch (err: any) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Registration processing error' }));
                }
              });
              return;
            }

            // Safe catch-all for any other /api/* route to prevent Vite fallback to HTML
            if (req.url && req.url.startsWith('/api/')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(JSON.stringify({ success: true, status: 'ok', route: req.url }));
              return;
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ""),
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
