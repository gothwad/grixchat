import React from 'react';
import { History, PhoneMissed, Users, LogIn, Video } from 'lucide-react';

export type StatusFilterOption = 'calls' | 'missed' | 'contacts' | 'join' | 'meeting';

interface CallsQuickActionsProps {
  statusFilter: StatusFilterOption;
  onStatusChange: (filter: StatusFilterOption) => void;
  onCreateMeeting: () => void;
}

export const CallsQuickActions: React.FC<CallsQuickActionsProps> = ({
  statusFilter,
  onStatusChange,
  onCreateMeeting,
}) => {
  return (
    <div className="px-4 pt-1 pb-1 bg-[var(--bg-card)] border-b border-[var(--border-color)]/10 z-10 shrink-0 select-none">
      <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
        
        {/* Recents */}
        <div 
          onClick={() => onStatusChange('calls')}
          className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full p-[2.5px] border-2 bg-[var(--bg-card)] flex items-center justify-center shadow-sm transition-all ${
              statusFilter === 'calls' 
                ? 'border-[#0494f4] text-[#0494f4] bg-[#0494f4]/5' 
                : 'border-[var(--border-color)]/30 text-[var(--text-secondary)] hover:border-[#0494f4]/50 hover:text-[#0494f4]'
            }`}>
              <History size={22} className="stroke-[2.2]" />
            </div>
          </div>
          <span className={`text-[10px] font-extrabold mt-1.5 max-w-[65px] truncate transition-colors ${
            statusFilter === 'calls' ? 'text-[#0494f4]' : 'text-[var(--text-secondary)] group-hover:text-[#0494f4]'
          }`}>
            Recents
          </span>
        </div>

        {/* Missed */}
        <div 
          onClick={() => onStatusChange('missed')}
          className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full p-[2.5px] border-2 bg-[var(--bg-card)] flex items-center justify-center shadow-sm transition-all ${
              statusFilter === 'missed' 
                ? 'border-[#0494f4] text-[#0494f4] bg-[#0494f4]/5' 
                : 'border-[var(--border-color)]/30 text-[var(--text-secondary)] hover:border-[#0494f4]/50 hover:text-[#0494f4]'
            }`}>
              <PhoneMissed size={22} className="stroke-[2.2]" />
            </div>
          </div>
          <span className={`text-[10px] font-extrabold mt-1.5 max-w-[65px] truncate transition-colors ${
            statusFilter === 'missed' ? 'text-[#0494f4]' : 'text-[var(--text-secondary)] group-hover:text-[#0494f4]'
          }`}>
            Missed
          </span>
        </div>

        {/* Contacts */}
        <div 
          onClick={() => onStatusChange('contacts')}
          className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full p-[2.5px] border-2 bg-[var(--bg-card)] flex items-center justify-center shadow-sm transition-all ${
              statusFilter === 'contacts' 
                ? 'border-[#0494f4] text-[#0494f4] bg-[#0494f4]/5' 
                : 'border-[var(--border-color)]/30 text-[var(--text-secondary)] hover:border-[#0494f4]/50 hover:text-[#0494f4]'
            }`}>
              <Users size={22} className="stroke-[2.2]" />
            </div>
          </div>
          <span className={`text-[10px] font-extrabold mt-1.5 max-w-[65px] truncate transition-colors ${
            statusFilter === 'contacts' ? 'text-[#0494f4]' : 'text-[var(--text-secondary)] group-hover:text-[#0494f4]'
          }`}>
            Contacts
          </span>
        </div>

        {/* Join */}
        <div 
          onClick={() => onStatusChange('join')}
          className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full p-[2.5px] border-2 bg-[var(--bg-card)] flex items-center justify-center shadow-sm transition-all ${
              statusFilter === 'join' 
                ? 'border-[#0494f4] text-[#0494f4] bg-[#0494f4]/5' 
                : 'border-[var(--border-color)]/30 text-[var(--text-secondary)] hover:border-[#0494f4]/50 hover:text-[#0494f4]'
            }`}>
              <LogIn size={22} className="stroke-[2.2]" />
            </div>
          </div>
          <span className={`text-[10px] font-extrabold mt-1.5 max-w-[65px] truncate transition-colors ${
            statusFilter === 'join' ? 'text-[#0494f4]' : 'text-[var(--text-secondary)] group-hover:text-[#0494f4]'
          }`}>
            Join
          </span>
        </div>

        {/* Meeting */}
        <div 
          onClick={onCreateMeeting}
          className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
        >
          <div className="relative">
            <div className={`w-14 h-14 rounded-full p-[2.5px] border-2 bg-[var(--bg-card)] flex items-center justify-center shadow-sm transition-all ${
              statusFilter === 'meeting' 
                ? 'border-[#0494f4] text-[#0494f4] bg-[#0494f4]/5' 
                : 'border-[var(--border-color)]/30 text-[var(--text-secondary)] hover:border-[#0494f4]/50 hover:text-[#0494f4]'
            }`}>
              <Video size={22} className="stroke-[2.2]" />
            </div>
          </div>
          <span className={`text-[10px] font-extrabold mt-1.5 max-w-[65px] truncate transition-colors ${
            statusFilter === 'meeting' ? 'text-[#0494f4]' : 'text-[var(--text-secondary)] group-hover:text-[#0494f4]'
          }`}>
            Meeting
          </span>
        </div>

      </div>
    </div>
  );
};

export default CallsQuickActions;
