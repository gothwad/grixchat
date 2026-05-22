
-- 1. Extend Users table (if not already done)
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE users ADD COLUMN IF NOT EXISTS following UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS followers UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_posts UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS saved_videos UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS blocked_users UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS hidden_chats UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_chats UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS favorites UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_users UUID[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS lock JSONB DEFAULT '{}'::jsonb;

-- 2. Create Follows Join Table (Better for scalability)
CREATE TABLE IF NOT EXISTS follows (
    follower_id UUID REFERENCES users(id) ON DELETE CASCADE,
    following_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (follower_id, following_id)
);

-- 3. Extend Conversations table
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'direct'; -- values: 'direct', 'group'
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id);

-- 4. RPC for efficient DM checking
CREATE OR REPLACE FUNCTION get_direct_conversation_id(u1 UUID, u2 UUID)
RETURNS UUID AS $$
    SELECT cp1.conversation_id
    FROM conversation_participants cp1
    JOIN conversation_participants cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations c ON c.id = cp1.conversation_id
    WHERE cp1.user_id = u1 
      AND cp2.user_id = u2 
      AND c.type = 'direct'
    LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 5. Tube Videos and Stories tables (Ensuring they exist)
CREATE TABLE IF NOT EXISTS stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    media_url TEXT NOT NULL,
    type TEXT DEFAULT 'image',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tube_videos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    youtube_url TEXT NOT NULL,
    thumbnail TEXT,
    category TEXT DEFAULT 'All',
    duration TEXT DEFAULT '0:00',
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    liked_by UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'like', 'follow', 'comment', etc.
    post_id UUID,
    text TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Add columns to Posts if missing
ALTER TABLE posts ADD COLUMN IF NOT EXISTS caption TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_name TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS user_avatar TEXT;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS liked_by UUID[] DEFAULT '{}';
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls TEXT[] DEFAULT '{}';

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see posts" ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON posts FOR DELETE USING (auth.uid() = user_id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- 8. RLS Policies (Basic ones, adjust according to needs)
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see follows" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow/unfollow" ON follows FOR ALL USING (auth.uid() = follower_id);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see stories" ON stories FOR SELECT USING (true);
CREATE POLICY "Users can manage their stories" ON stories FOR ALL USING (auth.uid() = user_id);

ALTER TABLE tube_videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see videos" ON tube_videos FOR SELECT USING (true);
CREATE POLICY "Users can manage their videos" ON tube_videos FOR ALL USING (auth.uid() = user_id);

-- 9. Comments table
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL, -- can refer to posts.id or tube_videos.id
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT,
    user_avatar TEXT,
    text TEXT NOT NULL,
    likes_count INTEGER DEFAULT 0,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- for replies
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Likes table (Generic for all content types)
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL,
    target_type TEXT NOT NULL, -- 'post', 'reel', 'video', 'comment'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, target_id, target_type)
);

-- 11. Reels table
CREATE TABLE IF NOT EXISTS reels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    video_url TEXT,
    youtube_id TEXT,
    thumbnail_url TEXT,
    caption TEXT,
    description TEXT,
    location TEXT,
    mentions TEXT[],
    allow_comments BOOLEAN DEFAULT TRUE,
    hide_likes BOOLEAN DEFAULT FALSE,
    audio_title TEXT DEFAULT 'Original Audio',
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Calls table
CREATE TABLE IF NOT EXISTS calls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id UUID REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type TEXT DEFAULT 'voice',
    status TEXT DEFAULT 'ringing',
    offer JSONB,
    answer JSONB,
    is_missed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see their own calls" ON calls FOR SELECT USING (auth.uid() = caller_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can manage their own calls" ON calls FOR ALL USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- 13. Call candidates for WebRTC
CREATE TABLE IF NOT EXISTS call_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id UUID REFERENCES calls(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    candidate JSONB NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE call_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see call candidates" ON call_candidates FOR SELECT USING (
    EXISTS (SELECT 1 FROM calls WHERE id = call_id AND (caller_id = auth.uid() OR receiver_id = auth.uid()))
);
CREATE POLICY "Users can add call candidates" ON call_candidates FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM calls WHERE id = call_id AND (caller_id = auth.uid() OR receiver_id = auth.uid()))
);

