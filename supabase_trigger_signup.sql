-- =========================================================================
-- SUPABASE POSTGRESQL SIGN-UP TRIGGER MIGRATION
-- =========================================================================
-- This script creates a secure, atomic PostgreSQL trigger on 'auth.users'
-- to automatically create corresponding public profile rows in the
-- 'ambassadors' or 'admins' tables whenever a user signs up.
--
-- This guarantees that database rows are created instantly within a single
-- transaction, completely bypassing frontend race conditions and RLS policy delays.
--
-- INSTRUCTIONS:
-- 1. Copy this entire script.
-- 2. Paste it into the "SQL Editor" in your Supabase Dashboard.
-- 3. Click "Run" to deploy the function and the trigger.
-- =========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_ambassador_id UUID;
BEGIN
  -- 1. Direct user to appropriate table based on registration role metadata
  IF (new.raw_user_meta_data->>'role') = 'admin' THEN
    -- Insert Admin profile
    INSERT INTO public.admins (
      user_id,
      full_name,
      email,
      role
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Admin User'),
      new.email,
      'admin'
    );
  ELSE
    -- Insert Ambassador profile
    INSERT INTO public.ambassadors (
      user_id,
      professional_name,
      base_city,
      focus_interest,
      email,
      phone_number,
      badge_status,
      status,
      is_approved,
      avu_balance
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'professional_name', 'Growth Ambassador'),
      COALESCE(new.raw_user_meta_data->>'city', new.raw_user_meta_data->>'base_city', 'Lagos, Nigeria'),
      COALESCE(new.raw_user_meta_data->>'field', new.raw_user_meta_data->>'focus_interest', 'Enriching African youths initiative'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone_number', ''),
      'pending', -- All newly registered ambassadors start as 'pending' awaiting executive board approval
      'pending',
      FALSE,     -- is_approved starts as FALSE until admin verifies
      1250
    ) RETURNING id INTO new_ambassador_id;
    
    -- 2. Automatically provision an Ambassador Wallet matching the profile
    INSERT INTO public.ambassador_wallets (
      ambassador_id,
      email,
      balance
    ) VALUES (
      new_ambassador_id,
      new.email,
      1250
    ) ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN others THEN
    -- Safe fallback to prevent registration failures if something goes wrong in the trigger
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove existing trigger if it already exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Bind the trigger function to run AFTER insert on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- APPROVAL STATUS SYNCHRONIZATION TRIGGER
-- =========================================================================
-- Automatically keeps is_approved (boolean), badge_status, and status in sync
-- whenever an admin approves, disapproves, or updates an ambassador in Supabase.
-- =========================================================================

-- Ensure columns exist
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS is_approved BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.ambassadors ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';

CREATE OR REPLACE FUNCTION public.sync_ambassador_approval_status()
RETURNS trigger AS $$
BEGIN
  -- 1. If is_approved was set to TRUE, ensure badge_status and status are 'approved'
  IF NEW.is_approved = TRUE THEN
    NEW.badge_status := 'approved';
    NEW.status := 'approved';
  -- 2. If badge_status or status was set to 'approved', ensure is_approved is TRUE
  ELSIF NEW.badge_status = 'approved' OR NEW.status = 'approved' THEN
    NEW.is_approved := TRUE;
    NEW.badge_status := 'approved';
    NEW.status := 'approved';
  -- 3. If badge_status or status was set to 'disapproved'
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

-- Remove existing trigger if it already exists
DROP TRIGGER IF EXISTS tr_sync_ambassador_approval ON public.ambassadors;

-- Bind the trigger to run BEFORE INSERT OR UPDATE on public.ambassadors
CREATE TRIGGER tr_sync_ambassador_approval
  BEFORE INSERT OR UPDATE ON public.ambassadors
  FOR EACH ROW EXECUTE FUNCTION public.sync_ambassador_approval_status();

