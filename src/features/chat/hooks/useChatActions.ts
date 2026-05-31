import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { chatService } from '../services/chatService';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { SupabaseStorageService } from '../../../services/SupabaseStorageService.ts';
import { LocalDataCache } from '../../../services/LocalDataCache';
import { pushNotificationService } from '../services/pushNotificationService';

export const useChatActions = (conversationId: string, receiverId: string) => {
  const { user, userData } = useAuth();

  const sendMessage = useCallback(async ({
    text,
    file,
    localPreviewUrl,
    replyTo,
    onProgress
  }: {
    text: string;
    file?: File | Blob | null;
    localPreviewUrl?: string;
    replyTo?: any;
    onProgress?: (progress: number) => void;
  }) => {
    if (!user || !conversationId || !supabase) return;

    let mediaData: { url: string; type: string } | undefined;

    if (file) {
      const fileName = (file as File).name || (file.type.startsWith('audio/') ? 'voice_message.webm' : 'file');
      const fileType = file.type.startsWith('image/') ? 'image' : 
                       file.type.startsWith('video/') ? 'video' : 
                       file.type.startsWith('audio/') ? 'audio' : 'file';
      
      try {
        // Simple upload (progress can be added later if storage service supports it)
        const finalUrl = await SupabaseStorageService.uploadDocument(file as File);
        mediaData = { url: finalUrl, type: fileType };
      } catch (error) {
        console.error('Upload failed:', error);
        return;
      }
    }

    try {
      const displayContent = text || (mediaData ? `Sent a ${mediaData.type}` : 'Sent a file');
      LocalDataCache.updateLastMessage(user.id, conversationId, displayContent);
      const dbMessage = await chatService.sendMessage(conversationId, user.id, text, mediaData, replyTo);
      
      if (dbMessage) {
        dbMessage.content = dbMessage.text || dbMessage.content || '';
        
        // Immediately replace the optimistic sending block with the confirmed message in cache
        const cached = LocalDataCache.getMessages(conversationId) || [];
        const filtered = cached.filter((m: any) => {
          if (m.status !== 'sending') return true;
          // Match text or media content from this sender
          const contentMatch = m.content === dbMessage.content;
          const mediaMatch = (!m.media_url && !dbMessage.media_url) || (m.media_url && dbMessage.media_url);
          return !(contentMatch && mediaMatch && m.sender_id === user.id);
        });

        const stableMessage = {
          ...dbMessage,
          sender: {
            id: user.id,
            username: userData?.username || 'user',
            full_name: userData?.fullName || 'User',
            photo_url: userData?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'
          }
        };

        const finalMsgs = [...filtered, stableMessage].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        LocalDataCache.saveMessages(conversationId, finalMsgs);
        LocalDataCache.notify(`messages:${conversationId}`, finalMsgs);

        // Dispatch background push alert logic
        pushNotificationService.sendNotificationForMessage(
          conversationId,
          user.id,
          userData?.fullName || userData?.username || 'GrixChat User',
          text,
          mediaData?.type
        ).catch(err => console.warn('pushNotificationService activation errored:', err));

        // Background failsafe auto-pruner to cap Supabase message count in this chat to 60.
        // If count hits >= 60, we remove the oldest 20 messages so only 40 are left.
        (async () => {
          try {
            const { count, error: countErr } = await supabase
              .from('messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', conversationId);

            if (!countErr && count && count >= 60) {
              const { data: oldest, error: selectErr } = await supabase
                .from('messages')
                .select('id')
                .eq('conversation_id', conversationId)
                .order('created_at', { ascending: true })
                .limit(20);

              if (!selectErr && oldest && oldest.length > 0) {
                const idsToDelete = oldest.map(o => o.id);
                await supabase
                  .from('messages')
                  .delete()
                  .in('id', idsToDelete);
                console.log(`[Message Pruning] Successfully pruned oldest 20 messages in conversation ${conversationId}.`);
              }
            }
          } catch (e) {
            console.error('[Message Pruning] Failsafe error:', e);
          }
        })();

        return stableMessage;
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [conversationId, user, userData, receiverId]);

  const editMessage = useCallback(async (msgId: string, newText: string) => {
    if (!supabase) return;
    if (user?.id) {
      LocalDataCache.updateLastMessage(user.id, conversationId, newText);
    }

    // Instantly/optimistically update local messages cache and notify listeners
    const cached = LocalDataCache.getMessages(conversationId) || [];
    const updated = cached.map((m: any) => {
      if (m.id === msgId) {
        return {
          ...m,
          text: newText,
          content: newText,
          is_edited: true
        };
      }
      return m;
    });
    LocalDataCache.saveMessages(conversationId, updated);
    LocalDataCache.notify(`messages:${conversationId}`, updated);

    try {
      // First try to update both text and is_edited
      const { error } = await supabase
        .from('messages')
        .update({ text: newText, is_edited: true } as any)
        .eq('id', msgId);
      
      if (error) {
        console.warn('Error updating message with is_edited column (falling back to text-only):', error);
        // Fallback to text-only if SQL column doesn't exist yet
        const { error: fallbackError } = await supabase
          .from('messages')
          .update({ text: newText } as any)
          .eq('id', msgId);
        if (fallbackError) {
          console.error('Failed to edit message in fallback mode:', fallbackError);
        }
      }
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  }, [conversationId, user]);

  const deleteMessage = useCallback(async (msgId: string) => {
    if (!supabase) return;

    // Instantly/optimistically update local messages cache and notify listeners
    const cached = LocalDataCache.getMessages(conversationId) || [];
    const updated = cached.filter((m: any) => m.id !== msgId);
    LocalDataCache.saveMessages(conversationId, updated);
    LocalDataCache.notify(`messages:${conversationId}`, updated);

    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', msgId);
      if (error) {
        console.error('Error deleting message in Supabase:', error);
      }
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  }, [conversationId]);

  const reactToMessage = useCallback(async (msgId: string, emoji: string) => {
    if (!user || !supabase || !conversationId) return;

    // 1. Optimistic cache update to make reaction instant in the active UI
    const cached = LocalDataCache.getMessages(conversationId) || [];
    const updated = cached.map((m: any) => {
      if (m.id === msgId) {
        const reactions = { ...(m.reactions || {}) };
        if (reactions[user.id] === emoji) {
          delete reactions[user.id];
        } else {
          reactions[user.id] = emoji;
        }
        return { ...m, reactions };
      }
      return m;
    });
    LocalDataCache.saveMessages(conversationId, updated);
    LocalDataCache.notify(`messages:${conversationId}`, updated);

    // 2. Perform the server update
    try {
      const { data: msg } = await supabase
        .from('messages')
        .select('reactions')
        .eq('id', msgId)
        .single();
      
      const dbReactions = (msg?.reactions as any) || {};
      if (dbReactions[user.id] === emoji) {
        delete dbReactions[user.id];
      } else {
        dbReactions[user.id] = emoji;
      }

      await supabase
        .from('messages')
        .update({ reactions: dbReactions } as any)
        .eq('id', msgId);
    } catch (err) {
      console.error('Error updating reaction in database:', err);
    }
  }, [user, conversationId]);

  const clearChat = useCallback(async () => {
    if (!supabase || !conversationId) return;
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
  }, [conversationId]);

  return { sendMessage, editMessage, deleteMessage, reactToMessage, clearChat };
};
