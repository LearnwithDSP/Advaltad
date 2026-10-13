// ============================================================================
// Supabase Edge Function: paystack-webhook
// Path: supabase/functions/paystack-webhook/index.ts
// Deployed via: `supabase functions deploy paystack-webhook --no-verify-jwt`
// ============================================================================
// Responsibilities:
// 1. Verifies HMAC SHA512 signature using PAYSTACK_SECRET_KEY
// 2. Filters strictly for 'charge.success'
// 3. Extracts ambassador_id, calculated avu_amount, and naira paid
// 4. Calls public.credit_ambassador_wallet_safe RPC idempotently
// 5. Returns HTTP 200 OK to acknowledge webhook delivery
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-paystack-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Computes HMAC SHA512 using standard Web Crypto API (supported natively in Deno/Supabase).
 */
async function verifyPaystackSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );

    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      encoder.encode(rawBody)
    );

    const hashHex = Array.from(new Uint8Array(signatureBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex.toLowerCase() === signature.trim().toLowerCase();
  } catch (err) {
    console.error("[paystack-webhook] Cryptographic verification exception:", err);
    return false;
  }
}

/**
 * Formula: ₦1,000 = 1.002 AVU
 */
function calculateAvuFromNaira(naira: number): number {
  if (!naira || naira <= 0) return 0;
  const computed = (naira / 1000) * 1.002;
  return Number(computed.toFixed(3));
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Paystack only sends POST requests
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 1. Environment configuration
    const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[paystack-webhook] Missing Supabase environment configuration.");
      return new Response(
        JSON.stringify({ error: "Server Configuration Error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Read raw body as text for HMAC verification
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature") || "";

    // If Paystack secret key is configured, strictly enforce signature verification
    if (paystackSecret) {
      if (!signature) {
        console.warn("[paystack-webhook] Missing x-paystack-signature header");
        return new Response(
          JSON.stringify({ error: "Missing mandatory x-paystack-signature header" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const isValid = await verifyPaystackSignature(rawBody, signature, paystackSecret);
      if (!isValid) {
        console.warn("[paystack-webhook] Invalid HMAC signature provided");
        return new Response(
          JSON.stringify({ error: "Cryptographic signature mismatch" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.warn("[paystack-webhook] Warning: PAYSTACK_SECRET_KEY is not set. Processing with caution.");
    }

    // 3. Parse JSON payload
    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { event, data } = payload;
    console.log(`[paystack-webhook] Received event: ${event}, reference: ${data?.reference}`);

    // Strictly process only 'charge.success'
    if (event !== "charge.success") {
      return new Response(JSON.stringify({ received: true, status: "ignored_event" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Extract transaction core data
    const paymentReference = data?.reference;
    if (!paymentReference) {
      return new Response(JSON.stringify({ error: "Missing transaction reference in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Note: Paystack amounts are in KOBO (1 NGN = 100 Kobo)
    const amountKobo = Number(data?.amount) || 0;
    const amountNaira = Number((amountKobo / 100).toFixed(2));

    // Extract metadata
    const metadata = data?.metadata || {};
    const customFields: Array<{ variable_name: string; value: any }> = metadata?.custom_fields || [];

    // Resolve ambassador_id from top-level metadata or custom fields
    let ambassadorId = metadata.ambassador_id || metadata.userId || metadata.user_id;
    if (!ambassadorId && Array.isArray(customFields)) {
      const field = customFields.find((f) => f.variable_name === "ambassador_id");
      if (field) ambassadorId = field.value;
    }

    // Fallback: customer email if ambassadorId is empty
    if (!ambassadorId && data?.customer?.email) {
      ambassadorId = data.customer.email;
    }

    if (!ambassadorId) {
      console.warn("[paystack-webhook] Could not resolve ambassador_id from metadata or customer email");
      return new Response(
        JSON.stringify({ received: true, warning: "Missing ambassador identity in metadata" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Resolve avu_amount
    let avuAmount = Number(metadata.avu_amount || metadata.avu_earned);
    if (!avuAmount && Array.isArray(customFields)) {
      const avuField = customFields.find((f) => f.variable_name === "avu_earned" || f.variable_name === "avu_amount");
      if (avuField) avuAmount = Number(avuField.value);
    }

    // Fallback: compute directly from Naira paid
    if (!avuAmount || isNaN(avuAmount) || avuAmount <= 0) {
      avuAmount = calculateAvuFromNaira(amountNaira);
    }

    console.log("[paystack-webhook] Executing atomic credit:", {
      ambassadorId,
      amountNaira,
      avuAmount,
      paymentReference,
    });

    // 5. Initialize Supabase Admin Client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // 6. Execute atomic SQL RPC function: credit_ambassador_wallet_safe
    const { data: rpcResult, error: rpcError } = await supabase.rpc("credit_ambassador_wallet_safe", {
      p_ambassador_id: ambassadorId,
      p_amount_avu: avuAmount,
      p_naira_paid: amountNaira,
      p_reference: paymentReference,
      p_provider: "paystack",
    });

    if (rpcError) {
      console.error("[paystack-webhook] RPC credit_ambassador_wallet_safe error:", rpcError);
      // Return 500 so Paystack can retry if transient database failure
      return new Response(
        JSON.stringify({ error: "Database execution failed", details: rpcError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[paystack-webhook] RPC execution successful:", rpcResult);

    // 7. Acknowledge Paystack immediately with HTTP 200 OK
    return new Response(
      JSON.stringify({
        received: true,
        success: true,
        already_processed: rpcResult?.already_processed ?? false,
        new_balance: rpcResult?.new_balance,
        reference: paymentReference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[paystack-webhook] Unexpected webhook exception:", err);
    return new Response(
      JSON.stringify({ error: "Internal Server Error", message: err?.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
