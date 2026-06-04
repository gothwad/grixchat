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
    <div className="flex flex-col bg-[var(--bg-card)]">
      {calls.map((call, index) => {
        const isMissed = call.isMissed;
        return (
          <div 
            key={call.id}
            className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer select-none"
          >
            {/* Avatar Container resembling ChatUserList */}
            <div className="relative shrink-0 select-none">
              <img 
                src={call.avatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                alt={call.user} 
                className="w-[52px] h-[52px] rounded-full object-cover border border-[var(--border-color)]/30 shadow-sm group-hover:scale-105 transition-transform"
                referrerPolicy="no-referrer"
              />
            </div>
            
            {/* Detailed Row matching ChatUserList divider lines perfectly */}
            <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 group-last:border-0 flex items-center justify-between">
              <div className="min-w-0 pr-2">
                <h4 className={`text-[15px] truncate font-bold ${isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                  {call.user}
                </h4>
                
                <div className="flex items-center gap-1.5 mt-1 select-none">
                  {call.isMissed ? (
                    call.isIncoming ? (
                      <ArrowDownLeft size={14} strokeWidth={3} className="text-rose-500 shrink-0" />
                    ) : (
                      <ArrowUpRight size={14} strokeWidth={3} className="text-amber-500 shrink-0" />
                    )
                  ) : call.isIncoming ? (
                    <ArrowDownLeft size={14} strokeWidth={3} className="text-emerald-500 shrink-0" />
                  ) : (
                    <ArrowUpRight size={14} strokeWidth={3} className="text-[#0494f4] shrink-0" />
                  )}
                  
                  <span className="text-xs font-semibold text-[var(--text-secondary)]/80">
                    {call.type === 'video' ? 'Video' : 'Voice'} Call · {call.time}
                  </span>
                </div>
              </div>

              {/* Action Button styled cleanly on the right */}
              <div className="flex items-center gap-2 shrink-0">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(call.otherUserId, call.type === 'video' ? 'video' : 'voice');
                  }}
                  className="w-10 h-10 rounded-full bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-[#0494f4] active:scale-95 transition-all flex items-center justify-center cursor-pointer border-none"
                  title={call.type === 'video' ? "Video Call" : "Voice Call"}
                >
                  {call.type === 'video' ? (
                    <Video size={20} className="stroke-[2.2]" />
                  ) : (
                    <Phone size={19} className="stroke-[2.2]" />
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
