import { useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { chatService } from '../services/chatService';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { SupabaseStorageService } from '../../../services/SupabaseStorageService.ts';
import { LocalDataCache } from '../../../services/LocalDataCache';

export const useChatActions = (conversationId: string, receiverId: string) => {
  const { user } = useAuth();

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
      await chatService.sendMessage(conversationId, user.id, text, mediaData, replyTo);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [conversationId, user, receiverId]);

  const editMessage = useCallback(async (msgId: string, newText: string) => {
    if (!supabase) return;
    if (user?.id) {
      LocalDataCache.updateLastMessage(user.id, conversationId, newText);
    }
    await supabase
      .from('messages')
      .update({ content: newText, is_edited: true } as any)
      .eq('id', msgId);
  }, [conversationId, user]);

  const deleteMessage = useCallback(async (msgId: string) => {
    if (!supabase) return;
    await supabase
      .from('messages')
      .delete()
      .eq('id', msgId);
  }, []);

  const reactToMessage = useCallback(async (msgId: string, emoji: string) => {
    // Reaction logic could use a separate table in Supabase for better scalability
    // But for now, if we want to stick to the same schema as before:
    // We could add a 'reactions' jsonb column to messages
    if (!user || !supabase) return;
    
    const { data: msg } = await supabase
      .from('messages')
      .select('reactions')
      .eq('id', msgId)
      .single();
    
    const reactions = (msg?.reactions as any) || {};
    if (reactions[user.id] === emoji) {
      delete reactions[user.id];
    } else {
      reactions[user.id] = emoji;
    }

    await supabase
      .from('messages')
      .update({ reactions } as any)
      .eq('id', msgId);
  }, [user]);

  const clearChat = useCallback(async () => {
    if (!supabase || !conversationId) return;
    await supabase
      .from('messages')
      .delete()
      .eq('conversation_id', conversationId);
  }, [conversationId]);

  return { sendMessage, editMessage, deleteMessage, reactToMessage, clearChat };
};
