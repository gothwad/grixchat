import React from 'react';
import { Check, Search } from 'lucide-react';
import { useTheme, Language } from '../../contexts/ThemeContext';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function LanguageSettingsScreen() {
  const { language, setLanguage } = useTheme();
  
  const languages: { id: Language; label: string; sub: string }[] = [
    { id: 'en-us', label: 'English', sub: 'United States' },
    { id: 'hi-in', label: 'Hindi', sub: 'भारत (India)' },
  ];

  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-y-auto no-scrollbar font-sans">
      <SettingHeader title="App Language" />
      
      <div className="p-4">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden">
          {languages.map((lang, index) => (
            <button 
              key={lang.id}
              onClick={() => setLanguage(lang.id)}
              className={`w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors ${
                index !== languages.length - 1 ? 'border-b border-[var(--border-color)]/30' : ''
              }`}
            >
              <div className="text-left">
                <span className={`text-sm font-bold block ${language === lang.id ? 'text-blue-500' : 'text-[var(--text-primary)]'}`}>
                  {lang.label}
                </span>
                <span className="text-[11px] text-[var(--text-secondary)]">{lang.sub}</span>
              </div>
              {language === lang.id && <Check size={18} className="text-blue-500" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
