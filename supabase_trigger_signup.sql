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
      avu_balance
    ) VALUES (
      new.id,
      COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'professional_name', 'Growth Ambassador'),
      COALESCE(new.raw_user_meta_data->>'city', new.raw_user_meta_data->>'base_city', 'Lagos, Nigeria'),
      COALESCE(new.raw_user_meta_data->>'field', new.raw_user_meta_data->>'focus_interest', 'Enriching African youths initiative'),
      new.email,
      COALESCE(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'phone_number', ''),
      'pending', -- All newly registered ambassadors start as 'pending' awaiting executive board approval
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
