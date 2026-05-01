import React from 'react';
import { Star, Search, UserPlus } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function FavoritesScreen() {
  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar">
      <SettingHeader title="Favorites" />
      
      <div className="p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input 
            type="text" 
            placeholder="Search"
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
        </div>

        <div className="flex flex-col items-center text-center py-10">
          <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
            <Star size={32} className="text-zinc-900" />
          </div>
          <h2 className="text-lg font-black text-[var(--text-primary)] mb-2">No favorites yet</h2>
          <p className="text-xs text-[var(--text-secondary)] mb-8 max-w-xs">
            Posts from your favorites will appear higher in feed. We don't send notifications when you add or remove people.
          </p>
          
          <button className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg active:scale-95 transition-all">
            <UserPlus size={18} />
            Add Favorites
          </button>
        </div>
      </div>
    </div>
  );
}
