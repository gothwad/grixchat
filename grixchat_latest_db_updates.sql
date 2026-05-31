-- ==========================================
-- GRIXCHAT DATABASE OVERHAUL & BUGFIX MIGRATION 
-- ==========================================
-- Target: Supabase Consolidated Schema Updates
-- Run this block inside your Supabase dashboard SQL Editor!

-- 1. FIX APP LOCK - SCHEMA CACHE COLUMN MISSING (PGRST204)
-- This command safely appends the 'lock' JSONB column to track passcode hashes
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS lock JSONB DEFAULT NULL;

-- 2. RE-ENABLE ROW LEVEL SECURITY POLICIES (RLS) FOR USER PROFILE UPDATES
-- Ensures users have absolute authorization to write/update their own lock preferences
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on profiles" 
ON public.users FOR SELECT USING (true);

-- Policy to permit setting up and verifying lock codes securely 
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.users;
CREATE POLICY "Allow users to update own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = id) 
WITH CHECK (auth.uid() = id);

-- 3. ENSURE REALTIME REPLICAS CAN SYNC CHANGES INSTANTLY
-- This enables native websocket replication for messages & locking state
ALTER TABLE public.users REPLICA IDENTITY FULL;

-- 4. AUTOMATICALLY TRUNCATE EXISTING USERNAMES TO 15 CHARACTERS MAXIMUM
-- Uses a bulletproof PL/pgSQL block to loop through every long username and resolve uniqueness conflicts iteratively
DO $$
DECLARE
    r RECORD;
    new_username TEXT;
    suffix INT;
BEGIN
    FOR r IN (SELECT id, username FROM public.users WHERE char_length(username) > 15 ORDER BY id) LOOP
        new_username := SUBSTRING(r.username, 1, 15);
        suffix := 1;
        
        -- If this truncated username already exists for another user, add numerical suffix
        WHILE EXISTS (SELECT 1 FROM public.users WHERE username = new_username AND id != r.id) LOOP
            new_username := SUBSTRING(SUBSTRING(r.username, 1, 15), 1, 15 - length(suffix::text) - 1) || '_' || suffix;
            suffix := suffix + 1;
        END LOOP;
        
        -- Update the user row with the guaranteed unique <= 15-char username
        UPDATE public.users SET username = new_username WHERE id = r.id;
    END LOOP;
END $$;

-- 5. ENFORCE 15-CHARACTER MAXIMUM LIMIT VIA DATABASE CHECK CONSTRAINT
-- Ensures that the database will strictly reject any future username exceeding 15 characters
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS username_length_check;
ALTER TABLE public.users ADD CONSTRAINT username_length_check CHECK (char_length(username) <= 15);

-- 6. REAL-TIME BULK MESSAGE-PRUNING TO REDUCE SUPABASE PLAN STORAGE FOOTPRINT
-- Keep database size small and cost-effective.
-- Cap absolute messages inside any single conversation to the last 60.
-- On reaching >= 60, all excess messages are purged in bulk leaving only the 40 newest ones.
-- This instantly trims legacy chats with 1,000+ messages down to exactly 40 on the next message!
-- Local device cache maintains scrollbacks seamlessly!
CREATE OR REPLACE FUNCTION prune_past_messages()
RETURNS TRIGGER AS $$
DECLARE
    msg_count INT;
BEGIN
    SELECT COUNT(*) INTO msg_count 
    FROM public.messages 
    WHERE conversation_id = NEW.conversation_id;

    IF msg_count >= 60 THEN
        DELETE FROM public.messages
        WHERE conversation_id = NEW.conversation_id
          AND id NOT IN (
              SELECT subquery.id FROM (
                  SELECT id FROM public.messages
                  WHERE conversation_id = NEW.conversation_id
                  ORDER BY created_at DESC, id DESC
                  LIMIT 40
              ) subquery
          );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prune_past_messages ON public.messages;
CREATE TRIGGER trg_prune_past_messages
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION prune_past_messages();

-- Clear any potential stale schema caches
NOTIFY pgrst, 'reload schema';
