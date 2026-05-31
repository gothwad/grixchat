import React from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import PreferencesSubscreen from './components/PreferencesSubscreen.tsx';

export default function AppPreferencesScreen() {
  const { 
    theme, 
    setTheme 
  } = useTheme();

  const themes: { id: Theme; label: string; sub: string }[] = [
    { id: 'system', label: 'System Default', sub: 'Automatically matches your device appearance' },
    { id: 'light', label: 'Light Theme', sub: 'Bright and clean workspace' },
    { id: 'dark', label: 'Dark Theme', sub: 'Deep black for saving battery power' }
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] font-sans overflow-hidden">
      <SettingHeader title="App Preferences" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-6 pb-24">
        {/* System Appearance */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em]">System Appearance</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 mb-6">
          {themes.map((t, index) => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)]/30 transition-colors cursor-pointer ${
                index !== themes.length - 1 ? 'border-b border-[var(--border-color)]/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl transition-colors bg-zinc-500/10 ${theme === t.id ? 'text-[#0494f4]' : 'text-[var(--text-secondary)]'}`}>
                  <Palette size={18} />
                </div>
                <div className="text-left">
                  <h4 className={`text-sm font-bold ${theme === t.id ? 'text-[#0494f4]' : 'text-[var(--text-primary)]'}`}>
                    {t.label}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">{t.sub}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="bg-[#0494f4] p-1 rounded-full shadow-md">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Detailed Preferences: Timeouts, Sounds, and Backup Actions */}
        <PreferencesSubscreen />

        {/* Footer Info */}
        <div className="py-8 flex flex-col items-center gap-1 opacity-25">
          <span className="text-[var(--text-primary)] font-black tracking-[0.2em] uppercase text-[9px]">Grixvibe Ledger V 1.2</span>
        </div>
      </div>
    </div>
  );
}
