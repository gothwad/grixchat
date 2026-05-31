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
  HelpCircle,
  LogOut,
  Check,
  Copy,
  MessageSquare,
  User,
  Sliders
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { authService } from '../auth/services/authService.ts';
import { truncateToChars } from '../../utils/bioHelper';

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [hasActiveStories, setHasActiveStories] = useState(false);

  useEffect(() => {
    const checkMyStories = async () => {
      if (!supabase || !authUser?.id) return;
      try {
        const { data } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', authUser.id)
          .limit(1);
        
        if (data && data.length > 0) {
          setHasActiveStories(true);
        }
      } catch (err) {
        console.error('Error fetching user active stories on ProfileTab:', err);
      }
    };
    checkMyStories();
  }, [authUser?.id]);
  
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
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar pb-24 animate-fade-in">
      {/* Beautiful Dynamic Profile Header Section (Centered Telegram Style) */}
      <div className="px-4 pt-4 mb-4">
        <div 
          onClick={() => navigate('/edit-profile')}
          className="relative bg-[var(--bg-card)] text-[var(--text-primary)] py-5 px-4 border border-[var(--border-color)]/50 rounded-2xl shadow-sm shrink-0 cursor-pointer hover:bg-[var(--bg-card)]/90 transition-colors flex flex-col items-center justify-center text-center"
        >
          {/* Centered Avatar Wrapper with Edit Pencil icon overlay and custom ring depending on stories */}
          <div className="relative group shrink-0 mb-3">
            <div className={`w-20 h-20 rounded-full p-[2px] border-2 bg-[var(--bg-main)] flex items-center justify-center shrink-0 ${hasActiveStories ? 'border-[#0494f4]' : 'border-zinc-300 dark:border-zinc-700'}`}>
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-main)]">
                <img 
                  src={profilePic || DEFAULT_LOGO} 
                  className="w-full h-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                  alt="Profile Avatar"
                />
              </div>
            </div>
            {/* Pencil Edit Icon replacing online dot */}
            <span className="absolute bottom-0 right-0 w-6.5 h-6.5 bg-[#0494f4] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--bg-card)] hover:scale-105 active:scale-95 transition-all">
              <Pencil size={11} strokeWidth={2.5} />
            </span>
          </div>

          {/* Name & Username Column */}
          <div className="flex flex-col items-center min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
              {userData?.fullName || 'GrixChat User'}
            </h2>
            <span className="text-[10px] text-[#0494f4] font-semibold font-mono tracking-wide mt-1.5 px-2.5 py-0.5 bg-[#0494f4]/10 rounded-full select-none">
              @{userData?.username || 'user'}
            </span>
          </div>

          {/* Bio & Status section */}
          <div className="mt-3.5 pt-3 border-t border-[var(--border-color)]/30 w-full text-center">
            <span className="text-[8.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5 font-mono opacity-80">
              Bio & status
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-normal max-w-xs mx-auto break-words whitespace-pre-line text-[var(--text-secondary)] font-medium">
              {userData?.bio ? truncateToChars(userData.bio) : 'Tap to describe yourself & write a custom bio.'}
            </p>
          </div>
        </div>
      </div>

      {/* Account Quick-Info Block (Telegram Account section style) */}
      <div className="px-4 mb-4">
        <h3 className="px-2 mb-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
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
        </div>
      </div>

      {/* Settings list dynamically displayed directly */}
      <div className="px-4 space-y-6">
        {settingsOptions.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
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
          <h3 className="px-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
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

      </div>
    </div>
  );
}
