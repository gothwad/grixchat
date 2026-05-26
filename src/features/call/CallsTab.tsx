import React, { useState, useEffect } from 'react';
import { 
  Phone, 
  PhoneIncoming, 
  PhoneOutgoing, 
  PhoneMissed, 
  Video, 
  Info, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Link as LinkIcon, 
  Share2, 
  Plus, 
  Search, 
  X, 
  Check, 
  User, 
  PhoneCall
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useNavigate } from 'react-router-dom';

export default function CallsTab() {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showContactsSheet, setShowContactsSheet] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [contactsLoading, setContactsLoading] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [mediaFilter, setMediaFilter] = useState<'voice' | 'video'>('voice');
  const [statusFilter, setStatusFilter] = useState<'incoming' | 'outgoing' | 'missed'>('incoming');

  const fetchCalls = async () => {
    if (!authUser || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('calls')
        .select(`
          *,
          caller:caller_id(username, photo_url, full_name),
          receiver:receiver_id(username, photo_url, full_name)
        `)
        .or(`caller_id.eq.${authUser.id},receiver_id.eq.${authUser.id}`)
        .eq('status', 'ended')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const callList = data.map((c: any) => {
          const isCaller = c.caller_id === authUser.id;
          const otherUser = isCaller ? c.receiver : c.caller;
          
          return {
            id: c.id,
            otherUserId: isCaller ? c.receiver_id : c.caller_id,
            user: otherUser?.full_name || otherUser?.username || 'GrixChat User',
            avatar: otherUser?.photo_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
            type: c.type,
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalls();

    if (!supabase || !authUser) return;

    const channel = supabase
      .channel('calls-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calls',
        filter: `caller_id=eq.${authUser.id}`
      }, () => fetchCalls())
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calls',
        filter: `receiver_id=eq.${authUser.id}`
      }, () => fetchCalls())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser]);

  const handleOpenContacts = async () => {
    setShowContactsSheet(true);
    if (!supabase || !authUserZone()) return;
    setContactsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .limit(25);

      if (!error && data) {
        setContacts(data.filter((u: any) => u.id !== authUser?.id));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setContactsLoading(false);
    }
  };

  // Helper local function to make safe auth checks
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
        console.warn("Failed to copy using clipboard API:", err);
      });
    } else {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  const startCallDirectly = (userId: string, callType: 'voice' | 'video') => {
    setShowContactsSheet(false);
    navigate(`/call/${userId}?type=${callType}`);
  };

  const filteredContacts = contacts.filter(c => 
    (c.fullName || c.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCalls = calls.filter(call => {
    // 1. Media Filter (Audio / Video)
    if (mediaFilter === 'voice' && call.type !== 'voice') return false;
    if (mediaFilter === 'video' && call.type !== 'video') return false;

    // 2. Status Filter (Incoming / Outgoing / Missed)
    if (statusFilter === 'incoming') {
      if (!call.isIncoming || call.isMissed) return false;
    }
    if (statusFilter === 'outgoing') {
      if (call.isIncoming) return false;
    }
    if (statusFilter === 'missed') {
      if (!call.isMissed) return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans relative">
      
      {/* Scrollable Container with All Call Components */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        
        {/* Dual Switch Filter ABOVE Create Link */}
        <div className="px-4 pt-4 pb-1 shrink-0">
          <div className="flex bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-color)]/25">
            <button
              onClick={() => {
                setMediaFilter('voice');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                mediaFilter === 'voice'
                  ? 'bg-[var(--bg-main)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              AUDIO
            </button>
            <button
              onClick={() => {
                setMediaFilter('video');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                mediaFilter === 'video'
                  ? 'bg-[var(--bg-main)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              VIDEO
            </button>
          </div>
        </div>

        {/* Create Call Link Header - WhatsApp Style */}
        <div className="px-4 pt-2 pb-2">
          <div 
            onClick={handleCopyCallLink}
            className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)]/50 p-4 rounded-2xl hover:bg-[var(--bg-card)]/90 transition-all cursor-pointer shadow-sm group active:scale-[0.99]"
          >
            <div className="w-11 h-11 rounded-full bg-indigo-600/10 text-indigo-500 flex items-center justify-center shrink-0">
              <LinkIcon size={20} className="transform rotate-45" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-black text-[var(--text-primary)]">Create call link</h4>
              <p className="text-[11px] text-[var(--text-secondary)] truncate">
                {linkCopied ? 'Link copied successfully!' : 'Share a custom link for your Grix call'}
              </p>
            </div>
            <div className="shrink-0 text-[10px] uppercase font-bold text-indigo-500 bg-indigo-500/10 rounded-lg px-2.5 py-1.5 flex items-center gap-1">
              {linkCopied ? <Check size={11} strokeWidth={2.5} /> : <Share2 size={11} />}
              <span>{linkCopied ? 'Copied' : 'Share'}</span>
            </div>
          </div>
        </div>

        {/* Consistent 3-Way Switch Filter BELOW Create Link */}
        <div className="px-4 py-2 shrink-0">
          <div className="flex bg-[var(--bg-card)] rounded-xl p-1 border border-[var(--border-color)]/25">
            <button
              onClick={() => setStatusFilter('incoming')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                statusFilter === 'incoming'
                  ? 'bg-[var(--bg-main)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              INCOMING
            </button>
            <button
              onClick={() => setStatusFilter('outgoing')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                statusFilter === 'outgoing'
                  ? 'bg-[var(--bg-main)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              OUTGOING
            </button>
            <button
              onClick={() => setStatusFilter('missed')}
              className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                statusFilter === 'missed'
                  ? 'bg-[var(--bg-main)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              MISSED
            </button>
          </div>
        </div>

        {/* Section title for recent logs */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between select-none">
          <span className="text-xs font-black text-[var(--text-secondary)] tracking-tight">
            History Logs
          </span>
          {calls.length > 0 && (
            <span className="text-[10px] font-black text-[var(--text-secondary)] opacity-60">
              {filteredCalls.length} logs
            </span>
          )}
        </div>

        {/* Call Log List or Placeholder */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">Loading Records...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="px-4 py-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <PhoneCall size={30} />
              </div>
              <div className="max-w-[240px]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No call history</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Connect with your friends via high-fidelity, peer-to-peer secure voice and video rooms.
                </p>
              </div>
              <button 
                onClick={handleOpenContacts}
                className="mt-2 text-xs font-black uppercase tracking-wider bg-indigo-600 hover:bg-indigo-550 text-white px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Call Someone
              </button>
            </div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="px-4 py-6">
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center animate-pulse">
                <PhoneCall size={30} />
              </div>
              <div className="max-w-[240px]">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No matching calls</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  No call logs found matching your active filter configuration.
                </p>
              </div>
              <button 
                onClick={() => {
                  setMediaFilter('voice');
                  setStatusFilter('incoming');
                }}
                className="mt-2 text-xs font-black uppercase tracking-wider bg-indigo-650 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 space-y-2">
            {filteredCalls.map((call) => (
              <div 
                key={call.id}
                className="flex items-center gap-3.5 bg-[var(--bg-card)] border border-[var(--border-color)]/30 px-4 py-3.5 rounded-2xl shadow-sm hover:bg-[var(--bg-card)]/80 transition-all select-none group"
              >
                <img 
                  src={call.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                  alt={call.user} 
                  className="w-11 h-11 rounded-full object-cover border border-[var(--border-color)]/50 shrink-0"
                  referrerPolicy="no-referrer"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h4 className={`text-sm truncate font-black ${call.isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                      {call.user}
                    </h4>
                    <span className="text-[9px] font-mono text-[var(--text-secondary)]">
                      {call.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[10px]">
                    {call.isMissed ? (
                      <PhoneMissed size={11} className="text-rose-500 shrink-0" />
                    ) : call.isIncoming ? (
                      <ArrowDownLeft size={11} className="text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowUpRight size={11} className="text-indigo-500 shrink-0" />
                    )}
                    <span className="font-medium">{call.isMissed ? 'Missed' : call.isIncoming ? 'Incoming' : 'Outgoing'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => startCallDirectly(call.otherUserId, 'voice')}
                    className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Phone size={15} />
                  </button>
                  <button 
                    onClick={() => startCallDirectly(call.otherUserId, 'video')}
                    className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <Video size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Active Contacts Sheet for launching voice/video calls */}
      <AnimatePresence>
        {showContactsSheet && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContactsSheet(false)}
              className="absolute inset-0 bg-black"
            />

            {/* Sliding Panel */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-h-[85%] bg-[var(--bg-main)] border-t border-[var(--border-color)]/60 rounded-t-[2.5rem] flex flex-col shadow-2xl overflow-hidden font-sans z-10"
            >
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-1 bg-[var(--border-color)]/80 rounded-full" />
              
              {/* Contacts Header */}
              <div className="px-5 pt-8 pb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[var(--text-primary)]">Select Contact</h3>
                  <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider mt-0.5">Start secure video / audio call</p>
                </div>
                <button 
                  onClick={() => setShowContactsSheet(false)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center justify-center cursor-pointer border border-[var(--border-color)]/40"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Dynamic Search Box */}
              <div className="px-4 pb-4">
                <div className="relative flex items-center">
                  <Search size={16} className="absolute left-3.5 text-[var(--text-secondary)] pointer-events-none" />
                  <input 
                    type="text" 
                    placeholder="Search name or username..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-xl text-sm text-[var(--text-primary)] outline-none focus:border-indigo-500/80 transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Contacts Sheet List */}
              <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8 space-y-2 min-h-[300px]">
                {contactsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-3">
                    <div className="w-7 h-7 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                    <p className="text-[9px] font-mono tracking-wider text-[var(--text-secondary)] uppercase">Fetching Active Channels...</p>
                  </div>
                ) : filteredContacts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center select-none">
                    <User size={28} className="text-[var(--text-secondary)]/50 mb-2" />
                    <p className="text-xs font-bold text-[var(--text-secondary)]">No active contacts found</p>
                    <p className="text-[10px] text-[var(--text-secondary)]/80 mt-0.5">Invite teammates or search generic usernames.</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => (
                    <div 
                      key={contact.id}
                      className="flex items-center gap-3.5 bg-[var(--bg-card)] border border-[var(--border-color)]/30 p-3.5 rounded-2xl hover:bg-[var(--bg-card)]/90 transition-colors"
                    >
                      <img 
                        src={contact.photo_url || contact.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                        alt={contact.username} 
                        className="w-11 h-11 rounded-full object-cover border border-[var(--border-color)]/50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-black text-[var(--text-primary)] truncate">
                          {contact.full_name || contact.fullName || contact.username}
                        </h4>
                        <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
                          @{contact.username}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => startCallDirectly(contact.id, 'voice')}
                          className="w-9 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-550 text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Phone size={15} />
                        </button>
                        <button 
                          onClick={() => startCallDirectly(contact.id, 'video')}
                          className="w-9 h-9 rounded-xl bg-rose-500 hover:bg-rose-450 text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                        >
                          <Video size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
