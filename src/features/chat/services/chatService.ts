import { supabase } from '../../../lib/supabase';

export const chatService = {
  async sendMessage(
    conversationId: string, 
    senderId: string, 
    content: string, 
    mediaData?: { url: string; type: string },
    replyTo?: any
  ) {
    if (!supabase) throw new Error("Supabase is not initialized");

    const insertPayload: any = {
      conversation_id: conversationId,
      sender_id: senderId,
      content: content,
      media_url: mediaData?.url,
      media_type: mediaData?.type,
    };

    if (replyTo) {
      insertPayload.reply_to = {
        id: replyTo.id,
        content: replyTo.content || replyTo.text || '',
        sender_id: replyTo.sender_id
      };
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insertPayload)
      .select()
      .single();

    if (error) throw error;

    // Update last message in conversation
    await supabase
      .from('conversations')
      .update({
        last_message: content || `Sent a ${mediaData?.type || 'file'}`,
        last_message_at: new Date().toISOString()
      } as any)
      .eq('id', conversationId);

    return data;
  },

  async getConversation(conversationId: string) {
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();
    
    if (error) {
      console.warn('Error fetching conversation:', error);
      return null;
    }
    return data;
  },

  async updateConversation(conversationId: string, data: any) {
    if (!supabase) return;
    const { error } = await supabase
      .from('conversations')
      .update(data as any)
      .eq('id', conversationId);
    
    if (error) throw error;
  },

  async getMessages(conversationId: string, limitCount = 50) {
    if (!supabase) return [];
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users (
          id,
          username,
          full_name,
          photo_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limitCount);
    
    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    // Return in chronological order for UI
    return data.reverse();
  },

  async getOrCreateDirectConversation(user1Id: string, user2Id: string) {
    if (!supabase) return null;

    // Check if DM already exists
    const { data: existing, error: checkError } = await supabase
      .rpc('get_direct_conversation_id', { u1: user1Id, u2: user2Id });

    if (existing) return existing;

    // Create new DM conversation
    const { data: conv, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'direct' } as any)
      .select()
      .single();

    if (convError) throw convError;

    // Add participants
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert([
        { conversation_id: conv.id, user_id: user1Id },
        { conversation_id: conv.id, user_id: user2Id }
      ] as any);

    if (partError) throw partError;

    return (conv as any).id;
  }
};
