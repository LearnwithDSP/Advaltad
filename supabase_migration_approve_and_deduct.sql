-- ============================================================================
-- SQL Migration Script: Authoritative AVU Withdrawal Approval & Deduction RPC
-- ============================================================================
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Paste this entire script and click "Run".
-- ============================================================================

-- Step 1: Ensure public.avu_withdrawals has all columns used across queries & triggers
ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS avu_amount NUMERIC;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS requested_avu NUMERIC;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS amount NUMERIC;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS conversion_rate NUMERIC DEFAULT 1000;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS admin_note TEXT;

ALTER TABLE public.avu_withdrawals 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- Sync avu_amount and requested_avu where one is null
UPDATE public.avu_withdrawals 
SET avu_amount = COALESCE(avu_amount, requested_avu, amount, 0)
WHERE avu_amount IS NULL;

UPDATE public.avu_withdrawals 
SET requested_avu = COALESCE(requested_avu, avu_amount, amount, 0)
WHERE requested_avu IS NULL;

-- Step 2: Ensure avu_transactions ledger exists
CREATE TABLE IF NOT EXISTS public.avu_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID NOT NULL,
    amount NUMERIC(15, 3) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'WITHDRAWAL_DEBIT',
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED',
    payment_reference VARCHAR(255) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_avu_transactions_ambassador ON public.avu_transactions(ambassador_id);
CREATE INDEX IF NOT EXISTS idx_avu_transactions_reference ON public.avu_transactions(payment_reference);

-- Step 3: Remove faulty triggers on public.avu_withdrawals that break on missing columns
DROP TRIGGER IF EXISTS trg_sync_avu_withdrawal_amounts ON public.avu_withdrawals;
DROP FUNCTION IF EXISTS public.sync_avu_withdrawal_amounts();

