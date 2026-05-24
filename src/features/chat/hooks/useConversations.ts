import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { LocalDataCache } from '../../../services/LocalDataCache';

export const useConversations = (activeFilter: string) => {
  const { user } = useAuth();
  
  // Use cached data instantly if it exists to prevent loader flickering
  const [conversations, setConversations] = useState<any[]>(() => {
    if (user?.id) {
      const cached = LocalDataCache.getConversations(user.id);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    }
    return [];
  });
  
  const [otherUsers, setOtherUsers] = useState<any[]>([]);
  
  // If we already have cached conversations, we don't need a full-screen loading spinner
  const [loading, setLoading] = useState(() => {
    if (user?.id) {
      const cached = LocalDataCache.getConversations(user.id);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return false;
      }
    }
    return true;
  });

  useEffect(() => {
    if (!user || activeFilter === 'Calls' || !supabase) return;

    const fetchConversations = async () => {
      const myId = user.id;
      const cached = LocalDataCache.getConversations(myId);
      if (!cached || cached.length === 0) {
        setLoading(true);
      }

      // 1. Fetch conversations I'm part of
      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation:conversations (
            *,
            participants:conversation_participants (
              user:users (*)
            )
          )
        `)
        .eq('user_id', myId)
        .order('joined_at', { ascending: false });

      if (error) {
        console.error('Error fetching conversations:', error);
        setLoading(false);
        return;
      }

      // Fetch unread messages count for all my conversations at once
      const { data: unreadData } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('is_read', false)
        .neq('sender_id', myId);

      const unreadMap: Record<string, number> = {};
      unreadData?.forEach(m => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      const rawList = data
        .map((item: any) => {
          const conv = item.conversation;
          if (!conv) return null;
          const isGroup = conv.type === 'group';
          const otherParticipants = conv.participants.filter((p: any) => p?.user?.id !== myId);
          const firstOther = otherParticipants[0]?.user;

          if (!isGroup && !firstOther) return null;

          const unreadCount = unreadMap[conv.id] || 0;

          return {
            id: conv.id,
            type: conv.type,
            otherUserId: isGroup ? conv.id : firstOther.id,
            user: isGroup ? (conv.name || 'Group') : (firstOther.full_name || firstOther.username || 'Unknown'),
            username: isGroup ? 'group' : firstOther?.username,
            fullName: isGroup ? conv.name : firstOther?.full_name,
            lastMsg: conv.last_message || 'New conversation',
            lastMsgAt: conv.last_message_at || conv.created_at,
            time: formatTime(new Date(conv.last_message_at || conv.created_at)),
            avatar: isGroup 
              ? (conv.photo_url || `https://cdn-icons-png.flaticon.com/512/166/166258.png`)
              : (firstOther?.photo_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`),
            unread: unreadCount > 0,
            unreadCount: unreadCount,
            isOnline: isGroup ? false : firstOther?.is_online
          };
        })
        .filter(Boolean);

      // De-duplicate direct conversations: Keep only the one with the most recent activity / actual messages
      const seenDict: Record<string, any> = {};
      rawList.forEach((conv: any) => {
        if (conv.type !== 'direct') return;
        const existing = seenDict[conv.otherUserId];
        if (!existing) {
          seenDict[conv.otherUserId] = conv;
        } else {
          // If one has real messages and the other is empty ('New conversation'), keep the real one
          const currentHasMsg = conv.lastMsg && conv.lastMsg !== 'New conversation';
          const existingHasMsg = existing.lastMsg && existing.lastMsg !== 'New conversation';

          if (currentHasMsg && !existingHasMsg) {
            seenDict[conv.otherUserId] = conv;
          } else if (!currentHasMsg && existingHasMsg) {
            // keep existing, do nothing
          } else {
            // both have messages or both are empty, keep the one with the more recent lastMsgAt
            if (new Date(conv.lastMsgAt).getTime() > new Date(existing.lastMsgAt).getTime()) {
              seenDict[conv.otherUserId] = conv;
            }
          }
        }
      });

      const formattedList = rawList
        .filter((conv: any) => {
          if (conv.type !== 'direct') return true;
          return seenDict[conv.otherUserId]?.id === conv.id;
        })
        .sort((a, b) => {
          return new Date(b.lastMsgAt).getTime() - new Date(a.lastMsgAt).getTime();
        });

      LocalDataCache.saveConversations(myId, formattedList);
      setConversations(formattedList);
      setLoading(false);
    };

    // Subscribe to Cache Updates for instant off-line updates
    const unsubscribeCache = LocalDataCache.subscribe('conversations', (updatedList) => {
      if (updatedList && Array.isArray(updatedList)) {
        setConversations(updatedList);
      }
    });

    fetchConversations();

    // Subscribe to conversation updates and new participants
    const channelId = `conversations-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversation_participants', filter: `user_id=eq.${user.id}` }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users' }, () => {
        fetchConversations();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      unsubscribeCache();
    };
  }, [user, activeFilter]);

  // Suggested users fetch
  useEffect(() => {
    if (!user || !supabase) return;
    const fetchSuggested = async () => {
      const { data } = await supabase
        .from('users')
        .select('*')
        .neq('id', user.id)
        .limit(5);
      
      if (data) {
        setOtherUsers(data.map((u: any) => ({
          uid: u.id,
          username: u.username,
          fullName: u.full_name,
          photoURL: u.photo_url,
          isOnline: u.is_online
        })));
      }
    };
    fetchSuggested();
  }, [user]);

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return { conversations, otherUsers, loading };
};
