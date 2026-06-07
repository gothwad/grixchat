import React, { useEffect, useState, useCallback } from 'react';
import { 
  Pencil,
  Loader2,
  Users,
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
import { CommonSearchBar } from '../../components/common/CommonSearchBar';
import Avatar from '../../components/common/Avatar';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [hasActiveStories, setHasActiveStories] = useState(false);

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

  // Fetch current user active stories presence
  useEffect(() => {
    if (!supabase || !authUser?.id) return;
    const checkActiveStories = async () => {
      try {
        const now = new Date().toISOString();
        const { data } = await supabase
          .from('stories')
          .select('id')
          .eq('user_id', authUser.id)
          .gt('expires_at', now)
          .limit(1);
        setHasActiveStories(!!data && data.length > 0);
      } catch (error) {
        console.error('Error fetching user stories status:', error);
      }
    };
    checkActiveStories();

    const channelId = `profile-tab-stories-realtime-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories', filter: `user_id=eq.${authUser.id}` }, () => {
        checkActiveStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const settingsItems = [
    { icon: Users, label: 'Account Settings', sub: 'Change email, password, delete account', onClick: () => navigate('/account-settings') },
    { icon: Lock, label: 'Privacy Settings', sub: userData?.isPrivate ? 'Private Account' : 'Public Account', onClick: () => navigate('/privacy-settings') },
    { icon: Shield, label: 'App Lock PIN', sub: 'Enable PIN/Passcode protection', onClick: () => navigate('/app-lock') },
    { icon: Bell, label: 'Notifications & Sounds', sub: 'Ringtones, Vibrations & Alerts', onClick: () => navigate('/notifications-settings') },
    { icon: MessageSquare, label: 'Chat Customizer & Wallpaper', sub: 'Bubbles shape, text size, wallpapers', onClick: () => navigate('/chat-settings') },
    { icon: Sliders, label: 'System Preferences', sub: 'App theme, network download, local backups', onClick: () => navigate('/app-preferences') },
    { icon: Star, label: 'Favorites Feed', sub: 'Manage star list curation', onClick: () => navigate('/favorites') },
    { icon: VolumeX, label: 'Muted Accounts', sub: 'Silenced chat channels', onClick: () => navigate('/muted-accounts') },
    { icon: UserMinus, label: 'Blocked Accounts', sub: 'Banned chat list users', onClick: () => navigate('/blocked-accounts') },
    { icon: HelpCircle, label: 'Grixvibe FAQ & Support', sub: 'Knowledgebase and system status', onClick: () => navigate('/help') },
    { icon: InfoIcon, label: 'About App', sub: 'Grixvibe V1.2.0 Stable Build', onClick: () => navigate('/app-info') },
  ];

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const profilePic = userData?.photoURL || (userData as any)?.photo_url || authUser?.user_metadata?.avatar_url || DEFAULT_LOGO;

  const filteredItems = settingsItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sub && item.sub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        {/* Scrollable Reusable Search Bar */}
        <CommonSearchBar 
          placeholder="Search settings..."
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Unified Profile List matching Groups & Calls Tab consistency */}
        <div className="flex flex-col mt-1 divide-y divide-[var(--border-color)]/5 bg-[var(--bg-card)]">
          {searchQuery === '' && (
            <>
              {/* Flat Profile user row matching Chat and Calls list consistency */}
              <div 
                onClick={() => navigate('/edit-profile')}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
              >
                <Avatar 
                  url={profilePic} 
                  type="direct" 
                  name={userData?.fullName || userData?.username || 'GrixChat User'} 
                  isOnline={false} 
                />
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight mb-0.5">
                    {userData?.fullName || 'GrixChat User'}
                  </h3>
                  <p className="text-[13px] truncate leading-snug text-[var(--text-secondary)] opacity-75">
                    @{userData?.username || 'username'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
              </div>

              {/* Flat Polished Bio Sub-row styled exactly like settings item */}
              {userData?.bio && (
                <div 
                  onClick={() => navigate('/edit-profile')}
                  className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]/10 shadow-sm group-hover:scale-[1.02] group-active:scale-95 transition-all duration-150 shrink-0">
                    <InfoIcon size={22} className="stroke-[2.2]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="text-[10px] font-black text-[#0494f4] uppercase tracking-wider block mb-0.5 font-sans opacity-95">
                      Bio
                    </span>
                    <p className="text-[12.5px] text-[var(--text-primary)] leading-normal break-words font-medium italic">
                      "{truncateToChars(userData.bio)}"
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
                </div>
              )}
            </>
          )}

          {/* Integrated App Settings section - styled exactly like standard flat lists */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 select-none px-4">
              <p className="text-[13px] font-bold text-[var(--text-secondary)]">No settings matched your search</p>
              <p className="text-[11px] text-[var(--text-secondary)]/60 max-w-xs">Try searching for app preferences, account, password, sound, block etc.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button 
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]/10 shadow-sm group-hover:scale-[1.02] group-active:scale-95 transition-all duration-150 shrink-0">
                  <item.icon size={22} className="stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-[14.5px] font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">{item.label}</h4>
                  {item.sub && <p className="text-[13px] text-[var(--text-secondary)] font-normal mt-0.5 truncate">{item.sub}</p>}
                </div>
                <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