-- Step 4: Single Authoritative PostgreSQL RPC Function
-- Handles row locking, admin check, balance verification, atomic debit, ledger, and status transition
CREATE OR REPLACE FUNCTION public.approve_and_deduct_avu_withdrawal(
    p_withdrawal_id UUID,
    p_admin_email TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_email TEXT;
    v_admin_record RECORD;
    v_withdrawal RECORD;
    v_ambassador RECORD;
    v_amount NUMERIC(15, 3);
    v_current_bal NUMERIC(15, 3);
    v_new_bal NUMERIC(15, 3);
    v_ledger_ref TEXT;
BEGIN
    -- 1. Normalize and resolve admin identity
    v_admin_email := TRIM(LOWER(COALESCE(
        p_admin_email,
        auth.jwt()->>'email',
        ''
    )));

    IF v_admin_email = '' THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Administrator email is required for approval authorization.'
            USING ERRCODE = 'P0001';
    END IF;

    -- Verify authorized administrator in public.admins
    SELECT * INTO v_admin_record
    FROM public.admins
    WHERE LOWER(TRIM(email)) = v_admin_email
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'UNAUTHORIZED: "%" is not an authorized administrator in the system.', v_admin_email
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Lock and retrieve the withdrawal row (FOR UPDATE)
    SELECT * INTO v_withdrawal
    FROM public.avu_withdrawals
    WHERE id = p_withdrawal_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Withdrawal request with ID "%" does not exist.', p_withdrawal_id
            USING ERRCODE = 'P0002';
    END IF;

    -- Idempotency and status transition guards
    IF LOWER(v_withdrawal.status) = 'approved' THEN
        RAISE EXCEPTION 'ALREADY_APPROVED: Withdrawal request "%" has already been approved.', p_withdrawal_id
            USING ERRCODE = 'P0003';
    END IF;

    IF LOWER(v_withdrawal.status) IN ('disapproved', 'rejected', 'cancelled') THEN
        RAISE EXCEPTION 'INVALID_STATUS: Cannot approve withdrawal "%" with status "%".', p_withdrawal_id, v_withdrawal.status
            USING ERRCODE = 'P0004';
    END IF;

    -- Determine requested amount
    v_amount := COALESCE(v_withdrawal.requested_avu, v_withdrawal.avu_amount, v_withdrawal.amount, 0);
    IF v_amount <= 0 THEN
        RAISE EXCEPTION 'INVALID_AMOUNT: Withdrawal request amount must be greater than zero.'
            USING ERRCODE = 'P0005';
    END IF;

    -- 3. Resolve the authentic ambassador record using schema relationships
    -- Try direct foreign key first
    SELECT * INTO v_ambassador
    FROM public.ambassadors
    WHERE id = v_withdrawal.ambassador_id
    FOR UPDATE;

    -- If not found or email/name mismatched with record, try matching by email
    IF NOT FOUND OR (v_withdrawal.email IS NOT NULL AND LOWER(TRIM(v_ambassador.email)) <> LOWER(TRIM(v_withdrawal.email))) THEN
        IF v_withdrawal.email IS NOT NULL AND LENGTH(TRIM(v_withdrawal.email)) > 0 THEN
            SELECT * INTO v_ambassador
            FROM public.ambassadors
            WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_withdrawal.email))
            FOR UPDATE;
        END IF;
    END IF;

    -- If still not found, try matching by user_id
    IF NOT FOUND AND v_withdrawal.ambassador_id IS NOT NULL THEN
        SELECT * INTO v_ambassador
        FROM public.ambassadors
        WHERE user_id = v_withdrawal.ambassador_id
        FOR UPDATE;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'AMBASSADOR_NOT_FOUND: Could not resolve authentic ambassador account for withdrawal "%".', p_withdrawal_id
            USING ERRCODE = 'P0006';
    END IF;

    -- 4. Verify available AVU balance
    v_current_bal := COALESCE(v_ambassador.avu_balance, 0);

    IF v_current_bal < v_amount THEN
        RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Ambassador "%" has % AVU available, but requested % AVU.',
            v_ambassador.professional_name, v_current_bal, v_amount
            USING ERRCODE = 'P0007';
    END IF;

    -- 5. Calculate new balance
    v_new_bal := ROUND((v_current_bal - v_amount)::NUMERIC, 3);
    IF v_new_bal < 0 THEN
        v_new_bal := 0;
    END IF;

    -- 6. Atomically update ambassador wallet balance
    UPDATE public.ambassadors
    SET 
        avu_balance = v_new_bal,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_ambassador.id;

    -- Also synchronize secondary wallet tables if present
    BEGIN
        UPDATE public.ambassador_wallet
        SET 
            balance = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE ambassador_id = v_ambassador.id OR ambassador_id = v_ambassador.user_id;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    BEGIN
        UPDATE public.ambassador_wallets
        SET 
            avu_balance = v_new_bal,
            updated_at = timezone('utc'::text, now())
        WHERE ambassador_id = v_ambassador.id OR ambassador_id = v_ambassador.user_id;
    EXCEPTION WHEN undefined_table THEN NULL;
    END;

    -- 7. Record immutable ledger transaction
    v_ledger_ref := 'WITHDRAW-' || p_withdrawal_id;

    INSERT INTO public.avu_transactions (
        ambassador_id,
        amount,
        type,
        status,
        payment_reference,
        metadata,
        created_at
    )
    VALUES (
        COALESCE(v_ambassador.user_id, v_ambassador.id),
        -v_amount,
        'WITHDRAWAL_DEBIT',
        'COMPLETED',
        v_ledger_ref,
        jsonb_build_object(
            'withdrawal_id', p_withdrawal_id,
            'approved_by', v_admin_email,
            'previous_balance', v_current_bal,
            'new_balance', v_new_bal,
            'bank_name', v_withdrawal.bank_name,
            'account_number', v_withdrawal.account_number,
            'account_name', v_withdrawal.account_name
        ),
        timezone('utc'::text, now())
    )
    ON CONFLICT (payment_reference) DO NOTHING;

    -- 8. Update withdrawal status to 'Approved'
    UPDATE public.avu_withdrawals
    SET 
        status = 'Approved',
        ambassador_id = v_ambassador.id,
        reviewed_by = v_admin_email,
        reviewed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_withdrawal_id;

    -- 9. Return structured success confirmation
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Withdrawal approved successfully.',
        'status', 'Approved',
        'withdrawal_id', p_withdrawal_id,
        'ambassador_id', v_ambassador.id,
        'ambassador_name', v_ambassador.professional_name,
        'deducted_amount', v_amount,
        'previous_balance', v_current_bal,
        'new_balance', v_new_bal,
        'approved_by', v_admin_email,
        'approved_at', timezone('utc'::text, now())
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.approve_and_deduct_avu_withdrawal(UUID, TEXT) TO authenticated, service_role;
