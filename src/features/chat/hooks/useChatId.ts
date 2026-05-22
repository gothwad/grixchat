import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { chatService } from '../services/chatService';

export function useChatId(receiverId: string | undefined) {
  const [chatId, setChatId] = useState<string>('');
  const [convType, setConvType] = useState<'direct' | 'group'>('direct');
  const { user } = useAuth();

  useEffect(() => {
    if (!receiverId || !user || !supabase) {
      setChatId('');
      return;
    }
    
    const resolveChatId = async () => {
      const myId = user.id;

      // Check if receiverId is a user (DM)
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('id', receiverId)
        .single();

      if (userData) {
        // It's a user, get/create DM
        const id = await chatService.getOrCreateDirectConversation(myId, receiverId);
        if (id) {
          setChatId(id);
          setConvType('direct');
        }
      } else {
        // Assume it's a conversation ID already
        setChatId(receiverId);
        
        const { data: convData } = await supabase
          .from('conversations')
          .select('type')
          .eq('id', receiverId)
          .single();
        
        if (convData) {
          setConvType(convData.type);
        } else {
          setConvType('group'); // Fallback
        }
      }
    };

    resolveChatId();
  }, [receiverId, user?.id]);

  return { chatId, convType };
}
