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
    <div className="px-4 space-y-2.5">
      {calls.map((call) => (
        <div 
          key={call.id}
          className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)]/25 px-4 py-3.5 rounded-2xl shadow-sm hover:translate-y-[-1px] hover:shadow-md hover:border-[var(--border-color)]/60 transition-all duration-200 select-none group"
        >
          {/* Avatar Container with scale-up on card hover */}
          <div className="relative shrink-0">
            <img 
              src={call.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
              alt={call.user} 
              className="w-[50px] h-[50px] rounded-full object-cover border border-[var(--border-color)]/40 shrink-0 group-hover:scale-105 transition-transform duration-300"
              referrerPolicy="no-referrer"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h4 className={`text-[14.5px] truncate font-black tracking-tight ${call.isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                {call.user}
              </h4>
              <span className="text-[9.5px] font-mono font-bold text-[var(--text-secondary)]/70">
                {call.time}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              {call.isMissed ? (
                call.isIncoming ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                    <ArrowDownLeft size={10} strokeWidth={3} className="shrink-0" />
                    <span>Missed Incoming</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    <ArrowUpRight size={10} strokeWidth={3} className="shrink-0" />
                    <span>Missed Outgoing</span>
                  </span>
                )
              ) : call.isIncoming ? (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                  <ArrowDownLeft size={10} strokeWidth={3} className="shrink-0" />
                  <span>Incoming</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-[#0494f4] bg-[#0494f4]/15 px-2 py-0.5 rounded-md">
                  <ArrowUpRight size={10} strokeWidth={3} className="shrink-0" />
                  <span>Outgoing</span>
                </span>
              )}
              
              <span className="inline-flex items-center text-[9px] font-bold text-[var(--text-secondary)]/80 bg-[var(--bg-main)] px-2 py-0.5 rounded-md border border-[var(--border-color)]/20 uppercase tracking-widest">
                {call.type === 'video' ? 'Video' : 'Voice'}
              </span>
            </div>
          </div>
          
          {/* Enhanced Action Buttons on Hover */}
          <div className="flex items-center gap-2.5 shrink-0 ml-1">
            <button 
              onClick={() => onCall(call.otherUserId, 'voice')}
              className="w-10 h-10 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
              title="Voice Call"
            >
              <Phone size={15} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => onCall(call.otherUserId, 'video')}
              className="w-10 h-10 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
              title="Video Call"
            >
              <Video size={15} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
