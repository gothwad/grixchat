import React from 'react';
import { Video, ArrowLeft, ArrowRight, Info, Copy, Check } from 'lucide-react';

interface MeetingViewProps {
  roomCode: string;
  onBack: () => void;
  onCopy: (code: string) => void;
  meetingCopied: boolean;
  onJoin: (code: string) => void;
  onNavigateToJoin: () => void;
}

export const MeetingView: React.FC<MeetingViewProps> = ({
  roomCode,
  onBack,
  onCopy,
  meetingCopied,
  onJoin,
  onNavigateToJoin,
}) => {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-card)]">
      {/* Subheader Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[var(--border-color)]/10 bg-[var(--bg-card)]">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/80 text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-none cursor-pointer transition-all active:scale-95 shrink-0"
        >
          <ArrowLeft size={18} className="stroke-[2.5]" />
        </button>
        <div>
          <h2 className="text-[15px] font-black text-[var(--text-primary)] leading-tight select-none">
            Create Room
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-secondary)]/90 tracking-wide select-none uppercase">
            Instant Video Meeting
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-[var(--bg-card)]">
        <div className="text-center mb-6 pt-2 select-none">
          <div className="w-16 h-16 rounded-full bg-[#0494f4]/15 text-[#0494f4] flex items-center justify-center mx-auto mb-4 border border-[#0494f4]/20 shadow-inner">
            <Video size={28} className="stroke-[2.2]" />
          </div>
          <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight">Instant Meeting</h3>
          <p className="text-xs font-semibold text-[var(--text-secondary)]/90 max-w-[280px] mx-auto mt-2 leading-relaxed">
            Generate a private video conference room. Send the secure invite room code to Grix friends or group rooms.
          </p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          <div className="bg-[var(--bg-main)] border border-[var(--border-color)]/25 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0 flex-1">
              <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5 select-none">SECURE ROOM CODE</span>
              <span className="font-mono text-base font-black text-[var(--text-primary)] tracking-wider">
                {roomCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onCopy(roomCode)}
              className="shrink-0 h-10 px-4 bg-[#0494f4]/10 hover:bg-[#0494f4]/15 text-[#0494f4] rounded-xl flex items-center gap-1.5 text-xs font-black uppercase tracking-wider border-none cursor-pointer transition-colors"
            >
              {meetingCopied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={14} />}
              <span>{meetingCopied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Start Instant Action */}
          <button
            type="button"
            onClick={() => onJoin(roomCode)}
            className="w-full h-12 bg-[#0494f4] hover:bg-[#0382d6] text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold tracking-wider uppercase cursor-pointer border-none shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <span>Start Video Meeting Now</span>
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onNavigateToJoin}
              className="text-xs font-bold text-[#0494f4] hover:underline bg-transparent border-none cursor-pointer"
            >
              Or join an existing meeting
            </button>
          </div>

          {/* Encrypt safe note */}
          <div className="mt-6 flex items-start gap-2.5 bg-[#0494f4]/5 rounded-2xl p-3.5 border border-[#0494f4]/15 select-none">
            <Info size={14} className="text-[#0494f4] shrink-0 mt-0.5" />
            <p className="text-[10px] font-semibold text-[var(--text-secondary)] leading-normal">
              Grix Room connection relies on end-to-end encrypted tunnels. Only users with the invite payload can enter your feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingView;
