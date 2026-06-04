import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';

export const useChatRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !supabase) return;

    const fetchRooms = async () => {
      setLoading(true);
      try {
        // Fetch conversation IDs the user is part of
        const { data: participations, error: pError } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', user.id);

        if (pError) throw pError;

        if (!participations || participations.length === 0) {
          setRooms([]);
          setLoading(false);
          return;
        }

        const convIds = participations.map(p => p.conversation_id);

        // Fetch conversations and their participants (other than current user)
        const { data: convData, error: cError } = await supabase
          .from('conversations')
          .select(`
            *,
            participants:conversation_participants(
              user:users(*)
            )
          `)
          .in('id', convIds)
          .order('updated_at', { ascending: false });

        if (cError) throw cError;

        const chatRooms = convData.map(conv => {
          // Flatten participants to find the other user
          const otherParticipant = conv.participants?.find((p: any) => p.user?.id !== user.id);
          const otherUser = otherParticipant?.user;

          return {
            id: conv.id,
            ...conv,
            otherUserId: otherUser?.id,
            user: otherUser ? {
              uid: otherUser.id,
              username: otherUser.username,
              fullName: otherUser.full_name,
              photoURL: otherUser.photo_url,
              isOnline: otherUser.is_online,
              lastSeen: otherUser.last_seen
            } : null
          };
        });

        setRooms(chatRooms);
      } catch (error) {
        console.error("Error fetching chat rooms:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRooms();

    // Subscribe to changes in conversations and participants
    const channel = supabase
      .channel('chat_rooms_updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversations' 
      }, () => fetchRooms())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'conversation_participants',
        filter: `user_id=eq.${user.id}`
      }, () => fetchRooms())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return { rooms, loading };
};
