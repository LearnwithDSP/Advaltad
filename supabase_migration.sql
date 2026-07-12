-- SQL Migration Script
-- 1. Ensure 'avu_balance' in the 'ambassadors' table defaults to 0 and is of type NUMERIC
ALTER TABLE public.ambassadors 
  ALTER COLUMN avu_balance TYPE NUMERIC,
  ALTER COLUMN avu_balance SET DEFAULT 0;

-- Optional: Update any existing NULL or legacy 1250 values to 0 if needed (safe operation)
-- UPDATE public.ambassadors SET avu_balance = 0 WHERE avu_balance IS NULL;

-- 2. Ensure 'ambassador_wallet' exists with 'balance' defaulting to 0
CREATE TABLE IF NOT EXISTS public.ambassador_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID REFERENCES public.ambassadors(id) ON DELETE CASCADE,
    balance NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Enable RLS for 'ambassador_wallet'
ALTER TABLE public.ambassador_wallet ENABLE ROW LEVEL SECURITY;

-- Add policies for 'ambassador_wallet'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ambassador_wallet' AND policyname = 'Allow select access to single wallet'
    ) THEN
        CREATE POLICY "Allow select access to single wallet" 
        ON public.ambassador_wallet FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ambassador_wallet' AND policyname = 'Allow insert/update access to single wallet'
    ) THEN
        CREATE POLICY "Allow insert/update access to single wallet" 
        ON public.ambassador_wallet FOR ALL USING (true);
    END IF;
END
$$;