-- triggered function for new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, username, photo_url)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    LOWER(COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))),
    COALESCE(new.raw_user_meta_data->>'avatar_url', 'https://cdn-icons-png.flaticon.com/512/149/149071.png')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function on insert
-- Note: This requires high privileges, user may need to run this manually as admin
-- CREATE TRIGGER on_auth_user_created
--   AFTER INSERT ON auth.users
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to increment video views
CREATE OR REPLACE FUNCTION increment_video_views(video_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE tube_videos
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = video_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic increment function for likes
CREATE OR REPLACE FUNCTION increment_likes(target_id UUID, target_table TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET likes_count = COALESCE(likes_count, 0) + %L WHERE id = %L', target_table, amount, target_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic increment function for comments
CREATE OR REPLACE FUNCTION increment_comments(target_id UUID, target_table TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
  EXECUTE format('UPDATE %I SET comments_count = COALESCE(comments_count, 0) + %L WHERE id = %L', target_table, amount, target_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Storage Buckets Setup
-- Run these as a one-time setup in Supabase SQL editor or via application initial logic
-- We'll try to include them here for completeness

-- Note: These often need 'service_role' or manual UI setup in Supabase, 
-- but here are the SQL commands for standard storage setup.

INSERT INTO storage.buckets (id, name, public) VALUES ('chat-media', 'chat-media', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true) ON CONFLICT (id) DO NOTHING;

-- Storage Policies for chat-media
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'chat-media' );
CREATE POLICY "Authenticated Users Upload" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'chat-media' AND auth.role() = 'authenticated' );

-- Storage Policies for posts
CREATE POLICY "Public Access Posts" ON storage.objects FOR SELECT USING ( bucket_id = 'posts' );
CREATE POLICY "Authenticated Users Upload Posts" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'posts' AND auth.role() = 'authenticated' );

-- Storage Policies for reels
CREATE POLICY "Public Access Reels" ON storage.objects FOR SELECT USING ( bucket_id = 'reels' );
CREATE POLICY "Authenticated Users Upload Reels" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'reels' AND auth.role() = 'authenticated' );

-- Storage Policies for stories
CREATE POLICY "Public Access Stories" ON storage.objects FOR SELECT USING ( bucket_id = 'stories' );
CREATE POLICY "Authenticated Users Upload Stories" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'stories' AND auth.role() = 'authenticated' );

-- Storage Policies for profiles
CREATE POLICY "Public Access Profiles" ON storage.objects FOR SELECT USING ( bucket_id = 'profiles' );
CREATE POLICY "Authenticated Users Upload Profiles" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'profiles' AND auth.role() = 'authenticated' );

-- Function to keep only the last 20 messages per conversation
CREATE OR REPLACE FUNCTION public.cleanup_old_messages()
RETURNS trigger AS $$
BEGIN
  -- Delete messages older than the top 20 for this conversation
  DELETE FROM public.messages
  WHERE id IN (
    SELECT id
    FROM public.messages
    WHERE conversation_id = NEW.conversation_id
    ORDER BY created_at DESC
    OFFSET 20
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run cleanup after every message insert
-- Note: Uncomment this in your Supabase SQL Editor to enable autodelete
-- CREATE TRIGGER on_message_inserted
--   AFTER INSERT ON public.messages
--   FOR EACH ROW EXECUTE FUNCTION public.cleanup_old_messages();

-- 14. Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    type TEXT DEFAULT 'text', -- 'text', 'image', 'video', 'voice'
    is_read BOOLEAN DEFAULT FALSE,
    reply_to JSONB DEFAULT NULL,
    is_edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure is_read exists if table was already there
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Ensure replication is on for Realtime updates
ALTER TABLE messages REPLICA IDENTITY FULL;
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
EXCEPTION WHEN OTHERS THEN
  -- Handle case where it's already added or publication doesn't exist yet
END $$;

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can see messages in their conversations" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can insert messages to their conversations" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);
CREATE POLICY "Users can update is_read in their conversations" ON messages FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
  )
);

-- 14. Tube Live Chat
CREATE TABLE IF NOT EXISTS tube_live_chat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    video_id UUID NOT NULL REFERENCES tube_videos(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tube_live_chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see live chat" ON tube_live_chat FOR SELECT USING (true);
CREATE POLICY "Users can chat" ON tube_live_chat FOR INSERT WITH CHECK (auth.uid() = user_id);
