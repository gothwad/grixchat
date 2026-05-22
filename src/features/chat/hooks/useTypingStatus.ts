import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider.tsx';

export const useTypingStatus = (chatId: string, receiverId: string) => {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const channelRef = useRef<any>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!chatId || !supabase || !user) return;

    const channel = supabase.channel(`typing:${chatId}`, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherTyping = Object.entries(state).some(([key, presence]: [string, any]) => {
          return key === receiverId && presence[0]?.isTyping;
        });
        setIsOtherTyping(otherTyping);
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [chatId, receiverId, user?.id]);

  const handleTyping = () => {
    if (!channelRef.current) return;
    
    channelRef.current.track({ isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.track({ isTyping: false });
    }, 3000);
  };

  return { isOtherTyping, handleTyping };
};
