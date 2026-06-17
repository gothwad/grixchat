-- =========================================================================
-- STEP 1: GRIXCHAT CORE SCHEMA SETUP (DATABASE BLUEPRINT)
-- =========================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard.
-- 2. Navigate to "SQL Editor" on the left sidebar.
-- 3. Create a "New Query".
-- 4. Paste ALL contents of this script and click "RUN".
-- =========================================================================

-- 1. CLEANUP PRE-EXISTING TABLES AND TRIGGERS (Ensures Fresh Start)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.get_direct_conversation_id(UUID, UUID) CASCADE;

DROP TABLE IF EXISTS public.chat_settings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.call_candidates CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.stories CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- 2. CREATE DATABASE TABLES

-- User Profiles (Integrated with auth.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    username TEXT UNIQUE NOT NULL,
    photo_url TEXT DEFAULT 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
    bio TEXT DEFAULT 'Available',
    is_verified BOOLEAN DEFAULT FALSE,
    profile_type TEXT DEFAULT 'personal',
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb,
    lock JSONB DEFAULT NULL, -- Passcode lock hash & configuration
    blocked_users TEXT[] DEFAULT '{}'::text[],
    muted_users TEXT[] DEFAULT '{}'::text[],
    favorites TEXT[] DEFAULT '{}'::text[],
    hidden_chats TEXT[] DEFAULT '{}'::text[],
    archived_chats TEXT[] DEFAULT '{}'::text[],
    hidden_chat_settings JSONB DEFAULT '{"secretCode": null, "showMenuEntry": true}'::jsonb,
    fcm_tokens TEXT[] DEFAULT '{}'::text[],
    CONSTRAINT username_length_check CHECK (char_length(username) <= 15)
);

-- Connections / Followers / Friends
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    following_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT follows_unique_pair UNIQUE (follower_id, following_id)
);

-- Conversation Rooms (Direct & Group chats)
CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
    name TEXT,
    photo_url TEXT,
    admins UUID[] DEFAULT '{}'::uuid[],
    watch_video_url TEXT,
    watch_state JSONB DEFAULT '{}'::jsonb,
    last_message TEXT,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Roster / Members
CREATE TABLE public.conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT conversation_participants_unique_pair UNIQUE (conversation_id, user_id)
);

-- Chat Messages
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    text TEXT,
    media_url TEXT,
    media_type TEXT,
    reply_to UUID REFERENCES public.messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    is_edited BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_by UUID[] DEFAULT '{}'::UUID[], -- Tracks delete for me IDs
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stories & Status Updates 
CREATE TABLE public.stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    media_url TEXT,
    type TEXT DEFAULT 'image', -- 'image', 'text', 'video'
    text_content TEXT,
    bg_color TEXT,
    music_title TEXT,
    music_artist TEXT,
    music_url TEXT,
    filter_applied TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Voice / Video Calls 
CREATE TABLE public.calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    type TEXT CHECK (type IN ('audio', 'video')) NOT NULL,
    status TEXT DEFAULT 'ringing' CHECK (status IN ('ringing', 'accepted', 'rejected', 'ended', 'error')),
    offer JSONB,
    answer JSONB,
    is_missed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WebRTC ICE Candidates Signaling
CREATE TABLE public.call_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES public.calls(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    candidate JSONB NOT NULL,
    type TEXT NOT NULL, -- 'offer' or 'answer' candidate
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personalized Chat Settings & Customizations
CREATE TABLE public.chat_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    nickname TEXT,
    custom_photo_url TEXT,
    is_muted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT chat_settings_unique_pair UNIQUE (user_id, receiver_id)
);

-- System & Interaction Notifications
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
    from_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT,
    content TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    post_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS) FOR CORE PRIVACY
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. CREATE RLS SECURE POLICIES

-- profiles
CREATE POLICY "Allow public read access on profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Allow users to update own profile" ON public.users FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow users to insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- connections
CREATE POLICY "Allow users to view all follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Allow users to follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Allow users to unfollow others" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- conversations
CREATE POLICY "Allow auth users to make conversations" ON public.conversations FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow members to see conversations" ON public.conversations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = conversations.id 
          AND conversation_participants.user_id = auth.uid()
    )
);
CREATE POLICY "Allow participants to edit conversations" ON public.conversations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = conversations.id 
          AND conversation_participants.user_id = auth.uid()
    )
);
CREATE POLICY "Allow participants to delete conversations" ON public.conversations FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = conversations.id 
          AND conversation_participants.user_id = auth.uid()
    )
);

-- members
CREATE POLICY "Allow auth users to inspect participants" ON public.conversation_participants FOR SELECT USING (true);
CREATE POLICY "Allow members to join rooms" ON public.conversation_participants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow participants to leave rooms" ON public.conversation_participants FOR DELETE USING (auth.role() = 'authenticated');

-- messages
CREATE POLICY "Allow conversation members to view messages" ON public.messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = messages.conversation_id 
          AND conversation_participants.user_id = auth.uid()
    )
);
CREATE POLICY "Allow active members to insert messages" ON public.messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id 
    AND EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = messages.conversation_id 
          AND conversation_participants.user_id = auth.uid()
    )
);
CREATE POLICY "Allow participants to update messages" ON public.messages FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = messages.conversation_id 
          AND conversation_participants.user_id = auth.uid()
    )
);
CREATE POLICY "Allow participants to delete messages" ON public.messages FOR DELETE USING (
    EXISTS (
        SELECT 1 FROM public.conversation_participants 
        WHERE conversation_participants.conversation_id = messages.conversation_id 
          AND conversation_participants.user_id = auth.uid()
    )
);

-- stories
CREATE POLICY "Allow auth users to view stories" ON public.stories FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow owners to publish stories" ON public.stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Allow owners to delete stories" ON public.stories FOR DELETE USING (auth.uid() = user_id);

-- calling
CREATE POLICY "Allow view access to call records" ON public.calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Allow calls insertion to caller" ON public.calls FOR INSERT WITH CHECK (auth.uid() = caller_id);
CREATE POLICY "Allow call updates on participants" ON public.calls FOR UPDATE USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- signaling Candidates
CREATE POLICY "Allow select on candidates to call members" ON public.call_candidates FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.calls 
        WHERE calls.id = call_candidates.call_id 
          AND (calls.caller_id = auth.uid() OR calls.receiver_id = auth.uid())
    )
);
CREATE POLICY "Allow call participants to insert candidates" ON public.call_candidates FOR INSERT WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
        SELECT 1 FROM public.calls 
        WHERE calls.id = call_candidates.call_id 
          AND (calls.caller_id = auth.uid() OR calls.receiver_id = auth.uid())
    )
);

-- custom chat settings
CREATE POLICY "Allow users to read own chat settings" ON public.chat_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow users to modify own chat settings" ON public.chat_settings FOR ALL USING (auth.uid() = user_id);

-- user notifications
CREATE POLICY "Allow users to read own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Allow auth users system to insert notifications" ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow users to update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Allow users to delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- 5. PERFORMANCE AND SEARCH INDEXES
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_participants_user ON public.conversation_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_users_username_lowered ON public.users(LOWER(username));
CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_stories_user ON public.stories(user_id);
CREATE INDEX IF NOT EXISTS idx_calls_participants ON public.calls(caller_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_chat_settings_user ON public.chat_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);

-- Notification sound configuration
NOTIFY pgrst, 'reload schema';
