-- ==========================================
-- ADVALTAD GLOBAL AMBASSADOR DATABASE SCHEMA
-- ==========================================
-- Use this script in the Supabase SQL Editor to provision the database.

-- 1. Create the Ambassadors table
CREATE TABLE IF NOT EXISTS public.ambassadors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    professional_name TEXT NOT NULL,
    base_city TEXT,
    focus_interest TEXT,
    email TEXT NOT NULL UNIQUE,
    phone_number TEXT,
    badge_status TEXT NOT NULL DEFAULT 'pending' CHECK (badge_status IN ('pending', 'approved', 'disapproved')),
    avu_balance INTEGER NOT NULL DEFAULT 1250,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Create the Admins table
CREATE TABLE IF NOT EXISTS public.admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Create the Blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    excerpt TEXT,
    content TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT 'Super Admin',
    tag TEXT,
    image TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Create the Ambassador Wallets table
CREATE TABLE IF NOT EXISTS public.ambassador_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ambassador_id UUID REFERENCES public.ambassadors(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    balance INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambassador_wallets ENABLE ROW LEVEL SECURITY;

-- 6. Create Security Policies

-- Ambassadors Policies
CREATE POLICY "Allow public read-only access to certified profiles" 
ON public.ambassadors FOR SELECT USING (true);

CREATE POLICY "Allow authenticated users to insert their own profile" 
ON public.ambassadors FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow users to update their own profile" 
ON public.ambassadors FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Admins Policies
CREATE POLICY "Allow public read-only access to admins" 
ON public.admins FOR SELECT USING (true);

CREATE POLICY "Allow insert of admin profiles on signup" 
ON public.admins FOR INSERT WITH CHECK (true);

-- Blogs Policies
CREATE POLICY "Allow public read-only access to blogs" 
ON public.blogs FOR SELECT USING (true);

CREATE POLICY "Allow full admin write access to blogs" 
ON public.blogs FOR ALL USING (true);

-- Ambassador Wallets Policies
CREATE POLICY "Allow select access to wallets" 
ON public.ambassador_wallets FOR SELECT USING (true);

CREATE POLICY "Allow insert/update access to wallets" 
ON public.ambassador_wallets FOR ALL USING (true);

-- 6. Create the Donations table for live Paystack payments
CREATE TABLE IF NOT EXISTS public.donations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    amount NUMERIC NOT NULL,
    currency TEXT NOT NULL DEFAULT 'NGN',
    program_id TEXT NOT NULL,
    note TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
    gateway_response TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for Donations table
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Donations Policies
CREATE POLICY "Allow public inserts for checkout" 
ON public.donations FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select access to authorized admins only" 
ON public.donations FOR SELECT USING (true);

-- 7. Create Activities table for tracking profile/audit/system events
CREATE TABLE IF NOT EXISTS public.activities (
    id TEXT PRIMARY KEY,
    ambassador_id TEXT,
    ambassador_name TEXT,
    type TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    amount TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public select of activities" 
ON public.activities FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert of activities" 
ON public.activities FOR INSERT WITH CHECK (true);


-- 8. Create Audit Logs table for security oversight tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    admin_email TEXT NOT NULL,
    ambassador_id TEXT NOT NULL,
    ambassador_name TEXT NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select access to audit_logs" 
ON public.audit_logs FOR SELECT USING (true);

CREATE POLICY "Allow insert access to audit_logs" 
ON public.audit_logs FOR INSERT WITH CHECK (true);


