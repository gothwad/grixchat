import React from 'react';
import { 
  ChevronRight,
  Shield,
  Bell,
  Star,
  VolumeX,
  Lock,
  UserMinus,
  HelpCircle,
  LogOut,
  MessageSquare,
  User,
  Sliders,
  ChevronLeft,
  Info as InfoIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { authService } from '../auth/services/authService.ts';

export default function SettingsMainScreen() {
  const { userData } = useAuth();
  const navigate = useNavigate();

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
        { icon: User, label: 'Account Settings', sub: 'Change email, password, delete account', color: 'bg-emerald-500/10 text-emerald-500', onClick: () => navigate('/account-settings') },
        { icon: Lock, label: 'Privacy Settings', sub: userData?.isPrivate ? 'Private Account' : 'Public Account', color: 'bg-indigo-500/10 text-indigo-500', onClick: () => navigate('/privacy-settings') },
        { icon: Shield, label: 'App Lock PIN', sub: 'Enable PIN/Passcode protection', color: 'bg-cyan-500/10 text-cyan-500', onClick: () => navigate('/app-lock') },
      ]
    },
    {
      title: 'App Preferences & Sounds',
      items: [
        { icon: Bell, label: 'Notifications & Sounds', sub: 'Ringtones, Vibrations & Alerts', color: 'bg-amber-500/10 text-amber-500', onClick: () => navigate('/notifications-settings') },
        { icon: MessageSquare, label: 'Chat Customizer & Wallpaper', sub: 'Bubbles shape, text size, wallpapers', color: 'bg-purple-500/10 text-purple-500', onClick: () => navigate('/chat-settings') },
        { icon: Sliders, label: 'System Preferences', sub: 'App theme, network download, local database Backups', color: 'bg-rose-500/10 text-rose-500', onClick: () => navigate('/app-preferences') },
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
        { icon: HelpCircle, label: 'Grixvibe FAQ & Support', sub: 'Knowledgebase and system status', color: 'bg-cyan-500/10 text-cyan-500', onClick: () => navigate('/help') },
        { icon: InfoIcon, label: 'About App', sub: 'Grixvibe V1.2.0 Stable Build', color: 'bg-sky-500/10 text-sky-500', onClick: () => navigate('/app-info') },
      ]
    }
  ];

  return (
    <div className="fixed inset-0 bg-[var(--bg-main)] flex flex-col z-50 animate-fade-in font-sans">
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 h-14 bg-[var(--header-bg)] border-b border-[var(--border-color)] text-[var(--header-text)] shrink-0 shadow-sm rounded-b-2xl">
        <button 
          onClick={() => navigate('/profile')} 
          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full active:scale-90 transition-transform cursor-pointer"
        >
          <ChevronLeft size={22} className="stroke-[2.2]" />
        </button>
        <span className="text-base font-bold tracking-tight">App Settings</span>
      </div>

      {/* Settings list scroll area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4 space-y-5 pb-24">
        {settingsOptions.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-2 text-[10px] font-black text-[#0494f4] uppercase tracking-widest flex items-center gap-2 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0494f4] shadow-sm shadow-[#0494f4]/45"></span>
              {section.title}
            </h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl divide-y divide-[var(--border-color)]/10 overflow-hidden shadow-sm">
              {section.items.map((item) => (
                <button 
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.color || 'bg-[#0494f4]/10 text-[#0494f4]'} group-active:scale-95 transition-transform shrink-0`}>
                    <item.icon size={17} strokeWidth={2.4} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14.5px] font-semibold text-[var(--text-primary)] tracking-wide group-hover:text-[#0494f4] transition-colors">{item.label}</h4>
                    {item.sub && <p className="text-[12.5px] text-[var(--text-secondary)] opacity-75 mt-0.5 truncate font-medium leading-tight">{item.sub}</p>}
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>
        ))}

      </div>
    </div>
  );
}
