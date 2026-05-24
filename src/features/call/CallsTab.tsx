import React, { useState, useEffect } from 'react';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Info, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Link } from 'react-router-dom';

export default function CallsTab() {
  const { user: authUser } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchCalls = async () => {
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
            user: otherUser?.full_name || otherUser?.username || 'Unknown',
            avatar: otherUser?.photo_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
            type: c.type,
            isIncoming: !isCaller,
            isMissed: c.is_missed || false,
            time: c.created_at ? new Date(c.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'
          };
        });
        setCalls(callList);
      }
      setLoading(false);
    };

    fetchCalls();

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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Call List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Calls...</p>
          </div>
        ) : calls.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
            <div className="p-4 bg-[var(--bg-card)] rounded-full text-[var(--text-secondary)]">
              <Phone size={40} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No calls yet</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Your recent calls will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {calls.map((call) => (
              <motion.div 
                key={call.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 px-4 py-4 hover:bg-[var(--bg-card)] transition-all active:scale-[0.98] group"
              >
                <div className="relative">
                  <img 
                    src={call.avatar} 
                    alt={call.user} 
                    className="w-14 h-14 rounded-full object-cover border-2 border-[var(--bg-card)] shadow-sm group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-[15px] truncate font-bold ${call.isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                      {call.user}
                    </h3>
                    <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)]">
                      {call.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[11px]">
                    {call.isMissed ? (
                      <PhoneMissed size={12} className="text-rose-500" />
                    ) : call.isIncoming ? (
                      <ArrowDownLeft size={12} className="text-emerald-500" />
                    ) : (
                      <ArrowUpRight size={12} className="text-[var(--primary)]" />
                    )}
                    <span>{call.isMissed ? 'Missed' : call.isIncoming ? 'Incoming' : 'Outgoing'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-[var(--primary)]">
                  <Link to={`/call/${call.otherUserId}?type=${call.type}`}>
                    {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                  </Link>
                  <button className="text-[var(--text-secondary)]">
                    <Info size={20} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
