-- =========================================================================
-- STEP 3: GRIXCHAT SUPPORT AND BACKSIDE CONTACT TICKETS
-- =========================================================================
-- Instructions:
-- 1. Execute this file in your Supabase SQL Editor AFTER running Step 2.
-- =========================================================================

-- Clear existing table
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- Create support tickets Table
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous and Authenticated submittals
CREATE POLICY "Allow anonymous and authenticated ticket insertion" 
    ON public.support_tickets 
    FOR INSERT 
    WITH CHECK (true);

-- 2. Fetch logged tickets
CREATE POLICY "Allow users to view own tickets" 
    ON public.support_tickets 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Performance Indexing
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
