import React, { useState, useRef } from 'react';
import { 
  ArrowLeft, 
  Archive, 
  Lock, 
  EyeOff, 
  Palette, 
  Check, 
  Image, 
  Trash2, 
  Loader2, 
  ChevronRight,
  Settings,
  ShieldAlert
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { ImageService } from '../../services/ImageService';
import { storage } from '../../services/StorageService';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function ChatSettingsMainScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { theme, setTheme, chatBackground, setChatBackground } = useTheme();
  const [uploading, setUploading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const archivedCount = userData?.archivedChats?.length || 0;
  const hiddenCount = userData?.hiddenChats?.length || 0;

  const themes: { id: Theme; label: string; sub: string }[] = [
    { id: 'system', label: 'System Default', sub: 'Matches device color settings' },
    { id: 'light', label: 'Light Theme', sub: 'Bright and clean workspace' },
    { id: 'dark', label: 'Dark Theme', sub: 'Deep OLED black for saving battery' }
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
      storage.removeItem('gx_user_cache');
      setClearing(false);
      alert("Local data Cache cleared successfully!");
    }, 800);
  };

  const isUrlBackground = chatBackground.startsWith('url(');

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] font-sans overflow-hidden">
      <SettingHeader title="Chat Settings" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-4 pb-20">
        
        {/* Safe Folders section */}
        <h3 className="px-6 mb-2 text-[11px] font-black text-zinc-400 uppercase tracking-[0.15em]">Privacy Folders</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 divide-y divide-[var(--border-color)]/25 mb-6">
          
          {/* Archived Chats Shortcut */}
          <button 
            onClick={() => navigate('/chats/archived')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <Archive size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Archived Folder</h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {archivedCount > 0 ? `${archivedCount} conversations archived` : 'No archived chat logs'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              {archivedCount > 0 && (
                <span className="text-[10px] bg-indigo-500 text-white font-black px-1.5 py-0.5 rounded-full shrink-0">
                  {archivedCount}
                </span>
              )}
              <ChevronRight size={16} className="opacity-40" />
            </div>
          </button>

          {/* Hidden Chats Shortcut */}
          <button 
            onClick={() => navigate('/chats/hidden')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500">
                <Lock size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Locked Chats</h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">
                  {hiddenCount > 0 ? `${hiddenCount} chats hidden` : 'Access via code or settings'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
              {hiddenCount > 0 && (
                <span className="text-[10px] bg-orange-500 text-white font-black px-1.5 py-0.5 rounded-full shrink-0">
                  {hiddenCount}
                </span>
              )}
              <ChevronRight size={16} className="opacity-40" />
            </div>
          </button>

          {/* Chat Lock Settings */}
          <button 
            onClick={() => navigate('/chats/hidden/settings')}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)]/30 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <EyeOff size={18} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Lock & Secret Code Settings</h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">Configure passcode patterns, visibility</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-40" />
          </button>
        </div>

        {/* Theme Settings Section */}
        <h3 className="px-6 mb-2 text-[11px] font-black text-zinc-400 uppercase tracking-[0.15em]">Appearance</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 mb-6">
          {themes.map((t, index) => (
            <button 
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`w-full flex items-center justify-between px-6 py-3.5 hover:bg-[var(--bg-main)]/30 transition-colors ${
                index !== themes.length - 1 ? 'border-b border-[var(--border-color)]/20' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-xl bg-zinc-500/10 ${theme === t.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  <Palette size={16} />
                </div>
                <div className="text-left">
                  <h4 className={`text-sm font-bold ${theme === t.id ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]'}`}>
                    {t.label}
                  </h4>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium">{t.sub}</p>
                </div>
              </div>
              {theme === t.id && (
                <div className="bg-[var(--primary)] p-1 rounded-full shadow-md">
                  <Check size={12} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Chat Background Customizer */}
        <h3 className="px-6 mb-2 text-[11px] font-black text-zinc-400 uppercase tracking-[0.15em]">Chat Wallpaper</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 p-6 mb-6">
          <div className="grid grid-cols-3 gap-3">
            {backgrounds.map((bg) => (
              <button
                key={bg.id}
                onClick={() => setChatBackground(bg.id)}
                className="flex flex-col items-center gap-1.5 group cursor-pointer"
              >
                <div className={`w-full aspect-[3/4] rounded-xl border-2 transition-all flex items-center justify-center ${
                  chatBackground === bg.id ? 'border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md' : 'border-transparent'
                } ${bg.color} shadow-sm group-active:scale-95`}>
                  {chatBackground === bg.id && <Check size={18} className="text-[var(--primary)]" />}
                </div>
                <span className={`text-[10px] font-bold ${chatBackground === bg.id ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
                  {bg.label}
                </span>
              </button>
            ))}
            
            {isUrlBackground && (
              <div className="flex flex-col items-center gap-1.5">
                <div 
                  className="w-full aspect-[3/4] rounded-xl border-2 border-[var(--primary)] ring-2 ring-[var(--primary)]/20 shadow-md flex items-center justify-center bg-cover bg-center"
                  style={{ backgroundImage: chatBackground }}
                >
                  <Check size={18} className="text-[var(--primary)] drop-shadow-md" />
                </div>
                <span className="text-[10px] font-bold text-[var(--primary)]">Custom</span>
              </div>
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
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 border border-[var(--border-color)]/40 rounded-xl text-xs font-bold text-[var(--text-primary)] hover:bg-zinc-50/10 transition-colors disabled:opacity-50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 size={14} className="animate-spin text-[var(--primary)]" />
            ) : (
              <Image size={14} className="text-[var(--primary)]" />
            )}
            <span>{uploading ? 'Uploading wallpaper...' : 'Set premium wallpaper'}</span>
          </button>
        </div>

        {/* Cache Storage Data */}
        <h3 className="px-6 mb-2 text-[11px] font-black text-zinc-400 uppercase tracking-[0.15em]">Database Storage</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30">
          <button 
            onClick={handleClearCache}
            disabled={clearing}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-[var(--bg-main)] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-red-500/10 text-red-500">
                {clearing ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-red-500">Clear chat data Cache</h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium">Free up local device memory instantly</p>
              </div>
            </div>
            {!clearing && <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-30" />}
          </button>
        </div>

      </div>
    </div>
  );
}
