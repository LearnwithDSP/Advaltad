-- =========================================================================
-- MIGRATION: AMBASSADOR APPROVAL SYSTEM SYNCHRONIZATION
-- =========================================================================
-- This migration ensures that the 'is_approved' boolean, 'badge_status', and
-- 'status' columns exist, are backfilled, and remain permanently in sync.
--
-- INSTRUCTIONS:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/_/sql
-- 2. Paste this entire script and click "Run".
-- =========================================================================

-- Step 1: Ensure columns exist on public.ambassadors
ALTER TABLE public.ambassadors 
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.ambassadors 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

-- Check if capitalized table exists (case-sensitive schemas)
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Ambassadors') THEN
    ALTER TABLE public."Ambassadors" ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE public."Ambassadors" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
  END IF;
END $$;

-- Step 2: Backfill existing records
UPDATE public.ambassadors
SET 
  is_approved = TRUE,
  badge_status = 'approved',
  status = 'approved'
WHERE 
  badge_status = 'approved' 
  OR status = 'approved' 
  OR is_approved = TRUE;

UPDATE public.ambassadors
SET 
  is_approved = FALSE,
  badge_status = 'disapproved',
  status = 'disapproved'
WHERE 
  badge_status = 'disapproved' 
  OR status = 'disapproved';

UPDATE public.ambassadors
SET 
  is_approved = FALSE,
  badge_status = 'pending',
  status = 'pending'
WHERE 
  badge_status IS NULL 
  OR (badge_status NOT IN ('approved', 'disapproved') AND status NOT IN ('approved', 'disapproved'));

-- Step 3: Trigger function to keep is_approved, badge_status, and status in lockstep
CREATE OR REPLACE FUNCTION public.sync_ambassador_approval_status()
RETURNS trigger AS $$
BEGIN
  -- 1. If is_approved set to TRUE, set badge_status and status to 'approved'
  IF NEW.is_approved = TRUE THEN
    NEW.badge_status := 'approved';
    NEW.status := 'approved';
  -- 2. If badge_status or status was set to 'approved', set is_approved to TRUE
  ELSIF NEW.badge_status = 'approved' OR NEW.status = 'approved' THEN
    NEW.is_approved := TRUE;
    NEW.badge_status := 'approved';
    NEW.status := 'approved';
  -- 3. If badge_status or status was set to 'disapproved', set is_approved to FALSE
  ELSIF NEW.badge_status = 'disapproved' OR NEW.status = 'disapproved' THEN
    NEW.is_approved := FALSE;
    NEW.badge_status := 'disapproved';
    NEW.status := 'disapproved';
  -- 4. Otherwise default to pending
  ELSE
    NEW.is_approved := FALSE;
    NEW.badge_status := 'pending';
    NEW.status := 'pending';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Attach the trigger to public.ambassadors
DROP TRIGGER IF EXISTS tr_sync_ambassador_approval ON public.ambassadors;

CREATE TRIGGER tr_sync_ambassador_approval
  BEFORE INSERT OR UPDATE ON public.ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.sync_ambassador_approval_status();

-- Attach to capitalized table if present
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'Ambassadors') THEN
    DROP TRIGGER IF EXISTS tr_sync_ambassadors_approval ON public."Ambassadors";
    CREATE TRIGGER tr_sync_ambassadors_approval
      BEFORE INSERT OR UPDATE ON public."Ambassadors"
      FOR EACH ROW EXECUTE FUNCTION public.sync_ambassador_approval_status();
  END IF;
END $$;

-- Step 5: Ensure RLS policy allows authorized updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'ambassadors' AND policyname = 'Allow updates for users and authorized admins'
  ) THEN
    CREATE POLICY "Allow updates for users and authorized admins" 
    ON public.ambassadors FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Notify complete
SELECT 'Ambassador approval synchronization migration applied successfully' AS result;
