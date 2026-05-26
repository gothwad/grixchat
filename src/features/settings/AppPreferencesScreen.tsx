import React, { useState, useRef } from 'react';
import { ArrowLeft, Palette, Check, Image, Trash2, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { ImageService } from '../../services/ImageService';
import { CacheService } from '../../services/CacheService';
import { storage } from '../../services/StorageService';

export default function AppPreferencesScreen() {
  const navigate = useNavigate();
  const { theme, setTheme, chatBackground, setChatBackground } = useTheme();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [clearing, setClearing] = useState(false);

  const themes: { id: Theme; label: string; sub: string }[] = [
    { id: 'system', label: 'System Default', sub: 'Automatically matches your device appearance' },
    { id: 'light', label: 'Light Theme', sub: 'Bright and clean appearance' },
    { id: 'dark', label: 'Dark Theme', sub: 'Deep black for OLED and low light' }
  ];

  const backgrounds = [
    { id: '', label: 'Classic', color: 'bg-zinc-200' },
    { id: 'bg-blue-500/10', label: 'Sky', color: 'bg-blue-500' },
    { id: 'bg-emerald-500/10', label: 'Aurora', color: 'bg-emerald-500' },
    { id: 'bg-rose-500/10', label: 'Rose', color: 'bg-rose-500' },
    { id: 'bg-amber-500/10', label: 'Sunset', color: 'bg-amber-500' },
    { id: 'bg-indigo-500/10', label: 'Indigo', color: 'bg-indigo-500' },
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await ImageService.uploadImage(file);
      setChatBackground(`url(${url})`);
    } catch (error: any) {
      alert(error.message || "Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const handleClearCache = () => {
    setClearing(true);
    setTimeout(() => {
      // Logic for actual cache clearing
      // Clear memory cache and localized storage for users
      storage.removeItem('gx_user_cache');
      // We could also clear media cache if we had one
      setClearing(false);
      alert("Cache cleared successfully!");
    }, 1000);
  };

  const isUrlBackground = chatBackground.startsWith('url(');

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] font-sans overflow-hidden">
      <SettingHeader title="App Preferences" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        {/* Theme Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Appearance</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-8">
          {themes.map((t, index) => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/10 transition-colors ${
                index !== themes.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-zinc-50/10 ${theme === t.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  <Palette size={20} />
                </div>
                <div className="text-left">
                  <h4 className={`text-sm font-bold ${theme === t.id ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                    {t.label}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">{t.sub}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="bg-[var(--primary)] p-1 rounded-full shadow-lg">
                  <Check size={14} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Chat Background Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Chat Background</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] p-6 mb-8">
          <div className="grid grid-cols-3 gap-4">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setChatBackground(bg.id)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all flex items-center justify-center ${
                  chatBackground === bg.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg' : 'border-transparent'
                } ${bg.color} shadow-sm group-active:scale-95`}>
                  {chatBackground === bg.id && <Check size={20} className="text-[var(--primary)]" />}
                </div>
                <span className={`text-[10px] font-bold ${chatBackground === bg.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {bg.label}
                </span>
              </button>
            ))}
            
            {isUrlBackground && (
              <button
                onClick={() => {}}
                className="flex flex-col items-center gap-2 group"
              >
                <div 
                  className={`w-full aspect-[3/4] rounded-xl border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-lg flex items-center justify-center bg-cover bg-center`}
                  style={{ backgroundImage: chatBackground }}
                >
                  <Check size={20} className="text-[var(--primary)] drop-shadow-md" />
                </div>
                <span className="text-[10px] font-bold text-[var(--primary)]">
                  Custom
                </span>
              </button>
            )}
          </div>
          
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileUpload}
          />
          
          <button 
            disabled={uploading}
            className="w-full mt-6 flex items-center justify-center gap-2 py-4 border border-[var(--border-color)] rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-zinc-50/10 transition-colors disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={16} className="animate-spin text-[var(--primary)]" />
            ) : (
              <Image size={16} className="text-[var(--primary)]" />
            )}
            {uploading ? 'Uploading...' : 'Choose from gallery'}
          </button>
        </div>

        {/* Cache & Data */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Cache</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
          <button 
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                {clearing ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Clear Cache</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  {clearing ? 'Cleaning up...' : 'Free up storage space'}
                </p>
              </div>
            </div>
            {!clearing && <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-30" />}
          </button>
        </div>

        {/* Footer Info */}
        <div className="py-12 flex flex-col items-center gap-1 opacity-40">
          <span className="text-[var(--text-primary)] font-black tracking-[0.2em] uppercase text-[10px]">GrixChat V 1.0.0</span>
        </div>
      </div>
    </div>
  );
}
