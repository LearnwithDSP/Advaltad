-- ============================================================================
-- SQL Migration Script: Bulletproof Atomic AVU Wallet Top-up Architecture
-- Function: public.credit_ambassador_wallet_safe
-- Table: public.wallet_deposits
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.wallet_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID NOT NULL,
    amount_avu NUMERIC(15, 3) NOT NULL CHECK (amount_avu > 0),
    naira_paid NUMERIC(15, 2) NOT NULL CHECK (naira_paid >= 0),
    payment_reference TEXT NOT NULL UNIQUE,
    provider TEXT NOT NULL DEFAULT 'paystack',
    status TEXT NOT NULL DEFAULT 'completed',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_wallet_deposits_reference ON public.wallet_deposits(payment_reference);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_ambassador_id ON public.wallet_deposits(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_wallet_deposits_created_at ON public.wallet_deposits(created_at DESC);

ALTER TABLE public.wallet_deposits ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'wallet_deposits' AND policyname = 'Ambassadors can view own wallet deposits'
    ) THEN
        CREATE POLICY "Ambassadors can view own wallet deposits"
            ON public.wallet_deposits
            FOR SELECT
            TO authenticated
            USING (
                ambassador_id = auth.uid() 
                OR EXISTS (
                    SELECT 1 FROM public.ambassadors a 
                    WHERE (a.id = wallet_deposits.ambassador_id OR a.user_id = wallet_deposits.ambassador_id) 
                      AND (a.user_id = auth.uid() OR a.email = auth.jwt()->>'email')
                )
            );
    END IF;
END $$;

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
SET search_path = public
AS $$
DECLARE
    v_clean_ref TEXT;
    v_target_id UUID;
    v_current_bal NUMERIC(15, 3);
    v_new_bal NUMERIC(15, 3);
    v_existing_dep RECORD;
BEGIN
    v_clean_ref := trim(coalesce(p_reference, ''));
    IF v_clean_ref = '' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Missing required payment reference',
            'already_processed', false,
            'new_balance', 0
        );
    END IF;

    IF coalesce(p_amount_avu, 0) <= 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Invalid AVU amount: must be greater than zero',
            'already_processed', false,
            'new_balance', 0
        );
    END IF;

    -- Idempotency Check
    SELECT * INTO v_existing_dep
    FROM public.wallet_deposits
    WHERE payment_reference = v_clean_ref
    LIMIT 1;

    IF FOUND THEN
        SELECT coalesce(avu_balance, 0) INTO v_current_bal
        FROM public.ambassadors
        WHERE id = v_existing_dep.ambassador_id OR user_id = v_existing_dep.ambassador_id
        LIMIT 1;

        IF v_current_bal IS NULL THEN
            SELECT coalesce(balance, 0) INTO v_current_bal
            FROM public.ambassador_wallet
            WHERE ambassador_id = v_existing_dep.ambassador_id
            LIMIT 1;
        END IF;

        RETURN jsonb_build_object(
            'success', true,
            'new_balance', coalesce(v_current_bal, 0),
            'message', 'Payment already processed and credited (idempotent)',
            'already_processed', true,
            'reference', v_clean_ref
        );
    END IF;

    -- Row Lock with FOR UPDATE
    SELECT id, coalesce(avu_balance, 0)
    INTO v_target_id, v_current_bal
    FROM public.ambassadors
    WHERE id = p_ambassador_id OR user_id = p_ambassador_id
    FOR UPDATE;

    IF v_target_id IS NULL THEN
        SELECT id, coalesce(avu_balance, 0)
        INTO v_target_id, v_current_bal
        FROM public.ambassadors
        WHERE user_id = p_ambassador_id
        FOR UPDATE;
    END IF;

    IF v_target_id IS NULL THEN
        v_target_id := p_ambassador_id;
        v_current_bal := 0;
    END IF;

    v_new_bal := round((coalesce(v_current_bal, 0) + p_amount_avu)::numeric, 3);

    UPDATE public.ambassadors
    SET avu_balance = v_new_bal
    WHERE id = v_target_id OR user_id = v_target_id;

    BEGIN
        INSERT INTO public.ambassador_wallet (ambassador_id, balance, updated_at)
        VALUES (v_target_id, v_new_bal, timezone('utc'::text, now()))
        ON CONFLICT (ambassador_id) DO UPDATE
        SET balance = v_new_bal,
            updated_at = timezone('utc'::text, now());
    EXCEPTION WHEN OTHERS THEN
        UPDATE public.ambassador_wallet
        SET balance = v_new_bal
        WHERE ambassador_id = v_target_id;
    END;

    INSERT INTO public.wallet_deposits (
        ambassador_id,
        amount_avu,
        naira_paid,
        payment_reference,
        provider,
        status,
        metadata
    ) VALUES (
        v_target_id,
        p_amount_avu,
        coalesce(p_naira_paid, 0),
        v_clean_ref,
        coalesce(p_provider, 'paystack'),
        'completed',
        jsonb_build_object(
            'credited_at', timezone('utc'::text, now()),
            'previous_balance', v_current_bal,
            'new_balance', v_new_bal,
            'source', 'credit_ambassador_wallet_safe'
        )
    );

    BEGIN
        UPDATE public.deposits
        SET status = 'success',
            avu_earned = p_amount_avu
        WHERE paystack_reference = v_clean_ref;
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', v_new_bal,
        'message', 'Ambassador wallet credited successfully',
        'already_processed', false,
        'reference', v_clean_ref,
        'ambassador_id', v_target_id
    );
EXCEPTION WHEN unique_violation THEN
    SELECT coalesce(avu_balance, 0) INTO v_current_bal
    FROM public.ambassadors
    WHERE id = v_target_id OR user_id = v_target_id
    LIMIT 1;

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', coalesce(v_current_bal, 0),
        'message', 'Transaction was concurrently processed by webhook or client (idempotent)',
        'already_processed', true,
        'reference', v_clean_ref
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.credit_ambassador_wallet_safe(
    p_ambassador_id TEXT,
    p_amount_avu NUMERIC,
    p_naira_paid NUMERIC,
    p_reference TEXT,
    p_provider TEXT DEFAULT 'paystack'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parsed_uuid UUID;
    v_found_id UUID;
BEGIN
    IF p_ambassador_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_parsed_uuid := p_ambassador_id::UUID;
    ELSE
        SELECT id INTO v_found_id
        FROM public.ambassadors
        WHERE lower(email) = lower(trim(p_ambassador_id))
        LIMIT 1;

        IF v_found_id IS NOT NULL THEN
            v_parsed_uuid := v_found_id;
        ELSE
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Ambassador identifier could not be resolved to a valid record: ' || coalesce(p_ambassador_id, 'NULL'),
                'already_processed', false,
                'new_balance', 0
            );
        END IF;
    END IF;

    RETURN public.credit_ambassador_wallet_safe(
        v_parsed_uuid,
        p_amount_avu,
        p_naira_paid,
        p_reference,
        p_provider
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.credit_ambassador_wallet_safe(UUID, NUMERIC, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.credit_ambassador_wallet_safe(TEXT, NUMERIC, NUMERIC, TEXT, TEXT) TO anon, authenticated, service_role;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ambassadors;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_deposits;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
END $$;
