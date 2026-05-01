import React from 'react';
import { Clock, Calendar, Bell, ChevronRight } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function TimeSpentScreen() {
  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar">
      <SettingHeader title="Time spent" />
      
      <div className="p-6 flex flex-col items-center text-center">
        <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
          <Clock size={40} className="text-zinc-900" />
        </div>
        <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">Manage your time</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-8">
          See how much time you spend on GrixChat and set limits to help you manage it.
        </p>

        <div className="w-full space-y-4">
          <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar size={20} className="text-zinc-900" />
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Daily limit</h4>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Off</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-30" />
          </div>

          <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell size={20} className="text-zinc-900" />
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Reminders</h4>
                <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Take a break</p>
              </div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-30" />
          </div>
        </div>

        <div className="mt-12 w-full">
          <h3 className="text-left text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4">Activity</h3>
          <div className="bg-[var(--bg-card)] rounded-2xl p-6 border border-[var(--border-color)] h-48 flex items-end justify-between gap-2">
            {[40, 60, 30, 80, 50, 90, 20].map((height, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div 
                  className="w-full bg-blue-500 rounded-t-lg" 
                  style={{ height: `${height}%` }}
                />
                <span className="text-[8px] font-bold text-[var(--text-secondary)]">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'][i]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] mt-4 text-center font-bold uppercase tracking-widest">
            Average: 45m per day
          </p>
        </div>
      </div>
    </div>
  );
}
