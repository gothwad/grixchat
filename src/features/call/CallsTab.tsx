import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  Share2, 
  Check
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { CallsHistoryList } from './components/CallsHistoryList';
import { CallsContactsList } from './components/CallsContactsList';

export default function CallsTab() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<any[]>([]);
  const [callsLoading, setCallsLoading] = useState(true);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'calls' | 'contacts'>('calls');

  const fetchCalls = async () => {
    if (!authUser || !supabase) return;
    try {
      setCallsLoading(true);
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:caller_id(username, photo_url, full_name),
          receiver:receiver_id(username, photo_url, full_name)
        `)
        .or(`caller_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .order('created_at', { ascending: false })
        .limit(60);

      if (!error && data) {
        const callList = data.map((c: any) => {
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
      }
    } catch (e) {
      console.error("Error fetching calls:", e);
    } finally {
      setCallsLoading(false);
    }
  };

  const fetchContacts = async () => {
    if (!authUserZone() || !supabase) return;
    try {
      setContactsLoading(true);
      
      // Get following/follower IDs directly representing mutual friend links
      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .or(`follower_id.eq.${authUser?.id},following_id.eq.${authUser?.id}`);
      
      if (followError) throw followError;

      const IFollow = new Set<string>();
      const FollowsMe = new Set<string>();

      followRows?.forEach((row: any) => {
        if (row.follower_id === authUser?.id) {
          IFollow.add(row.following_id);
        }
        if (row.following_id === authUser?.id) {
          FollowsMe.add(row.follower_id);
        }
      });

      const mutualIds = Array.from(IFollow).filter(id => FollowsMe.has(id));
      
      if (mutualIds.length > 0) {
        const { data: friendsData, error: friendsError } = await supabase
          .from('users')
          .select('id, username, full_name, photo_url, is_online, last_seen')
          .in('id', mutualIds)
          .limit(100);
        
        if (friendsError) throw friendsError;

        if (friendsData) {
          const formatted = friendsData.map(f => {
            const lastSeen = f.last_seen;
            const isOnline = !!(f.is_online && lastSeen && (new Date().getTime() - new Date(lastSeen).getTime()) < 65000);
            return {
              id: f.id,
              username: f.username,
              fullName: f.full_name || f.username,
              photoURL: f.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              isOnline
            };
          });
          setContacts(formatted);
        }
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error('Error fetching friends contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();
    fetchContacts();

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
  }, [authUser]);

  // Handle live contact refreshing when user switches to contact tab
  useEffect(() => {
    if (statusFilter === 'contacts') {
      fetchContacts();
    }
  }, [statusFilter]);

  const authUserZone = () => {
    return authUser && authUser.id;
  };

  const handleCopyCallLink = () => {
    const randomId = Math.random().toString(36).substring(2, 10);
    const mockLink = `https://grixchat.com/call-link/${randomId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mockLink).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      }).catch(err => {
        console.warn("Failed to copy clipboard:", err);
      });
    } else {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const startCallDirectly = (userId: string, callType: 'voice' | 'video') => {
    navigate(`/call/${userId}?type=${callType}`);
  };

  // Status Filters computation
  // 'calls' covers all standard incoming/outgoing and missed calls seamlessly
  const getFilteredCalls = () => {
    return calls;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans relative">
      
      {/* Scrollable Container with All Call Components */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* 2-Tab Switch Filter at the absolute top */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <div className="flex bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-color)]/25">
            <button
              onClick={() => setStatusFilter('calls')}
              className={`flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                statusFilter === 'calls'
                  ? 'bg-[#0494f4] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              CALLS
            </button>
            <button
              onClick={() => setStatusFilter('contacts')}
              className={`flex-1 py-2 text-[10.5px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                statusFilter === 'contacts'
                  ? 'bg-[#0494f4] text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              CONTACTS
            </button>
          </div>
        </div>

        {/* Create Call Link Header */}
        <div className="px-4 py-2">
          <div 
            onClick={handleCopyCallLink}
            className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)]/50 p-4 rounded-2xl hover:bg-[var(--bg-card)]/90 transition-all cursor-pointer shadow-sm group active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-full bg-[#0494f4]/10 text-[#0494f4] flex items-center justify-center shrink-0">
              <LinkIcon size={20} className="transform rotate-45" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-[var(--text-primary)]">Create call link</h4>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {linkCopied ? 'Link copied successfully!' : 'Share a custom link for your Grix call'}
              </p>
            </div>
            <div className="shrink-0 text-[10px] uppercase font-bold text-[#0494f4] bg-[#0494f4]/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
              {linkCopied ? <Check size={11} strokeWidth={2.5} /> : <Share2 size={11} />}
              <span>{linkCopied ? 'Copied' : 'Share'}</span>
            </div>
          </div>
        </div>

        {/* Section rendering segment */}
        <div className="mt-2">
          {statusFilter === 'contacts' ? (
            <CallsContactsList 
              contacts={contacts} 
              loading={contactsLoading} 
              onCall={startCallDirectly} 
            />
          ) : (
            <CallsHistoryList 
              calls={getFilteredCalls()} 
              loading={callsLoading} 
              onCall={startCallDirectly} 
              onReset={fetchCalls}
            />
          )}
        </div>
      </div>
    </div>
  );
}
