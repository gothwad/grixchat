import React from 'react';
import { VolumeX, UserPlus } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function MutedAccountsScreen() {
  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar">
      <SettingHeader title="Muted accounts" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <VolumeX size={40} className="text-zinc-900" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">No muted accounts</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-xs">
          When you mute someone, you won't see their posts or stories in your feed. They won't know you've muted them.
        </p>
      </div>
    </div>
  );
}
