import React, { useEffect, useState } from 'react';
import { 
  Pencil,
  AtSign,
  Info as InfoIcon,
  ChevronRight,
  Shield,
  Bell,
  Clock,
  Star,
  VolumeX,
  Lock,
  UserMinus,
  Smartphone,
  HelpCircle,
  LogOut,
  Check,
  Copy
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { authService } from '../auth/services/authService.ts';

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const userData = authUserData;

  // Use a highly reliable profile image finder
  const profilePic = userData?.photoURL || (userData as any)?.photo_url || authUser?.user_metadata?.avatar_url || DEFAULT_LOGO;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const settingsOptions = [
    {
      title: 'Account & Security',
      items: [
        { icon: Lock, label: 'Privacy & Security', sub: userData?.isPrivate ? 'Private Account' : 'Public Account', color: 'bg-indigo-500/10 text-indigo-500', onClick: () => navigate('/privacy-settings') },
        { icon: Shield, label: 'App Lock', sub: 'Enable PIN/Passcode protection', color: 'bg-emerald-500/10 text-emerald-500', onClick: () => navigate('/app-lock') },
      ]
    },
    {
      title: 'Grix Settings & Sounds',
      items: [
        { icon: Bell, label: 'Notifications & Sounds', sub: 'Ringtones, Vibrations & Alerts', color: 'bg-amber-500/10 text-amber-500', onClick: () => navigate('/notifications-settings') },
        { icon: Smartphone, label: 'Chat Preferences', sub: 'OLED Black, chat wall & cache clean', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/app-preferences') },
        { icon: Clock, label: 'Usage Stats & Time', sub: 'Daily usage log tracker', color: 'bg-teal-500/10 text-teal-500', onClick: () => navigate('/time-spent') },
      ]
    },
    {
      title: 'Privacy & Filters',
      items: [
        { icon: Star, label: 'Favorites Feed', sub: 'Manage star list curation', color: 'bg-yellow-500/10 text-yellow-500', onClick: () => navigate('/favorites') },
        { icon: VolumeX, label: 'Muted Accounts', sub: 'Silenced chat channels', color: 'bg-pink-500/10 text-pink-500', onClick: () => navigate('/muted-accounts') },
        { icon: UserMinus, label: 'Blocked Accounts', sub: 'Banned chat list users', color: 'bg-red-500/10 text-red-500', onClick: () => navigate('/blocked-accounts') },
      ]
    },
    {
      title: 'Help & Info',
      items: [
        { icon: HelpCircle, label: 'GrixChat FAQ & Support', sub: 'Knowledgebase and system status', color: 'bg-cyan-500/10 text-cyan-500', onClick: () => navigate('/help') },
        { icon: InfoIcon, label: 'About App', sub: 'GrixChat V 1.0.0 Stable Build', color: 'bg-sky-500/10 text-sky-500', onClick: () => navigate('/app-info') },
      ]
    }
  ];

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar pb-24 animate-fade-in">
      {/* Beautiful Dynamic Profile Header Section (Unified Mobile Card style) */}
      <div className="px-4 pt-4 mb-4">
        <div 
          onClick={() => navigate('/edit-profile')}
          className="relative bg-[var(--bg-card)] text-[var(--text-primary)] py-4 px-5 border border-[var(--border-color)]/50 rounded-2xl shadow-sm overflow-hidden shrink-0 cursor-pointer hover:bg-[var(--bg-card)]/90 transition-colors"
        >
          {/* Soft elegant ambient flares that work on both light and dark OLED themes */}
          <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-[40px] pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-36 h-36 bg-rose-500/5 rounded-full blur-[30px] pointer-events-none" />

          <div className="relative flex flex-col gap-3">
            {/* Top Row: Avatar on Left, Name and Username on Right */}
            <div className="flex items-center gap-4">
              {/* Solid Avatar Wrapper with Edit Pencil icon overlay */}
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full p-[2.5px] bg-gradient-to-tr from-indigo-500 via-sky-400 to-rose-400 shadow-md transition-transform duration-200 group-hover:scale-[1.03] flex items-center justify-center shrink-0 aspect-square">
                  <div className="w-full h-full rounded-full border-2 border-[var(--bg-card)] overflow-hidden bg-[var(--bg-main)] flex items-center justify-center shrink-0">
                    <img 
                      src={profilePic || DEFAULT_LOGO} 
                      className="w-full h-full rounded-full object-cover shrink-0"
                      referrerPolicy="no-referrer"
                      alt="Profile Avatar"
                    />
                  </div>
                </div>
                {/* Pencil Edit Icon replacing online dot */}
                <span className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-[var(--bg-card)]">
                  <Pencil size={11} strokeWidth={2.5} />
                </span>
              </div>

              {/* Name & Username Column */}
              <div className="flex flex-col min-w-0">
                <h2 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] leading-tight truncate">
                  {userData?.fullName || 'GrixChat User'}
                </h2>
                <span className="text-[11px] text-[var(--text-secondary)] font-mono tracking-wide mt-1 select-none">
                  @{userData?.username || 'user'}
                </span>
              </div>
            </div>

            {/* Bottom column: Bio section */}
            <div className="pt-3 border-t border-[var(--border-color)]/30">
              <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5 font-mono">
                Bio & status
              </span>
              <p className="text-xs text-[var(--text-primary)] leading-relaxed break-words whitespace-pre-line">
                {userData?.bio || 'Tap to describe yourself & write a custom bio.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Account Quick-Info Block (Telegram Account section style) */}
      <div className="px-4 mb-4">
        <h3 className="px-2 mb-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
          Account info
        </h3>
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/50 divide-y divide-[var(--border-color)]/30 overflow-hidden shadow-sm">
          {/* Username item */}
          <div 
            onClick={() => handleCopy(`@${userData?.username || 'username'}`, 'username')}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-main)]/35 active:bg-[var(--bg-main)]/50 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
              <AtSign size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-semibold text-[var(--text-primary)] font-mono">
                @{userData?.username || 'username'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">Username</div>
            </div>
            <div className="opacity-0 group-hover:opacity-40 transition-opacity">
              {copiedField === 'username' ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
            </div>
          </div>

          {/* Biography item */}
          <div 
            onClick={() => navigate('/edit-profile')}
            className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--bg-main)]/35 active:bg-[var(--bg-main)]/50 transition-colors cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
              <InfoIcon size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-medium text-[var(--text-primary)] leading-normal break-words whitespace-pre-line">
                {userData?.bio || 'No bio described yet. Tap to set up a short description.'}
              </div>
              <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 font-medium">Bio & current status</div>
            </div>
            <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-20 group-hover:opacity-45 transition-opacity" />
          </div>
        </div>
      </div>

      {/* Settings list dynamically displayed directly */}
      <div className="px-4 space-y-6">
        {settingsOptions.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
              {section.title}
            </h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl divide-y divide-[var(--border-color)]/30 overflow-hidden shadow-sm">
              {section.items.map((item) => (
                <button 
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[var(--bg-main)]/35 active:bg-[var(--bg-main)]/50 transition-colors group text-left cursor-pointer"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color} group-active:scale-95 transition-transform shrink-0`}>
                    <item.icon size={18} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13.5px] font-bold text-[var(--text-primary)] tracking-wide">{item.label}</h4>
                    {item.sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate font-medium">{item.sub}</p>}
                  </div>
                  <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-40 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Telegram Styled Authentication Section */}
        <div className="space-y-2">
          <h3 className="px-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
            Session
          </h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 hover:bg-red-500/5 transition-colors text-red-500 font-bold text-sm text-left flex justify-between items-center cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={18} />
                <span>Log out of GrixChat</span>
              </div>
              <ChevronRight size={18} className="text-red-500 opacity-20 group-hover:opacity-60 transition-opacity" />
            </button>
          </div>
        </div>

        {/* Unified Branding Footer */}
        <div className="py-8 flex flex-col items-center gap-1 opacity-35 text-center">
          <span className="text-[var(--text-primary)] font-black tracking-[0.15em] uppercase text-[10px]">GrixChat</span>
          <span className="text-[var(--text-secondary)] text-[9px] uppercase tracking-wider font-semibold">Made In India</span>
        </div>
      </div>
    </div>
  );
}
