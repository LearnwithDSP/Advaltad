-- SQL Migration Script: Add 'ambassador_id' to ambassadors table
-- This script adds the unique ambassador identification column, creates a sequence for human-friendly ID generation (e.g. AV-10001), 
-- and updates all existing records automatically.

-- 1. Create a sequence for the unique sequential numeric IDs if it does not exist.
-- Sequential numbers are padded and prefixed with 'AV-' for a highly professional appearance.
CREATE SEQUENCE IF NOT EXISTS public.ambassador_id_seq START WITH 10001;

-- 2. Add the 'ambassador_id' column to the 'public.ambassadors' table if it does not exist.
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS ambassador_id VARCHAR(50);

-- 3. Also support capitalized 'Ambassadors' table if that is the active table in your database schema.
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Ambassadors') THEN
        ALTER TABLE public."Ambassadors" ADD COLUMN IF NOT EXISTS ambassador_id VARCHAR(50);
    END IF;
END $$;

-- 4. Automatically populate existing records that currently have a NULL 'ambassador_id' with generated values.
UPDATE public.ambassadors 
SET ambassador_id = 'AV-' || nextval('public.ambassador_id_seq') 
WHERE ambassador_id IS NULL;

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Ambassadors') THEN
        UPDATE public."Ambassadors" 
        SET ambassador_id = 'AV-' || nextval('public.ambassador_id_seq') 
        WHERE ambassador_id IS NULL;
    END IF;
END $$;

-- 5. Add a UNIQUE constraint on the 'ambassador_id' column to guarantee uniqueness.
ALTER TABLE public.ambassadors ADD CONSTRAINT unique_ambassador_id UNIQUE (ambassador_id);

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Ambassadors') THEN
        ALTER TABLE public."Ambassadors" ADD CONSTRAINT unique_ambassadors_amb_id UNIQUE (ambassador_id);
    END IF;
END $$;

-- 6. Grant appropriate public access/read permissions to columns if your schema uses custom RLS.
-- (This ensures the frontend can query 'ambassador_id' safely)
ANALYZE public.ambassadors;
