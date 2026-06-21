-- Incremental Migration for Chat Time Scheduling
-- Purpose: Add support for custom chat times, allowing users of direct chats to set allowed days/times.
-- Integrates directly inside public.conversations table under watch_state JSONB field, with defensive fallback.

ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS chat_time_restrictions JSONB DEFAULT NULL;

-- Keep Row Level Security enabled for access constraints
-- Triggers a reload of PostgREST schema cache to make column visible
NOTIFY pgrst, 'reload schema';
