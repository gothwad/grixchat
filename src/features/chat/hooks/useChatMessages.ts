import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { LocalDataCache } from '../../../services/LocalDataCache';

export const useChatMessages = (conversationId: string, initialLimit: number = 30) => {
  const [messages, setMessages] = useState<any[]>(() => {
    if (conversationId) {
      const cached = LocalDataCache.getMessages(conversationId);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    if (conversationId) {
      const cached = LocalDataCache.getMessages(conversationId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return false;
      }
    }
    return true;
  });
  
  const [loadingMore, setLoadingMore] = useState(false);
  const [messageLimit, setMessageLimit] = useState(initialLimit);
  const lastMessageCount = useRef(0);
  const { user, userData } = useAuth();

  const addOptimisticMessage = useCallback((msg: any) => {
    setMessages(prev => {
      const newList = [...prev, {
        ...msg,
        id: `temp-${Date.now()}`,
        created_at: new Date().toISOString(),
        sender_id: user?.id,
        is_read: false,
        status: 'sending', // New field for status indicator
        sender: {
          id: user?.id,
          username: userData?.username,
          full_name: userData?.fullName,
          photo_url: userData?.photoURL
        }
      }];
      return newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    });
  }, [user, userData]);

  const fetchMessages = useCallback(async (isMore = false) => {
    if (!conversationId || !supabase) return;

    if (isMore) setLoadingMore(true);

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
      .limit(messageLimit);

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      const reversed = (data as any[] || []).reverse();
      LocalDataCache.saveMessages(conversationId, reversed);
      setMessages(reversed);
    }
    
    setLoading(false);
    setLoadingMore(false);
  }, [conversationId, messageLimit]);

  useEffect(() => {
    fetchMessages();

    if (!conversationId || !supabase || !user) return;

    // Mark as read
    const markAsRead = async () => {
      if (!conversationId || !user) return;
      try {
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true } as any)
          .eq('conversation_id', conversationId)
          .neq('sender_id', user.id)
          .eq('is_read', false);
        
        if (error) {
          console.error('Error marking messages as read:', error);
        } else {
          console.log('Successfully marked messages as read for conv:', conversationId);
        }
      } catch (err) {
        console.error('Failed to mark messages as read:', err);
      }
    };

    // Real-time subscription for new messages
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
        // If it's a new message from OTHER user, mark it as read since we are in the chat
        if (payload.new.sender_id !== user.id) {
          markAsRead();
        }
        // Fetch full message with sender details
        // Fetch full message with sender details for the new message only
        try {
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
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            setMessages(prev => {
              // 1. Remove matching optimistic message if it exists
              // We match by sender_id and content/media for simple cases
              const filtered = prev.filter(m => {
                if (m.status !== 'sending') return true;
                
                // If it's the same sender and same content/media, it's likely the one we just sent
                const contentMatch = m.content === data.content;
                const mediaMatch = (!m.media_url && !data.media_url) || (m.media_url && data.media_url);
                
                return !(contentMatch && mediaMatch && m.sender_id === data.sender_id);
              });

              if (filtered.some(m => m.id === data.id)) return filtered;
              const newList = [...filtered, data];
              // Ensure strictly chronological
              return newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          } else {
            // Fallback to full fetch if targeted fetch fails
            fetchMessages();
          }
        } catch (err) {
          fetchMessages();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, async (payload) => {
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
          .eq('id', payload.new.id)
          .single();

        if (!error && data) {
          setMessages(prev => prev.map(m => m.id === data.id ? data : m));
        }
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat:', conversationId);
        }
      });

    // Initial mark as read
    markAsRead();

    // Also mark as read when window focuses
    const handleFocus = () => {
      markAsRead();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, fetchMessages]);

  const loadMore = useCallback(() => {
    setMessageLimit(prev => prev + 20);
  }, []);

  // Sync messages update with Local Cache
  useEffect(() => {
    if (messages && messages.length > 0 && conversationId) {
      LocalDataCache.saveMessages(conversationId, messages);
    }
  }, [messages, conversationId]);

  // Listen to local messages caching updates
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = LocalDataCache.subscribe(`messages:${conversationId}`, (updatedMsgs) => {
      if (updatedMsgs && Array.isArray(updatedMsgs)) {
        setMessages(updatedMsgs);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [conversationId]);

  return { 
    messages, 
    loading, 
    loadingMore,
    loadMore,
    addOptimisticMessage,
    messageLimit,
    lastMessageCount
  };
};
