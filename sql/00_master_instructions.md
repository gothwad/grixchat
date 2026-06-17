# GrixChat Supabase Setup & Verification Guide 🚀

This master guide ensures a 100% successful, zero-error database configuration on your Supabase project. All previous updates and schema files has been compiled and ordered sequentially inside this folder to match Supabase's schema dependencies perfectly.

---

## 📌 Order of Execution Checklist

Always execute the SQL files in the exact order below. Copy the contents of each file and run them in the **SQL Editor** of your Supabase dashboard:

1. **`01_core_schema.sql`**  
   - 🛠️ Creates the primary `users`, `follows`, `conversations`, `messages`, `stories`, `calls`, `call_candidates`, `chat_settings`, and `notifications` tables.
   - 🔒 Configures Row-Level Security (RLS) policies for secure client-side database querying.
   - ⚡ Registers optimized b-tree database search indexes.

2. **`02_posts_and_interactions_schema.sql`**  
   - 📊 Creates tables for Social Feeds: `posts`, `post_likes`, and `post_comments`.
   - 🔐 Sets up full public-read & user-write RLS policies and performance indexes.

3. **`03_support_tickets_schema.sql`**  
   - 🎫 Creates the `support_tickets` table for in-app contact forms, support lines, and system complaints.
   - 🛡️ Adds anonymous/authenticated insert policies.

4. **`04_triggers_functions_and_rpc.sql`**  
   - 🔗 Registers the `get_direct_conversation_id` database RPC function (used for lightweight, high-performance instant chat room matching instead of manual join queries).
   - 👤 Provisions the native `auth.users` trigger that automatically replicates newly registered users (via email, Google or GitHub OAuth) into your public `users` table with standard defaults and safe length check values.

5. **`05_advanced_optimizations_and_realtime.sql`**  
   - ⚡ Sets up efficient real-time subscription pipelines (`supabase_realtime` publication group).
   - 🔋 Registers auto-pruning triggers to cap active chat messages and voice/video records at 60 active events, automatically sweeping old historical data as the table expands. This completely bypasses table bloat, maintaining a lightweight database footprint, and keeps your project 100% under Supabase's free plan threshold!

6. **`06_storage_configurations.sql`**  
   - 📂 Seeds the required Supabase Storage buckets: `chat-media` (for pictures, videos, and custom voice memos) and `profiles` (for user profiles and circular thumbnails).
   - 🛡️ Configures secure upload policies on `storage.objects` to ensure media files are publicly visible while restricting modifications strictly to their authenticated owners.

---

## 🔍 Post-Setup Verification Checklist

After running the scripts, you can verify they are functional with the following tests:

### 1. Verification of Tables
Navigate to your Supabase **Table Editor**. You should see the following tables populated under the `public` schema:
- [ ] `users`
- [ ] `follows`
- [ ] `conversations`
- [ ] `conversation_participants`
- [ ] `messages`
- [ ] `stories`
- [ ] `calls`
- [ ] `call_candidates`
- [ ] `chat_settings`
- [ ] `notifications`
- [ ] `posts`
- [ ] `post_likes`
- [ ] `post_comments`
- [ ] `support_tickets`

### 2. Verify Storage Buckets
Navigate to the **Storage** section in your Supabase dashboard. You should see two public buckets:
- [ ] `chat-media`
- [ ] `profiles`

### 3. Verify Triggers and Database Functions
Navigate to **Database** -> **Triggers** & **Database** -> **Functions** to check if:
- [ ] Function `get_direct_conversation_id` is registered successfully.
- [ ] Trigger `on_auth_user_created` exists under `auth.users` referencing `handle_new_auth_user`.
- [ ] Live pruning triggers like `trg_prune_past_messages` exist on `public.messages`.

---

## 🛠️ Troubleshooting & Support Tips

* **Foreign Key Errors:** Run the scripts in the specified numerical order. `02_posts_and_interactions_schema.sql` depends on tables generated in `01_core_schema.sql`, and so on.
* **Storage Upload Failures:** If user uploads fail on the client-side, ensure storage policies are active and that the `chat-media` and `profiles` buckets are set to **"Public"** in the Storage configuration dashboard.
* **Realtime Sync Issues:** In some cases, Supabase Realtime requires a manual toggle check. Go to **Database** -> **Replication**, search for `supabase_realtime`, and ensure replication is toggled **Active** for the desired tables (`messages`, `conversations`, `users`, etc.).
