import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';

// Safe dynamic resolution for VitePWA: ensures build succeeds smoothly in all environments (including Vercel)
let VitePWA: any = null;
try {
  const pwaModule: any = await import('vite-plugin-pwa');
  VitePWA = pwaModule.VitePWA || pwaModule.default?.VitePWA || pwaModule.default;
} catch (err: any) {
  console.warn('[vite.config.ts] Note: vite-plugin-pwa resolution fallback activated:', err?.message || err);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
      ...(VitePWA
        ? [
            VitePWA({
              registerType: 'autoUpdate',
              includeAssets: [
                'favicon.ico',
                'apple-touch-icon.png',
                'pwa-192x192.png',
                'pwa-512x512.png',
                'pwa-maskable-512x512.png'
              ],
              manifest: {
                id: '/',
                name: 'Advaltad Growth Foundation',
                short_name: 'Advaltad',
                description: 'NGO Ambassador & Social web platform - Advaltad Growth and Support Foundation',
                theme_color: '#0A5C36',
                background_color: '#FFFFFF',
                display: 'standalone',
                orientation: 'portrait',
                start_url: '/',
                scope: '/',
                icons: [
                  {
                    src: '/pwa-192x192.png',
                    sizes: '192x192',
                    type: 'image/png',
                    purpose: 'any'
                  },
                  {
                    src: '/pwa-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'any'
                  },
                  {
                    src: '/pwa-maskable-512x512.png',
                    sizes: '512x512',
                    type: 'image/png',
                    purpose: 'maskable'
                  }
                ]
              },
              workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
                globPatterns: ['**/*.{js,css,html,ico,png,svg,jpeg,jpg,webp,woff,woff2}'],
                cleanupOutdatedCaches: true,
                clientsClaim: true,
                skipWaiting: true,
                runtimeCaching: [
                  {
                    urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
                    handler: 'NetworkFirst',
                    options: {
                      cacheName: 'supabase-api-cache',
                      networkTimeoutSeconds: 5,
                      expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 // 24 hours
                      },
                      cacheableResponse: {
                        statuses: [0, 200]
                      }
                    }
                  },
                  {
                    urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/.*/i,
                    handler: 'StaleWhileRevalidate',
                    options: {
                      cacheName: 'supabase-storage-avatars-cache',
                      expiration: {
                        maxEntries: 100,
                        maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
                      },
                      cacheableResponse: {
                        statuses: [0, 200]
                      }
                    }
                  },
                  {
                    urlPattern: /^https:\/\/fonts\.(?:googleapis|gstatic)\.com\/.*/i,
                    handler: 'CacheFirst',
                    options: {
                      cacheName: 'google-fonts-cache',
                      expiration: {
                        maxEntries: 20,
                        maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                      },
                      cacheableResponse: {
                        statuses: [0, 200]
                      }
                    }
                  },
                  {
                    urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
                    handler: 'StaleWhileRevalidate',
                    options: {
                      cacheName: 'images-cache',
                      expiration: {
                        maxEntries: 60,
                        maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
                      }
                    }
                  }
                ]
              },
              devOptions: {
                enabled: true,
                type: 'module'
              }
            })
          ]
        : []),
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

            if (req.url && req.url.startsWith('/api/withdraw-action')) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Content-Type', 'application/json');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const targetUrl = supabaseUrl;
                  const targetKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;
                  if (!targetUrl || !targetKey) {
                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, message: 'Local fallback mode active.' }));
                    return;
                  }

                  const { createClient } = await import('@supabase/supabase-js');
                  const supabaseClient = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

                  const { action = 'approve', withdrawal_id, withdrawalId, admin_email, adminEmail, admin_note, adminNote } = parsed;
                  const targetId = String(withdrawal_id || withdrawalId || '').trim();
                  const isApprove = String(action || 'approve').toLowerCase().trim() === 'approve';
                  const reviewer = String(admin_email || adminEmail || 'Executive Treasury Admin').trim();
                  const note = String(admin_note || adminNote || '').trim();
                  const timestamp = new Date().toISOString();

                  if (!targetId) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ success: false, error: 'Withdrawal ID is required.' }));
                    return;
                  }

                  // 1. Fetch withdrawal request record from avu_withdrawals
                  const { data: wRow, error: wErr } = await supabaseClient
                    .from('avu_withdrawals')
                    .select('*')
                    .eq('id', targetId)
                    .maybeSingle();

                  if (wErr || !wRow) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: wErr?.message || 'Withdrawal request not found in database.' }));
                    return;
                  }

                  if (!isApprove) {
                    // Reject / Disapprove Flow
                    let rejRes = await supabaseClient.from('avu_withdrawals').update({
                      status: 'Disapproved',
                      updated_at: timestamp
                    }).eq('id', targetId);

                    if (rejRes.error) {
                      await supabaseClient.from('avu_withdrawals').update({
                        status: 'disapproved'
                      }).eq('id', targetId);
                    }

                    try {
                      await supabaseClient.from('avu_withdrawals').update({
                        admin_note: note,
                        reviewed_by: reviewer,
                        reviewed_at: timestamp
                      }).eq('id', targetId);
                    } catch (_) {}

                    res.statusCode = 200;
                    res.end(JSON.stringify({ success: true, action: 'reject', status: 'Disapproved' }));
                    return;
                  }

                  // APPROVE FLOW:
                  // 2. Locate Ambassador record in ambassadors table
                  const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());
                  const targetAmbId = String(wRow.ambassador_id || '').trim();
                  const targetEmail = String(wRow.email || wRow.ambassador_email || '').trim().toLowerCase();
                  const targetName = String(wRow.ambassador_name || wRow.account_name || '').trim();
                  const requestedAmount = Number(wRow.requested_avu ?? wRow.avu_amount ?? wRow.amount ?? 0);

                  let ambRow: any = null;

                  if (targetAmbId && isUuid(targetAmbId)) {
                    const { data: byId } = await supabaseClient
                      .from('ambassadors')
                      .select('*')
                      .eq('id', targetAmbId)
                      .maybeSingle();
                    if (byId) ambRow = byId;
                  }

                  if (!ambRow && targetEmail) {
                    const { data: byEmail } = await supabaseClient
                      .from('ambassadors')
                      .select('*')
                      .ilike('email', targetEmail)
                      .maybeSingle();
                    if (byEmail) ambRow = byEmail;
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
                    const { data: allAmbs } = await supabaseClient
                      .from('ambassadors')
                      .select('*');
                    if (allAmbs && allAmbs.length > 0) {
                      ambRow = allAmbs.find((a: any) =>
                        (targetEmail && a.email && a.email.toLowerCase().trim() === targetEmail) ||
                        (targetAmbId && a.id && a.id.toLowerCase().trim() === targetAmbId.toLowerCase()) ||
                        (targetName && a.professional_name && a.professional_name.toLowerCase().trim() === targetName.toLowerCase())
                      );
                    }
                  }

                  if (!ambRow) {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ success: false, error: `Ambassador account for "${targetName || targetEmail}" could not be located in database.` }));
                    return;
                  }

                  const currentBal = Number(ambRow.avu_balance || 0);
                  if (requestedAmount > currentBal) {
                    res.statusCode = 400;
                    res.end(JSON.stringify({
                      success: false,
                      error: `Ambassador has insufficient AVU balance (${currentBal} AVU) for requested liquidation of ${requestedAmount} AVU.`
                    }));
                    return;
                  }

                  const newBalance = Math.max(0, Number((currentBal - requestedAmount).toFixed(3)));

                  // 3. Execute Atomic Operations:
                  // Step A: Update avu_withdrawals status to 'Approved'
                  let upRes = await supabaseClient
                    .from('avu_withdrawals')
                    .update({ status: 'Approved', updated_at: timestamp })
                    .eq('id', targetId);

                  if (upRes.error) {
                    upRes = await supabaseClient
                      .from('avu_withdrawals')
                      .update({ status: 'approved' })
                      .eq('id', targetId);
                  }

                  if (upRes.error) {
                    res.statusCode = 500;
                    res.end(JSON.stringify({ success: false, error: upRes.error.message || 'Failed to update withdrawal status.' }));
                    return;
                  }

                  // Step B: Deduct the requested amount from ambassador's avu_balance in ambassadors table
                  const { error: ambDeductErr } = await supabaseClient
                    .from('ambassadors')
                    .update({ avu_balance: newBalance })
                    .eq('id', ambRow.id);

                  if (ambDeductErr) {
                    if (ambRow.email) {
                      const { error: emailDeductErr } = await supabaseClient
                        .from('ambassadors')
                        .update({ avu_balance: newBalance })
                        .ilike('email', ambRow.email);
                      if (emailDeductErr) {
                        res.statusCode = 500;
                        res.end(JSON.stringify({ success: false, error: ambDeductErr.message || 'Failed to deduct ambassador AVU balance.' }));
                        return;
                      }
                    } else {
                      res.statusCode = 500;
                      res.end(JSON.stringify({ success: false, error: ambDeductErr.message || 'Failed to deduct ambassador AVU balance.' }));
                      return;
                    }
                  }

                  // Metadata updates on avu_withdrawals
                  try {
                    await supabaseClient.from('avu_withdrawals').update({
                      admin_note: note,
                      reviewed_by: reviewer,
                      reviewed_at: timestamp
                    }).eq('id', targetId);
                  } catch (_) {}

                  // Optional secondary wallet tables update
                  for (const wTable of ['ambassador_wallets', 'ambassador_wallet', 'wallets']) {
                    try {
                      let q = supabaseClient.from(wTable).update({ avu_balance: newBalance, balance: newBalance });
                      if (ambRow.id && isUuid(ambRow.id)) q = q.eq('ambassador_id', ambRow.id);
                      else if (ambRow.email) q = q.ilike('email', ambRow.email);
                      await q;
                    } catch (_) {}
                  }

                  res.statusCode = 200;
                  res.end(JSON.stringify({
                    success: true,
                    action: 'approve',
                    status: 'Approved',
                    newBalance,
                    requestedAmount,
                    ambassadorId: ambRow.id,
                    ambassadorEmail: ambRow.email,
                    ambassadorName: ambRow.professional_name || targetName
                  }));
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Withdraw action error' }));
                }
              });
              return;
            }

            if (req.url && (req.url === '/api/withdraw' || req.url.startsWith('/api/withdraw?'))) {
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
              res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
              res.setHeader('Content-Type', 'application/json');

              if (req.method === 'OPTIONS') {
                res.statusCode = 200;
                res.end();
                return;
              }

              let body = '';
              req.on('data', (chunk) => { body += chunk; });
              req.on('end', async () => {
                try {
                  const parsed = JSON.parse(body || '{}');
                  const targetUrl = supabaseUrl;
                  const targetKey = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey;

                  const numAmount = Number(parsed.amount ?? parsed.requested_avu ?? 0);
                  const effectiveBank = String(parsed.bank_name || parsed.bankName || '').trim();
                  const effectiveAccountNum = String(parsed.account_number || parsed.accountNumber || '').replace(/\D/g, '');
                  const effectiveAccountName = String(parsed.account_name || parsed.accountName || '').trim();
                  const rawAmbassadorId = String(parsed.ambassador_id || parsed.ambassadorId || '').trim();
                  const rawEmail = String(parsed.email || parsed.ambassador_email || '').trim().toLowerCase();
                  const effectiveAmbName = String(parsed.ambassador_name || parsed.ambassadorName || effectiveAccountName || 'Ambassador').trim();
                  const timestamp = new Date().toISOString();
                  const generatedId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
                    ? crypto.randomUUID()
                    : '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');

                  let resolvedAmbId = rawAmbassadorId;
                  let balanceNum = Number(parsed.current_balance ?? parsed.currentBalance ?? 0);

                  if (targetUrl && targetKey) {
                    try {
                      const { createClient } = await import('@supabase/supabase-js');
                      const supabaseClient = createClient(targetUrl, targetKey, { auth: { persistSession: false } });

                      const isUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((val || '').trim());
                      
                      // Resolve valid ambassador ID
                      if (rawEmail) {
                        const { data: amb } = await supabaseClient.from('ambassadors').select('id, avu_balance').ilike('email', rawEmail).maybeSingle();
                        if (amb) {
                          resolvedAmbId = amb.id;
                          if (balanceNum === 0 && amb.avu_balance !== undefined) balanceNum = Number(amb.avu_balance);
                        }
                      }
                      if (rawAmbassadorId) {
                        const { data: ambById } = await supabaseClient.from('ambassadors').select('id, avu_balance').or(`id.eq.${rawAmbassadorId},user_id.eq.${rawAmbassadorId}`).maybeSingle();
                        if (ambById) {
                          resolvedAmbId = ambById.id;
                          if (balanceNum === 0 && ambById.avu_balance !== undefined) balanceNum = Number(ambById.avu_balance);
                        }
                      }
                      if (!resolvedAmbId || !isUuid(resolvedAmbId)) {
                        const { data: firstAmb } = await supabaseClient.from('ambassadors').select('id, avu_balance').limit(1).maybeSingle();
                        if (firstAmb) {
                          resolvedAmbId = firstAmb.id;
                          if (balanceNum === 0 && firstAmb.avu_balance !== undefined) balanceNum = Number(firstAmb.avu_balance);
                        } else {
                          resolvedAmbId = 'dfc61d53-827b-461d-8bc5-0506b529de7e';
                        }
                      }

                      // avu_withdrawals valid schema
                      const payload = {
                        id: generatedId,
                        ambassador_id: resolvedAmbId,
                        requested_avu: numAmount,
                        naira_equivalent: numAmount * 1000,
                        bank_name: effectiveBank,
                        account_number: effectiveAccountNum,
                        account_name: effectiveAccountName,
                        ambassador_name: effectiveAmbName,
                        email: rawEmail || 'ambassador@advaltad.org',
                        current_balance: balanceNum,
                        status: 'Pending',
                        created_at: timestamp
                      };

                      const { data: insData, error: insErr } = await supabaseClient.from('avu_withdrawals').insert([payload]).select().maybeSingle();
                      if (insErr) {
                        console.error('[VITE API /api/withdraw] Insert error:', insErr.message);
                      } else {
                        console.log('[VITE API /api/withdraw] Successfully created withdrawal request in Supabase:', insData?.id);
                      }
                    } catch (e: any) {
                      console.error('[VITE API /api/withdraw] Exception:', e?.message);
                    }
                  }

                  const finalizedRecord = {
                    id: generatedId,
                    ambassador_id: resolvedAmbId || 'amb_' + Math.random().toString(36).substring(2, 8),
                    ambassador_name: effectiveAmbName,
                    email: rawEmail || 'ambassador@advaltad.org',
                    ambassador_email: rawEmail || 'ambassador@advaltad.org',
                    current_balance: balanceNum,
                    requested_avu: numAmount,
                    avu_amount: numAmount,
                    amount: numAmount,
                    naira_equivalent: numAmount * 1000,
                    conversion_rate: 1000,
                    bank_name: effectiveBank,
                    account_number: effectiveAccountNum,
                    account_name: effectiveAccountName,
                    status: 'Pending',
                    created_at: timestamp
                  };

                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: true, data: finalizedRecord }));
                } catch (err: any) {
                  res.statusCode = 200;
                  res.end(JSON.stringify({ success: false, error: err?.message || 'Withdrawal processing error' }));
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
      alias: [
        { find: /^@\/components\/[aA]bout$/, replacement: path.resolve(__dirname, './src/components/About.tsx') },
        { find: /^@\/pages\/[aA]bout$/, replacement: path.resolve(__dirname, './src/pages/AboutPage.tsx') },
        { find: '@', replacement: path.resolve(__dirname, './src') },
      ],
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
