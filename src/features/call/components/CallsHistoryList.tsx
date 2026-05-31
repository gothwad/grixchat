import React from 'react';
import { 
  Phone, 
  Video, 
  PhoneMissed, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PhoneCall 
} from 'lucide-react';

interface CallRecord {
  id: string;
  otherUserId: string;
  user: string;
  avatar: string;
  type: string;
  isIncoming: boolean;
  isMissed: boolean;
  time: string;
}

interface CallsHistoryListProps {
  calls: CallRecord[];
  loading: boolean;
  onCall: (userId: string, type: 'voice' | 'video') => void;
  onReset: () => void;
}

export const CallsHistoryList: React.FC<CallsHistoryListProps> = ({
  calls,
  loading,
  onCall,
  onReset
}) => {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-3 border-[#0494f4]/20 border-t-[#0494f4] rounded-full animate-spin" />
        <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
          Loading Records...
        </p>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#0494f4]/10 text-[#0494f4] flex items-center justify-center">
            <PhoneCall size={30} />
          </div>
          <div className="max-w-[240px]">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No call history</h3>
            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
              Log activities, connect with your friends via secure voice & video rooms.
            </p>
          </div>
          <button 
            onClick={onReset}
            className="mt-2 text-xs font-black uppercase tracking-wider bg-[#0494f4] hover:bg-[#0494f4]/90 text-white px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            Refresh Logs
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      {calls.map((call) => (
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
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-[10px]">
              {call.isMissed ? (
                call.isIncoming ? (
                  <>
                    <ArrowDownLeft size={11} className="text-rose-500 shrink-0" />
                    <span className="font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded">Missed Incoming</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={11} className="text-rose-400 shrink-0" />
                    <span className="font-semibold text-rose-400 bg-rose-400/5 px-1.5 py-0.5 rounded">Missed Outgoing</span>
                  </>
                )
              ) : call.isIncoming ? (
                <>
                  <ArrowDownLeft size={11} className="text-emerald-500 shrink-0" />
                  <span className="font-medium text-emerald-500 bg-emerald-500/5 px-1.5 py-0.5 rounded">Incoming</span>
                </>
              ) : (
                <>
                  <ArrowUpRight size={11} className="text-[#0494f4] shrink-0" />
                  <span className="font-medium text-[#0494f4] bg-[#0494f4]/5 px-1.5 py-0.5 rounded">Outgoing</span>
                </>
              )}
              <span className="opacity-60 text-[9px] font-mono shrink-0 ml-1">
                • {call.type === 'video' ? 'Video' : 'Voice'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button 
              onClick={() => onCall(call.otherUserId, 'voice')}
              className="w-9 h-9 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Phone size={14} />
            </button>
            <button 
              onClick={() => onCall(call.otherUserId, 'video')}
              className="w-9 h-9 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
            >
              <Video size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
