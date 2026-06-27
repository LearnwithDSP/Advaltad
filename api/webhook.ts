import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Vercel handles raw body parsing differently. We need the raw body buffer to verify signatures.
export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const paystackSecret = process.env.PAYSTACK_SECRET_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!paystackSecret || !supabaseUrl || !supabaseServiceRole) {
      return res.status(500).json({ error: "Missing required environmental architecture keys." });
    }

    // 1. Validate Paystack Signature Security
    const signature = req.headers['x-paystack-signature'] as string;
    if (!signature) {
      return res.status(401).json({ error: "Missing mandatory payment origin signature headers." });
    }

    // Convert payload back to string to calculate valid hash
    const payload = JSON.stringify(req.body);
    const hash = crypto
      .createHmac('sha512', paystackSecret)
      .update(payload)
      .digest('hex');

    if (hash !== signature) {
      return res.status(400).json({ error: "Security check failed: Cryptographic signature mismatch." });
    }

    // 2. Extract Event Core Data
    const { event, data } = req.body;

    // We only care about successful charges
    if (event === 'charge.success') {
      const reference = data.reference;
      const gatewayResponse = data.gateway_response || "Successful transaction";

      const supabaseClient = createClient(supabaseUrl, supabaseServiceRole);

      // 3. Update Database Status to Success
      const { error: dbError } = await supabaseClient
        .from('donations')
        .update({ 
          status: 'success',
          note: `Paid via Paystack. Gateway ref: ${gatewayResponse}`,
          updated_at: new Date().toISOString()
        })
        .eq('reference', reference);

      if (dbError) {
        console.error("Database status adjustment error:", dbError);
        return res.status(500).json({ error: "Failed to update internal record status." });
      }
    }

    // Always return a 200 OK back to Paystack within 2 seconds
    return res.status(200).json({ received: true });

  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return res.status(500).json({ error: err?.message || "Internal server webhook infrastructure error." });
  }
}