import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { CallsHistoryList } from './components/CallsHistoryList';
import { LocalDataCache } from '../../services/LocalDataCache';
import { CommonSearchBar } from '../../components/common/CommonSearchBar';

export default function CallsTab() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  
  // Instant load calls history from Cache
  const [calls, setCalls] = useState<any[]>(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.get<any[]>(`gx_calls_history_${authUser.id}`);
      if (cached && Array.isArray(cached)) return cached;
    }
    return [];
  });
  
  const [callsLoading, setCallsLoading] = useState(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.get<any[]>(`gx_calls_history_${authUser.id}`);
      if (cached && Array.isArray(cached) && cached.length > 0) return false;
    }
    return true;
  });

  const [limit, setLimit] = useState(15);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isPaginating, setIsPaginating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Keep references to current calls to prevent state-reset loop
  const callsRef = useRef(calls);

  useEffect(() => {
    callsRef.current = calls;
  }, [calls]);

  // Sync state with Cache when authUser becomes resolved
  useEffect(() => {
    if (authUser?.id) {
      const cachedCalls = LocalDataCache.get<any[]>(`gx_calls_history_${authUser.id}`);
      if (cachedCalls && Array.isArray(cachedCalls) && cachedCalls.length > 0) {
        setCalls(cachedCalls);
        setCallsLoading(false);
      }
    }
  }, [authUser?.id]);

  const authUserZone = () => {
    return authUser && authUser.id;
  };

  const fetchCalls = React.useCallback(async () => {
    if (!authUser?.id || !supabase) return;
    try {
      const cached = LocalDataCache.get<any[]>(`gx_calls_history_${authUser.id}`);
      const currentCalls = callsRef.current;
      const hasData = (currentCalls && currentCalls.length > 0) || (cached && cached.length > 0);
      
      if (isPaginating) {
        setLoadingMore(true);
      } else if (limit === 15) {
        if (!hasData) {
          setCallsLoading(true);
        }
      }

      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:users!calls_caller_id_fkey (id, username, photo_url, full_name),
          receiver:users!calls_receiver_id_fkey (id, username, photo_url, full_name)
        `)
        .or(`caller_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: false })
        .limit(limit + 1);

      if (!error && data) {
        let hasMoreData = false;
        let queryData = data || [];
        if (queryData.length > limit) {
          hasMoreData = true;
          queryData = queryData.slice(0, limit);
        }
        setHasMore(hasMoreData);

        const callList = queryData.map((c: any) => {
          const isCaller = c.caller_id === authUser.id;
          const otherUser = isCaller ? c.receiver : c.caller;
          
          return {
            id: c.id,
            otherUserId: isCaller ? c.receiver_id : c.caller_id,
            user: otherUser?.full_name || otherUser?.username || 'GrixChat User',
            avatar: otherUser?.photo_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
            type: c.type === 'audio' ? 'voice' : c.type,
            isIncoming: !isCaller,
            isMissed: c.is_missed || false,
            time: c.created_at ? new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'
          };
        });
        setCalls(callList);
        LocalDataCache.set(`gx_calls_history_${authUser.id}`, callList);
      }
    } catch (e) {
      console.error("Error fetching calls:", e);
    } finally {
      setCallsLoading(false);
      setLoadingMore(false);
      setIsPaginating(false);
    }
  }, [authUser?.id, limit, isPaginating]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrollable = target.scrollHeight > target.clientHeight;
    const closeToBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= 100;
    if (isScrollable && target.scrollTop > 5 && closeToBottom) {
      if (hasMore && !loadingMore && !callsLoading) {
        setIsPaginating(true);
        setLimit(prev => prev + 15);
      }
    }
  };

  useEffect(() => {
    fetchCalls();

    if (!supabase || !authUserZone()) return;

    const channel = supabase
      .channel('calls-updates-realtime')
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'calls',
         filter: `caller_id=eq.${authUser?.id}`
       }, () => fetchCalls())
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'calls',
         filter: `receiver_id=eq.${authUser?.id}`
       }, () => fetchCalls())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser?.id, fetchCalls]);

  const startCallDirectly = (userId: string, callType: 'voice' | 'video') => {
    navigate(`/call/${userId}?type=${callType}`);
  };

  const getFilteredCalls = () => {
    let filtered = calls;
    if (searchTerm) {
      filtered = filtered.filter(c => 
        (c.user || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return filtered;
  };

  return (
    <div 
      className="flex flex-col h-full bg-bg-card font-sans relative overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div 
        className="flex-1 flex flex-col min-h-0 bg-bg-card"
        style={{ backgroundColor: 'var(--bg-card)' }}
      >
        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-bg-card"
          style={{ backgroundColor: 'var(--bg-card)' }}
        >
          {/* Search bar inside scroll viewport */}
          <CommonSearchBar 
            placeholder="Search calls..."
            value={searchTerm}
            onChange={setSearchTerm}
            onClear={() => setSearchTerm('')}
          />

          {/* List display area */}
          <div className="mt-1">
            <React.Fragment>
              <CallsHistoryList 
                calls={getFilteredCalls()} 
                loading={callsLoading} 
                onCall={startCallDirectly} 
                onReset={fetchCalls}
              />
              {loadingMore && (
                <div className="flex items-center justify-center py-4 gap-2 bg-[var(--bg-card)]">
                  <div className="w-4 h-4 border-2 border-[#0494f4]/20 border-t-[#0494f4] rounded-full animate-spin" />
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Loading more calls...</span>
                </div>
              )}
            </React.Fragment>
          </div>
        </div>
      </div>
    </div>
  );
}
