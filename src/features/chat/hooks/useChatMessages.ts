import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { LocalDataCache } from '../../../services/LocalDataCache';

export const useChatMessages = (conversationId: string, initialLimit: number = 20) => {
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
  const { user, userData, isAuthReady } = useAuth();
  
  const confirmOptimisticMessage = useCallback((tempId: string, dbMessage: any) => {
    if (!dbMessage) return;
    dbMessage.content = dbMessage.text || dbMessage.content || '';
    
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== tempId);
      if (filtered.some(m => m.id === dbMessage.id)) {
        return filtered;
      }
      const newList = [...filtered, dbMessage];
      const sorted = newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      
      if (conversationId) {
        LocalDataCache.saveMessages(conversationId, sorted);
      }
      return sorted;
    });
  }, [conversationId]);

  const addOptimisticMessage = useCallback((msg: any) => {
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    setMessages(prev => {
      const newList = [...prev, {
        ...msg,
        id: tempId,
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
    return tempId;
  }, [user, userData]);

  const fetchMessages = useCallback(async (isMore = false) => {
    if (!conversationId || !supabase) return;

    if (isMore) setLoadingMore(true);

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
          ),
          reply_to:reply_to (
            id,
            text,
            sender_id
          )
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: false })
        .limit(messageLimit);

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        const reversed = (data as any[] || []).reverse();
        reversed.forEach((m: any) => {
          m.content = m.text || m.content || '';
        });
        
        setMessages(prev => {
          const mergedMap = new Map();
          prev.forEach(msg => {
            if (msg && msg.id) mergedMap.set(msg.id, msg);
          });
          reversed.forEach(msg => {
            if (msg && msg.id) mergedMap.set(msg.id, msg);
          });
          const mergedList = Array.from(mergedMap.values())
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
          LocalDataCache.saveMessages(conversationId, mergedList);
          return mergedList;
        });
      }
    } catch (e) {
      console.error('Exception caught inside fetchMessages:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [conversationId, messageLimit]);

  // Synchronously sync messages & loading state when conversationId changes
  useEffect(() => {
    if (conversationId) {
      const cached = LocalDataCache.getMessages(conversationId);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        setMessages(cached);
        setLoading(false);
      } else {
        setMessages([]);
        setLoading(true);
      }
    } else {
      setMessages([]);
      setLoading(true);
    }
    setMessageLimit(initialLimit);
  }, [conversationId, initialLimit]);

  // Stabilize fetchMessages callback via a ref so real-time subscription doesn't thrash
  const fetchMessagesRef = useRef(fetchMessages);
  useEffect(() => {
    fetchMessagesRef.current = fetchMessages;
  }, [fetchMessages]);

  // Mark as read function that will be stored in a ref to stay fresh but stable
  const markAsRead = useCallback(async () => {
    if (!conversationId || !user || !supabase) return;
    
    // Instantly clear cached count for zero local UI latency!
    LocalDataCache.clearUnreadCount(user.id, conversationId);

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
  }, [conversationId, user?.id]);

  const markAsReadRef = useRef(markAsRead);
  useEffect(() => {
    markAsReadRef.current = markAsRead;
  }, [markAsRead]);

  // 1. Hook for loading initial messages and paging loads
  useEffect(() => {
    if (!conversationId || !isAuthReady) return;
    const isMore = messageLimit > initialLimit;
    fetchMessages(isMore);
  }, [conversationId, messageLimit, initialLimit, isAuthReady]);

  // 2. Hook for background polling synchronizer as absolute failsafe backup
  useEffect(() => {
    if (!conversationId || !user || !isAuthReady) return;

    let isActive = true;
    const intervalId = setInterval(() => {
      // Only poll gently if the tab is visible and network is active
      if (isActive && document.visibilityState === 'visible' && navigator.onLine) {
        fetchMessagesRef.current();
        markAsReadRef.current();
      }
    }, 6000); // Failsafe heart-beat sync every 6 seconds

    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [conversationId, user?.id, isAuthReady]);

  // 3. Hook for Realtime Postgres Subscription (Bound exclusively to conversation ID)
  useEffect(() => {
    if (!conversationId || !supabase || !user || !isAuthReady) return;

    // Real-time subscription for new messages or edits
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
          markAsReadRef.current();
        }
        
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
              ),
              reply_to:reply_to (
                id,
                text,
                sender_id
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (!error && data) {
            data.content = data.text || data.content || '';
            setMessages(prev => {
              const filtered = prev.filter(m => {
                if (m.status !== 'sending') return true;
                const contentMatch = m.content === data.content;
                const mediaMatch = (!m.media_url && !data.media_url) || (m.media_url && data.media_url);
                return !(contentMatch && mediaMatch && m.sender_id === data.sender_id);
              });

              if (filtered.some(m => m.id === data.id)) return filtered;
              const newList = [...filtered, data];
              return newList.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            });
          } else {
            fetchMessagesRef.current();
          }
        } catch (err) {
          fetchMessagesRef.current();
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        // Merge real-time updates directly to preserve metadata and render instantly
        setMessages(prev => prev.map(m => m.id === payload.new.id ? {
          ...m,
          ...payload.new,
          content: payload.new.text || payload.new.content || m.content || ''
        } : m));
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        setMessages(prev => {
          const index = prev.findIndex(m => m.id === payload.old.id);
          if (index === -1) return prev;
          
          // If deleted message is more than 30 messages deep from newest, it's db pruning! Keep it in UI from local cache.
          const isPrune = (prev.length - index) > 30;
          if (isPrune) {
            return prev;
          }
          return prev.filter(m => m.id !== payload.old.id);
        });
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to chat:', conversationId);
        }
      });

    // Mark as read immediately on active screen entering
    markAsReadRef.current();

    const handleFocus = () => {
      markAsReadRef.current();
      // Instantly call fetchMessages on focus to capture any updates instantly when returning
      fetchMessagesRef.current();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
      supabase.removeChannel(channel);
    };
  }, [conversationId, user?.id, isAuthReady]);

  const loadMore = useCallback(() => {
    if (!loading && !loadingMore) setMessageLimit(prev => prev + 20);
  }, [loading, loadingMore]);

  useEffect(() => {
    if (messages?.length > 0 && conversationId) {
      const seenIds = new Set<string>();
      const unique = messages.filter(m => {
        if (!m || !m.id) return false;
        if (seenIds.has(m.id)) return false;
        seenIds.add(m.id);
        return true;
      });
      if (unique.length !== messages.length) {
        setMessages(unique);
      }
      LocalDataCache.saveMessages(conversationId, unique);
    }
  }, [messages, conversationId]);

  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = LocalDataCache.subscribe(`messages:${conversationId}`, (updated) => {
      if (updated && Array.isArray(updated)) setMessages(updated);
    });
    return () => unsubscribe();
  }, [conversationId]);

  return { 
    messages, 
    loading, 
    loadingMore,
    loadMore,
    addOptimisticMessage,
    confirmOptimisticMessage,
    messageLimit,
    lastMessageCount
  };
};
