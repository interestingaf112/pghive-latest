-- PG WALA Row-Level Security Policies for Listing Contacts
-- This migration script separates contact details from public listings
-- and enforces database-level permission locks.

-- 1. Create Private Contacts Table
CREATE TABLE IF NOT EXISTS public.pg_contacts (
    pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    email TEXT,
    whatsapp TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (pg_id)
);

-- Enable Row-Level Security
ALTER TABLE public.pg_contacts ENABLE ROW LEVEL SECURITY;

-- 2. Create Unlocks Transaction Registry Table
CREATE TABLE IF NOT EXISTS public.user_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    pg_id UUID REFERENCES public.pgs(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, pg_id)
);

-- Enable RLS on Unlocks registry
ALTER TABLE public.user_unlocks ENABLE ROW LEVEL SECURITY;

-- 3. RLS Rules for public.pg_contacts
-- Allow authenticated owners to read their own contacts
CREATE POLICY select_owner_contacts ON public.pg_contacts
    FOR SELECT
    TO authenticated
    USING (
        auth.uid() = (SELECT owner_id FROM public.pgs WHERE id = pg_contacts.pg_id)
    );

-- Allow users who unlocked the contact to select details
CREATE POLICY select_unlocked_contacts ON public.pg_contacts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_unlocks 
            WHERE user_unlocks.user_id = auth.uid() 
              AND user_unlocks.pg_id = pg_contacts.pg_id
        )
    );

-- Allow admin role to bypass RLS and read all contacts
CREATE POLICY select_admin_contacts ON public.pg_contacts
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.is_admin = true
        )
    );

-- Enforce write rules: only owners/admin can write contacts
CREATE POLICY insert_owner_contacts ON public.pg_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = (SELECT owner_id FROM public.pgs WHERE id = pg_contacts.pg_id)
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.is_admin = true
        )
    );

CREATE POLICY delete_owner_contacts ON public.pg_contacts
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = (SELECT owner_id FROM public.pgs WHERE id = pg_contacts.pg_id)
        OR EXISTS (
            SELECT 1 FROM public.users 
            WHERE users.id = auth.uid() 
              AND users.is_admin = true
        )
    );

-- =============================================
-- SECURITY FIX #10: Complete missing RLS policies
-- =============================================

-- 4. RLS Rules for public.pgs (PG listings table)
ALTER TABLE public.pgs ENABLE ROW LEVEL SECURITY;

-- Public read access for all PG listings
CREATE POLICY select_all_pgs ON public.pgs
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Owners can insert their own PG listings
CREATE POLICY insert_owner_pgs ON public.pgs
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    );

-- Owners can update their own PG listings; admins can update any
CREATE POLICY update_owner_pgs ON public.pgs
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    )
    WITH CHECK (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    );

-- Owners and admins can delete PG listings
CREATE POLICY delete_owner_pgs ON public.pgs
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() = owner_id
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    );

-- 5. RLS Rules for public.user_unlocks
-- Users can only see their own unlock records
CREATE POLICY select_own_unlocks ON public.user_unlocks
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can only insert unlock records for themselves
CREATE POLICY insert_own_unlocks ON public.user_unlocks
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Admin can view all unlock records
CREATE POLICY select_admin_unlocks ON public.user_unlocks
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    );

-- 6. Missing UPDATE policy for pg_contacts
CREATE POLICY update_owner_contacts ON public.pg_contacts
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = (SELECT owner_id FROM public.pgs WHERE id = pg_contacts.pg_id)
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    )
    WITH CHECK (
        auth.uid() = (SELECT owner_id FROM public.pgs WHERE id = pg_contacts.pg_id)
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
              AND users.is_admin = true
        )
    );

