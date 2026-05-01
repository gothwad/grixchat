import React, { useState } from 'react';
import { Accessibility, ChevronRight } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function AccessibilitySettingsScreen() {
  const [options, setOptions] = useState({
    captions: true,
    highContrast: false,
    reduceMotion: false,
  });

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar">
      <SettingHeader title="Accessibility" />
      
      <div className="p-4 space-y-6">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-color)]/30">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Vision</h4>
          </div>
          
          <button 
            onClick={() => toggleOption('captions')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors"
          >
            <div className="text-left">
              <h5 className="text-sm font-bold text-[var(--text-primary)]">Video Captions</h5>
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Show captions on videos</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${options.captions ? 'bg-blue-500' : 'bg-zinc-300'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${options.captions ? 'right-1' : 'left-1'}`} />
            </div>
          </button>

          <button 
            onClick={() => toggleOption('highContrast')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors border-t border-[var(--border-color)]/30"
          >
            <div className="text-left">
              <h5 className="text-sm font-bold text-[var(--text-primary)]">High Contrast</h5>
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Increase text contrast</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${options.highContrast ? 'bg-blue-500' : 'bg-zinc-300'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${options.highContrast ? 'right-1' : 'left-1'}`} />
            </div>
          </button>
        </div>

        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border-color)]/30">
            <h4 className="text-sm font-bold text-[var(--text-primary)]">Motion</h4>
          </div>
          
          <button 
            onClick={() => toggleOption('reduceMotion')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors"
          >
            <div className="text-left">
              <h5 className="text-sm font-bold text-[var(--text-primary)]">Reduce Motion</h5>
              <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Minimize animations</p>
            </div>
            <div className={`w-10 h-5 rounded-full transition-colors relative ${options.reduceMotion ? 'bg-blue-500' : 'bg-zinc-300'}`}>
              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${options.reduceMotion ? 'right-1' : 'left-1'}`} />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
