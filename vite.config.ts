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
