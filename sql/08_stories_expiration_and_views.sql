-- Incremental Migration for Stories Expiration (24h) and Views tracking
-- Purpose: Adds views column to stories table, adds view_story RPC, and adds cleanup_expired_stories RPC.

-- 1. Add views JSONb column to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS views JSONB DEFAULT '[]'::JSONB NOT NULL;

-- 2. Create RPC to register a view securely without exposing direct update permissions
-- This is written in the simplest possible form to avoid any PL/pgSQL parsing issues.
CREATE OR REPLACE FUNCTION public.view_story(
    story_id_param UUID,
    viewer_id_param UUID,
    viewer_username_param TEXT,
    viewer_fullname_param TEXT,
    viewer_photo_url_param TEXT
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.stories
    SET views = COALESCE(views, '[]'::JSONB) || jsonb_build_array(
        jsonb_build_object(
            'id', viewer_id_param,
            'username', viewer_username_param,
            'full_name', viewer_fullname_param,
            'photo_url', viewer_photo_url_param,
            'viewed_at', NOW()
        )
    )
    WHERE id = story_id_param
      AND NOT (COALESCE(views, '[]'::JSONB) @> jsonb_build_array(jsonb_build_object('id', viewer_id_param::text)));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC to clean up stories older than 24 hours
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS VOID AS $$
BEGIN
    DELETE FROM public.stories WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger schema reload
NOTIFY pgrst, 'reload schema';
