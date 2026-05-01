import React from 'react';
import { UserMinus, UserPlus } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function BlockedAccountsScreen() {
  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar">
      <SettingHeader title="Blocked" />
      
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
          <UserMinus size={40} className="text-zinc-900" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">No blocked accounts</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-xs">
          When you block someone, they won't be able to find your profile, posts or story on GrixChat.
        </p>
        
        <button className="w-full max-w-xs bg-zinc-900 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl uppercase tracking-widest text-xs">
          <UserPlus size={18} />
          Block someone
        </button>
      </div>
    </div>
  );
}
