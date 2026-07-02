-- =========================================================================
-- STEP 5: PERFORMANCE OPTIMIZATION, REAL-TIME QUEUES, AND AUTOMATED PRUNING
-- =========================================================================
-- Instructions:
-- 1. Execute this file in your Supabase SQL Editor AFTER running Step 4.
-- 2. This step guarantees that your Supabase databases remain lightweight,
--    enables immediate push updates, and cleans up historical records.
-- =========================================================================

-- 1. MESSAGE CAP PRUNER (LIMITS ROOMS TO LAST 60 MESSAGES - PRUNES TO 40)
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


-- 2. AUTOMATICALLY SYNC NEW MESSAGES WITH CONVERSATIONS PREVIEWS
CREATE OR REPLACE FUNCTION update_conversation_timestamp_and_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        updated_at = NEW.created_at,
        last_message = COALESCE(NEW.text, CASE WHEN NEW.media_type IS NOT NULL THEN 'Sent a ' || NEW.media_type ELSE 'Sent an attachment' END),
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages;
CREATE TRIGGER trg_update_conversation_on_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp_and_last_message();


-- 3. INTERACTIVE CALLS RECUPERATOR PRUNER (LIMITS CHRONO CALLS TO LAST 60)
CREATE OR REPLACE FUNCTION prune_past_calls()
RETURNS TRIGGER AS $$
DECLARE
    caller_call_count INT;
    receiver_call_count INT;
BEGIN
    SELECT COUNT(*) INTO caller_call_count 
    FROM public.calls 
    WHERE caller_id = NEW.caller_id OR receiver_id = NEW.caller_id;

    IF caller_call_count >= 60 THEN
        DELETE FROM public.calls
        WHERE (caller_id = NEW.caller_id OR receiver_id = NEW.caller_id)
          AND id NOT IN (
              SELECT subquery.id FROM (
                  SELECT id FROM public.calls
                  WHERE caller_id = NEW.caller_id OR receiver_id = NEW.caller_id
                  ORDER BY created_at DESC, id DESC
                  LIMIT 40
              ) subquery
          );
    END IF;

    IF NEW.receiver_id IS NOT NULL AND NEW.receiver_id <> NEW.caller_id THEN
        SELECT COUNT(*) INTO receiver_call_count 
        FROM public.calls 
        WHERE caller_id = NEW.receiver_id OR receiver_id = NEW.receiver_id;

        IF receiver_call_count >= 60 THEN
            DELETE FROM public.calls
            WHERE (caller_id = NEW.receiver_id OR receiver_id = NEW.receiver_id)
              AND id NOT IN (
                  SELECT subquery.id FROM (
                      SELECT id FROM public.calls
                      WHERE caller_id = NEW.receiver_id OR receiver_id = NEW.receiver_id
                      ORDER BY created_at DESC, id DESC
                      LIMIT 40
                  ) subquery
              );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_prune_past_calls ON public.calls;
CREATE TRIGGER trg_prune_past_calls
AFTER INSERT ON public.calls
FOR EACH ROW
EXECUTE FUNCTION prune_past_calls();


-- 4. REAL-TIME MULTICAST CHANNEL IDENTITY ENABLEMENTS
ALTER TABLE public.users REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.calls REPLICA IDENTITY FULL;
ALTER TABLE public.call_candidates REPLICA IDENTITY FULL;


-- 5. SUPABASE WebSocket Realtime Publication Bindings
DO $$
BEGIN
    -- Check and drop pre-existing tables from the publication to prevent duplicate key errors
    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.conversations;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'users'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.users;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'calls'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.calls;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'call_candidates'
    ) THEN
        ALTER PUBLICATION supabase_realtime DROP TABLE public.call_candidates;
    END IF;
END $$;

-- Enable Realtime for key instant replication tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_candidates;


-- 6. RETROACTIVE SWEEP (Instantly trims pre-existing high-volume tables down to 40 records)
DO $$
DECLARE
    u_rec RECORD;
    conv_rec RECORD;
BEGIN
    -- Prune existing calls back to newest 40 for every user
    FOR u_rec IN (SELECT DISTINCT id FROM public.users) LOOP
        DELETE FROM public.calls
        WHERE (caller_id = u_rec.id OR receiver_id = u_rec.id)
          AND id NOT IN (
              SELECT subquery.id FROM (
                  SELECT id FROM public.calls
                  WHERE caller_id = u_rec.id OR receiver_id = u_rec.id
                  ORDER BY created_at DESC, id DESC
                  LIMIT 40
              ) subquery
          );
    END LOOP;

    -- Prune existing messages back to newest 40 for every conversation room
    FOR conv_rec IN (SELECT DISTINCT id FROM public.conversations) LOOP
        DELETE FROM public.messages
        WHERE conversation_id = conv_rec.id
          AND id NOT IN (
              SELECT subquery.id FROM (
                  SELECT id FROM public.messages
                  WHERE conversation_id = conv_rec.id
                  ORDER BY created_at DESC, id DESC
                  LIMIT 40
              ) subquery
          );
    END LOOP;
END;
$$;

-- Reload Schema and notify PostgREST
NOTIFY pgrst, 'reload schema';
