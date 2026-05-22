-- SUPABASE SCHEMA FOR GRIXCHAT
-- Run this in your Supabase SQL Editor

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";

-- 2. USERS TABLE (Linked to Auth.Users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  email text unique not null,
  username text unique not null,
  full_name text,
  photo_url text,
  bio text,
  link text,
  is_verified boolean default false,
  profile_type text default 'personal', -- 'personal', 'creator', 'business'
  post_count int4 default 0,
  settings jsonb default '{}'::jsonb,
  is_online boolean default false,
  last_seen timestamptz default now(),
  created_at timestamptz default now()
);

-- RLS for Users
alter table public.users enable row level security;
create policy "Users can view all profiles" on public.users for select using (true);
create policy "Users can update own profile" on public.users for update using (auth.uid() = id);

-- 3. POSTS TABLE
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  content text,
  media_urls text[], -- Array of image/video URLs
  likes_count int4 default 0,
  comments_count int4 default 0,
  created_at timestamptz default now()
);

-- RLS for Posts
alter table public.posts enable row level security;
create policy "Posts are viewable by everyone" on public.posts for select using (true);
create policy "Users can create posts" on public.posts for insert with check (auth.uid() = user_id);
create policy "Users can update own posts" on public.posts for update using (auth.uid() = user_id);
create policy "Users can delete own posts" on public.posts for delete using (auth.uid() = user_id);

-- 4. FOLLOWS TABLE (Relational Relationship)
create table if not exists public.follows (
  follower_id uuid references public.users(id) on delete cascade,
  following_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- RLS for Follows
alter table public.follows enable row level security;
create policy "Follows viewable by everyone" on public.follows for select using (true);
create policy "Users can follow others" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Users can unfollow others" on public.follows for delete using (auth.uid() = follower_id);

-- 5. POST LIKES (Atomic)
create table if not exists public.post_likes (
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- RLS for Post Likes
alter table public.post_likes enable row level security;
create policy "Likes viewable by everyone" on public.post_likes for select using (true);
create policy "Users can like posts" on public.post_likes for insert with check (auth.uid() = user_id);
create policy "Users can unlike posts" on public.post_likes for delete using (auth.uid() = user_id);

-- 6. POST COMMENTS
create table if not exists public.post_comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

-- RLS for Comments
alter table public.post_comments enable row level security;
create policy "Comments viewable by everyone" on public.post_comments for select using (true);
create policy "Authenticated users can comment" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "Users can delete own comments" on public.post_comments for delete using (auth.uid() = user_id);

-- 7. REELS (Visual Content)
create table if not exists public.reels (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  caption text,
  video_url text not null,
  thumbnail_url text,
  likes_count int4 default 0,
  comments_count int4 default 0,
  created_at timestamptz default now()
);

-- RLS for Reels
alter table public.reels enable row level security;
create policy "Reels are public" on public.reels for select using (true);
create policy "Users can upload reels" on public.reels for insert with check (auth.uid() = user_id);

-- 8. CONVERSATIONS (Chat Groups or DMs)
create table if not exists public.conversations (
  id uuid default uuid_generate_v4() primary key,
  type text default 'direct', -- 'direct' or 'group'
  name text, -- For group chats
  photo_url text, -- For group chats
  last_message text,
  last_message_at timestamptz default now(),
  created_at timestamptz default now(),
  created_by uuid references public.users(id)
);

-- CONVERSATION PARTICIPANTS
create table if not exists public.conversation_participants (
  conversation_id uuid references public.conversations(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (conversation_id, user_id)
);

-- RLS for Chats
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;

create policy "Users can see conversations they are part of" 
on public.conversations for select using (
  exists (
    select 1 from public.conversation_participants 
    where conversation_id = public.conversations.id and user_id = auth.uid()
  )
);

create policy "Participants can view details" on public.conversation_participants for select using (user_id = auth.uid());

-- 9. MESSAGES
create table if not exists public.messages (
  id uuid default uuid_generate_v4() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  content text,
  media_url text,
  media_type text, -- 'image', 'video', 'audio', 'file'
  is_read boolean default false,
  reply_to jsonb default null,
  is_edited boolean default false,
  created_at timestamptz default now()
);

-- RLS for Messages
alter table public.messages enable row level security;
create policy "Users can read messages in their conversations" 
on public.messages for select using (
  exists (
    select 1 from public.conversation_participants 
    where conversation_id = public.messages.conversation_id and user_id = auth.uid()
  )
);

create policy "Users can send messages" on public.messages for insert with check (auth.uid() = sender_id);

-- 10. NOTIFICATIONS
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  receiver_id uuid references public.users(id) on delete cascade,
  actor_id uuid references public.users(id) on delete cascade,
  type text not null, -- 'like', 'comment', 'follow', 'message'
  entity_id uuid, -- post_id or reel_id
  content text,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- RLS for Notifications
alter table public.notifications enable row level security;
create policy "Users can view own notifications" on public.notifications for select using (receiver_id = auth.uid());
create policy "Users can update own notifications" on public.notifications for update using (receiver_id = auth.uid());

-- 11. FUNCTIONS & TRIGGERS (Automations)

-- Function to handle profile creation on Auth Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, username, full_name, photo_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to call function on signup
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 11.1 AUTOMATIC LAST MESSAGE UPDATE
create or replace function public.update_last_message()
returns trigger as $$
begin
  update public.conversations
  set 
    last_message = coalesce(new.content, 'Sent a file'),
    last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_message_inserted
  after insert on public.messages
  for each row execute procedure public.update_last_message();

-- 12. REALTIME CONFIGURATION
-- Enable Realtime for key tables to ensure chat and notifications work instantly
begin;
  -- add tables to the publication
  -- Check if publication exists first (standard in Supabase)
  alter publication supabase_realtime add table public.messages;
  alter publication supabase_realtime add table public.conversations;
  alter publication supabase_realtime add table public.notifications;
  alter publication supabase_realtime add table public.users; -- for online status
  
  -- Enable replica identity full for detailed payloads on delete/update
  alter table public.messages replica identity full;
  alter table public.conversations replica identity full;
commit;
