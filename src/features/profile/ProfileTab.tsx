import React, { useEffect, useState, useCallback } from 'react';
import { 
  Pencil,
  Loader2,
  Users,
  Search,
  X,
  Plus,
  Check,
  Clock,
  MessageSquare,
  Shield,
  Bell,
  Star,
  VolumeX,
  Lock,
  UserMinus,
  HelpCircle,
  LogOut,
  Sliders,
  ChevronRight,
  Info as InfoIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { truncateToChars } from '../../utils/bioHelper';
import { supabase } from '../../lib/supabase';
import { AnimatePresence, motion } from 'motion/react';
import { isUserOnline } from '../../utils/presence';
import { chatService } from '../chat/services/chatService';
import { acceptChat } from '../../utils/acceptedChats';
import { authService } from '../auth/services/authService.ts';

interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline?: boolean;
}

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const navigate = useNavigate();
  const userData = authUserData;
  
  const [friendsCount, setFriendsCount] = useState(0);

  // Fetch only friends count
  const fetchFriendsCount = useCallback(async () => {
    if (!supabase || !authUser?.id) return;
    try {
      const { data: followRows } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .or(`follower_id.eq.${authUser.id},following_id.eq.${authUser.id}`);

      const IFollow = new Set<string>();
      const FollowsMe = new Set<string>();

      followRows?.forEach(row => {
        if (row.follower_id === authUser.id) {
          IFollow.add(row.following_id);
        }
        if (row.following_id === authUser.id) {
          FollowsMe.add(row.follower_id);
        }
      });

      const friendIds = Array.from(IFollow);
      const mutualCount = friendIds.filter(id => FollowsMe.has(id)).length;
      setFriendsCount(mutualCount);
    } catch (error) {
      console.error('Error fetching friends count:', error);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchFriendsCount();

    if (!supabase || !authUser?.id) return;
    const channelId = `profile-tab-friends-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
        fetchFriendsCount();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id, fetchFriendsCount]);

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
        { icon: Users, label: 'Account Settings', sub: 'Change email, password, delete account', onClick: () => navigate('/account-settings') },
        { icon: Lock, label: 'Privacy Settings', sub: userData?.isPrivate ? 'Private Account' : 'Public Account', onClick: () => navigate('/privacy-settings') },
        { icon: Shield, label: 'App Lock PIN', sub: 'Enable PIN/Passcode protection', onClick: () => navigate('/app-lock') },
      ]
    },
    {
      title: 'Preferences & Sounds',
      items: [
        { icon: Bell, label: 'Notifications & Sounds', sub: 'Ringtones, Vibrations & Alerts', onClick: () => navigate('/notifications-settings') },
        { icon: MessageSquare, label: 'Chat Customizer & Wallpaper', sub: 'Bubbles shape, text size, wallpapers', onClick: () => navigate('/chat-settings') },
        { icon: Sliders, label: 'System Preferences', sub: 'App theme, network download, local backups', onClick: () => navigate('/app-preferences') },
      ]
    },
    {
      title: 'Privacy & Filters',
      items: [
        { icon: Star, label: 'Favorites Feed', sub: 'Manage star list curation', onClick: () => navigate('/favorites') },
        { icon: VolumeX, label: 'Muted Accounts', sub: 'Silenced chat channels', onClick: () => navigate('/muted-accounts') },
        { icon: UserMinus, label: 'Blocked Accounts', sub: 'Banned chat list users', onClick: () => navigate('/blocked-accounts') },
      ]
    },
    {
      title: 'Help & Information',
      items: [
        { icon: HelpCircle, label: 'Grixvibe FAQ & Support', sub: 'Knowledgebase and system status', onClick: () => navigate('/help') },
        { icon: InfoIcon, label: 'About App', sub: 'Grixvibe V1.2.0 Stable Build', onClick: () => navigate('/app-info') },
      ]
    }
  ];

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const profilePic = userData?.photoURL || (userData as any)?.photo_url || authUser?.user_metadata?.avatar_url || DEFAULT_LOGO;

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar pb-32 animate-fade-in animate-once touch-pan-y overscroll-contain">
      {/* Beautiful Profile Header Section */}
      <div className="px-4 pt-4 mb-3">
        <div 
          onClick={() => navigate('/edit-profile')}
          className="relative bg-[var(--bg-card)] text-[var(--text-primary)] py-5 px-4 border border-[var(--border-color)]/50 rounded-2xl shadow-sm shrink-0 cursor-pointer hover:bg-[var(--bg-card)]/90 transition-colors flex flex-col items-center justify-center text-center"
        >
          {/* Centered Avatar Wrapper with Edit Pencil icon overlay */}
          <div className="relative group shrink-0 mb-3">
            <div className="w-20 h-20 rounded-full p-[2px] border-2 border-zinc-200 dark:border-zinc-800 bg-[var(--bg-main)] flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-main)]">
                <img 
                  src={profilePic || DEFAULT_LOGO} 
                  className="w-full h-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                  alt="Profile Avatar"
                />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-6.5 h-6.5 bg-[#0494f4] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--bg-card)] hover:scale-105 active:scale-95 transition-all">
              <Pencil size={11} strokeWidth={2.5} />
            </span>
          </div>

          {/* Name & Username Column */}
          <div className="flex flex-col items-center min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
              {userData?.fullName || 'GrixChat User'}
            </h2>
            <span className="text-[10px] text-[#0494f4] font-semibold font-mono tracking-wide mt-1.5 px-2.5 py-0.5 bg-[#0494f4]/15 rounded-full select-none">
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

      {/* Friends Count Block (Centered and Sleek) */}
      <div className="px-4 mb-5">
        <div 
          onClick={() => navigate('/profile/friends')}
          className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/50 overflow-hidden shadow-sm py-3 px-4 flex justify-between items-center cursor-pointer hover:bg-[var(--bg-card)]/90 transition-all select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0494f4]/10 rounded-xl text-[#0494f4]">
              <Users size={18} />
            </div>
            <div>
              <h4 className="text-sm font-black text-[var(--text-primary)]">My Friends</h4>
              <p className="text-[10px] text-[var(--text-secondary)]">Interact with mutual contacts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-[#0494f4] bg-[#0494f4]/10 px-3 py-1 rounded-xl">
              {friendsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Integrated App Settings section */}
      <div className="px-4 pb-6 space-y-5">
        {settingsOptions.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] flex items-center gap-1.5 select-none opacity-85">
              <span className="w-1.5 h-1.5 rounded-full bg-[#0494f4]"></span>
              {section.title}
            </h3>
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl divide-y divide-[var(--border-color)]/30 overflow-hidden shadow-sm">
              {section.items.map((item) => (
                <button 
                  key={item.label}
                  onClick={item.onClick}
                  className="w-full flex items-center gap-3.5 px-4.5 py-3.5 hover:bg-[var(--bg-main)]/40 active:bg-[var(--bg-main)]/60 transition-colors group text-left cursor-pointer"
                >
                  <div className="w-8.5 h-8.5 rounded-xl flex items-center justify-center bg-[#0494f4]/10 text-[#0494f4] group-active:scale-95 transition-transform shrink-0">
                    <item.icon size={17} strokeWidth={2.2} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-extrabold text-[var(--text-primary)] tracking-wide group-hover:text-[#0494f4] transition-colors">{item.label}</h4>
                    {item.sub && <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate font-medium">{item.sub}</p>}
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200" />
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Live Session Logout Block */}
        <div className="space-y-2 pt-1.5">
          <h3 className="px-2 text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] select-none opacity-85">
            Active Session
          </h3>
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl overflow-hidden shadow-sm">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-rose-500/5 hover:text-rose-600 transition-colors text-rose-500 font-extrabold text-xs text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <LogOut size={16} strokeWidth={2.5} />
                <span>Log out of GrixChat</span>
              </div>
              <ChevronRight size={16} className="text-rose-500 opacity-20 group-hover:opacity-80 group-hover:translate-x-0.5 transition-all duration-200" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
