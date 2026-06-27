import React from 'react';
import { 
  Phone, 
  Video, 
  PhoneMissed, 
  ArrowDownLeft, 
  ArrowUpRight, 
  PhoneCall
} from 'lucide-react';
import Avatar from '../../../components/common/Avatar';

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
        const AVATAR_COLORS = ['#E17076','#7BC862','#65AADD','#E78A2F','#956FE4','#3CAFE5','#F57244','#49A0E9'];
        const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
        const nameToUse = call.user || 'GrixUser';
        const avatarColor = getAvatarColor(nameToUse);
        const initials = nameToUse[0].toUpperCase();
        const isPlaceholder = !call.avatar || call.avatar.includes('149071.png') || call.avatar.includes('166258.png') || call.avatar.trim() === '';

        return (
          <div 
            key={call.id}
            className="relative flex items-center gap-3 px-3 py-2 min-h-[72px] transition-all duration-205 group cursor-pointer select-none bg-[var(--bg-card)] hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/8"
          >
            {/* Avatar Container */}
            <div className="relative shrink-0 w-[54px] h-[54px]">
              {isPlaceholder ? (
                <div 
                  className="w-full h-full rounded-full flex items-center justify-center text-white text-[22px] font-medium"
                  style={{ backgroundColor: avatarColor }}
                >
                  {initials}
                </div>
              ) : (
                <div className="w-full h-full rounded-full overflow-hidden border border-[var(--border-color)]/20 shadow-sm flex items-center justify-center bg-[var(--border-color)]/5">
                  <img 
                    src={call.avatar} 
                    className="w-full h-full object-cover rounded-full"
                    referrerPolicy="no-referrer"
                    alt={nameToUse}
                  />
                </div>
              )}
            </div>
            
            {/* Detailed Row matching ChatUserList layout */}
            <div className="flex-1 min-w-0 flex items-center justify-between py-0.5">
              <div className="min-w-0 pr-2">
                <h4 className={`text-[16px] truncate font-medium ${isMissed ? 'text-rose-500 font-semibold' : 'text-[var(--text-primary)]'}`}>
                  {call.user}
                </h4>
                
                <div className="flex items-center gap-1.5 mt-0.5 select-none animate-fade-in">
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
                  
                  <span className="text-[15px] text-[var(--text-secondary)] opacity-75 truncate">
                    {call.type === 'video' ? 'Video' : 'Voice'} Call · {call.time}
                  </span>
                </div>
              </div>
 
              {/* Action Button styled cleanly on the right */}
              <div className="flex items-center gap-2 shrink-0 mr-1">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCall(call.otherUserId, call.type === 'video' ? 'video' : 'voice');
                  }}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-transparent text-[#0494f4] hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
                  title={call.type === 'video' ? "Video Call" : "Voice Call"}
                >
                  {call.type === 'video' ? (
                    <Video size={22} className="stroke-[2.2]" />
                  ) : (
                    <Phone size={22} className="stroke-[2.2]" />
                  )}
                </button>
              </div>
            </div>

            {/* Separator Line */}
            <div className="absolute bottom-0 left-[78px] right-0 h-[0.5px] bg-[var(--border-color)]/25 pointer-events-none" />
          </div>
        );
      })}
    </div>
  );
};
