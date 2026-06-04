import React from 'react';
import { LogIn, ArrowLeft, ArrowRight, Info, X } from 'lucide-react';

interface JoinViewProps {
  joinCode: string;
  setJoinCode: (code: string) => void;
  onBack: () => void;
  onJoin: (code: string) => void;
  onNavigateToCreate: () => void;
}

export const JoinView: React.FC<JoinViewProps> = ({
  joinCode,
  setJoinCode,
  onBack,
  onJoin,
  onNavigateToCreate,
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
            Join Meeting
          </h2>
          <p className="text-[10px] font-bold text-[var(--text-secondary)]/90 tracking-wide select-none uppercase">
            Connect with Invite Code
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 bg-[var(--bg-card)]">
        <div className="text-center mb-6 pt-2 select-none">
          <div className="w-16 h-16 rounded-full bg-[#0494f4]/15 text-[#0494f4] flex items-center justify-center mx-auto mb-4 border border-[#0494f4]/20 shadow-inner">
            <LogIn size={28} className="stroke-[2.2]" />
          </div>
          <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight">Join with Link</h3>
          <p className="text-xs font-semibold text-[var(--text-secondary)]/90 max-w-[280px] mx-auto mt-2 leading-relaxed">
            Paste a shared Grix Room link or enter the secure room code to connect to the video feed.
          </p>
        </div>

        <div className="space-y-4 max-w-sm mx-auto">
          <div className="relative flex items-center bg-[var(--bg-main)] border border-[var(--border-color)]/25 focus-within:border-[#0494f4]/80 focus-within:ring-2 focus-within:ring-[#0494f4]/15 rounded-2xl p-0.5 transition-all">
            <input 
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              placeholder="Paste meeting link or enter code..."
              className="w-full h-11 bg-transparent text-xs font-semibold px-4 text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none"
            />
            {joinCode && (
              <button
                type="button"
                onClick={() => setJoinCode('')}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full mr-2 transition-colors cursor-pointer border-none bg-transparent text-[var(--text-secondary)]"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onJoin(joinCode)}
            disabled={!joinCode.trim()}
            className="w-full h-12 bg-[#0494f4] hover:bg-[#0382d6] text-white disabled:opacity-40 disabled:cursor-not-allowed rounded-2xl flex items-center justify-center gap-2 text-xs font-extrabold tracking-wider uppercase cursor-pointer border-none shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
          >
            <span>Join Meeting Room</span>
            <ArrowRight size={15} strokeWidth={2.5} />
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onNavigateToCreate}
              className="text-xs font-bold text-[#0494f4] hover:underline bg-transparent border-none cursor-pointer"
            >
              Or create a new instant meeting
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

export default JoinView;
