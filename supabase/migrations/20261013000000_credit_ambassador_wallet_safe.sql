-- ============================================================================
-- SQL Migration Script: Bulletproof Atomic AVU Wallet Top-up Architecture
-- Function: public.credit_ambassador_wallet_safe
-- Table: public.wallet_deposits
-- ============================================================================

-- 1. Create wallet_deposits table with strict idempotency constraint
CREATE TABLE IF NOT EXISTS public.wallet_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID NOT NULL,
    payment_reference TEXT NOT NULL UNIQUE,
    amount_naira NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    amount_avu NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    provider TEXT NOT NULL DEFAULT 'paystack',
    status TEXT NOT NULL DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for instant lookup by payment_reference & ambassador_id
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_reference 
    ON public.wallet_deposits(payment_reference);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_ambassador 
    ON public.wallet_deposits(ambassador_id);

-- 2. Ensure ambassadors table has avu_balance column
ALTER TABLE public.ambassadors 
    ADD COLUMN IF NOT EXISTS avu_balance NUMERIC(15, 2) DEFAULT 0.00;

-- 3. Atomic Database Function: credit_ambassador_wallet_safe
CREATE OR REPLACE FUNCTION public.credit_ambassador_wallet_safe(
    p_ambassador_id UUID,
    p_amount_avu NUMERIC,
    p_naira_paid NUMERIC,
    p_reference TEXT,
    p_provider TEXT DEFAULT 'paystack'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
    v_existing_deposit RECORD;
    v_current_balance NUMERIC(15, 2);
    v_new_balance NUMERIC(15, 2);
    v_ambassador_exists BOOLEAN;
BEGIN
    -- Input sanitization
    IF p_reference IS NULL OR TRIM(p_reference) = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Missing payment reference'
        );
    END IF;

    IF p_amount_avu <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'AVU amount must be greater than zero'
        );
    END IF;

    -- STEP 1: Idempotency Guard
    SELECT * INTO v_existing_deposit 
    FROM public.wallet_deposits 
    WHERE payment_reference = TRIM(p_reference);

    IF FOUND THEN
        SELECT COALESCE(avu_balance, 0.00) INTO v_current_balance
        FROM public.ambassadors
        WHERE id = p_ambassador_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'message', 'Transaction already processed previously',
            'reference', p_reference,
            'amount_avu', v_existing_deposit.amount_avu,
            'new_balance', COALESCE(v_current_balance, 0.00)
        );
    END IF;

    -- STEP 2: Row-level lock on the ambassador record
    SELECT avu_balance INTO v_current_balance
    FROM public.ambassadors
    WHERE id = p_ambassador_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Ambassador account not found'
        );
    END IF;

    -- STEP 3: Atomic Balance Increment
    v_new_balance := ROUND(COALESCE(v_current_balance, 0.00) + p_amount_avu, 2);

    UPDATE public.ambassadors
    SET 
        avu_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_ambassador_id;

    -- Also sync ambassador_wallet table if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ambassador_wallet'
    ) THEN
        UPDATE public.ambassador_wallet
        SET 
            balance = v_new_balance,
            updated_at = NOW()
        WHERE ambassador_id = p_ambassador_id;
    END IF;

    -- STEP 4: Record Deposit in wallet_deposits
    INSERT INTO public.wallet_deposits (
        ambassador_id,
        payment_reference,
        amount_naira,
        amount_avu,
        provider,
        status,
        metadata
    ) VALUES (
        p_ambassador_id,
        TRIM(p_reference),
        COALESCE(p_naira_paid, 0.00),
        p_amount_avu,
        COALESCE(p_provider, 'paystack'),
        'completed',
        jsonb_build_object(
            'processed_at', NOW(),
            'previous_balance', COALESCE(v_current_balance, 0.00),
            'new_balance', v_new_balance
        )
    );

    -- STEP 5: Sync legacy deposits and transactions tables
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'deposits'
    ) THEN
        INSERT INTO public.deposits (
            ambassador_id,
            amount_naira,
            avu_earned,
            paystack_ref,
            status,
            created_at
        ) VALUES (
            p_ambassador_id,
            COALESCE(p_naira_paid, 0.00),
            p_amount_avu,
            TRIM(p_reference),
            'success',
            NOW()
        )
        ON CONFLICT (paystack_ref) DO UPDATE
        SET status = 'success', avu_earned = EXCLUDED.avu_earned;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'message', 'Wallet successfully credited',
        'reference', p_reference,
        'amount_avu', p_amount_avu,
        'new_balance', v_new_balance
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.credit_ambassador_wallet_safe(UUID, NUMERIC, NUMERIC, TEXT, TEXT) TO authenticated, anon, service_role;
