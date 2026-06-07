import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Bell, 
  MoreVertical, 
  Settings, 
  UserPlus, 
  Users, 
  Laptop, 
  Star, 
  Archive,
  EyeOff,
  Heart,
  Plus,
  Camera,
  LayoutGrid,
  BarChart2,
  Play,
  Volume2,
  VolumeX,
  Lock,
  PlaySquare,
  Radio,
  MessageCircle,
  Info,
  LogOut
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { ChatTabDropdown } from '../chat-ui/ChatTabDropdown';
import { SearchTabDropdown } from '../chat-ui/SearchTabDropdown';
import { GroupsTabDropdown } from '../chat-ui/GroupsTabDropdown';
import { CallsTabDropdown } from '../chat-ui/CallsTabDropdown';
import { authService } from '../../features/auth/services/authService.ts';

export default function TabHeader() {
  const { userData, user: authUser } = useAuth();
  const { setIsSearchOpen } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasUnreadLikes, setHasUnreadLikes] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleProfileLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchUnread = async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('type, is_read')
        .eq('user_id', authUser.id)
        .eq('is_read', false)
        .limit(20);
      
      if (!error && data) {
        const hasLikes = data.some(d => ["like", "comment"].includes(d.type));
        const hasNotifs = data.some(d => ["follow", "system"].includes(d.type));
        
        setHasUnreadLikes(hasLikes);
        setHasUnreadNotifs(hasNotifs);
      }
    };

    fetchUnread();

    const headerChannelId = `tab-header-notifs:${authUser.id}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(headerChannelId)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${authUser.id}`
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);

  const { chatListFilter, setChatListFilter } = useLayout();

  const menuOptions = [
    { label: 'New group', icon: Users, path: '/new-group?type=group' },
    { label: 'New channel', icon: Radio, path: '/new-group?type=channel' },
    { label: 'Archived', icon: Archive, path: '/chats/archived' },
    ...(userData?.hiddenChatSettings?.showMenuEntry !== false ? [
      { label: 'Hidden chats', icon: EyeOff, path: '/chats/hidden' }
    ] : []),
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const filterOptions = [
    { label: 'All Chats', filter: 'all', icon: MessageCircle },
    { label: 'Private Chats', filter: 'direct', icon: Lock },
    { label: 'Groups Only', filter: 'groups', icon: Users },
    { label: 'Channels Only', filter: 'channels', icon: Radio },
  ] as const;

  const isChatsPage = location.pathname === '/' || location.pathname === '/chats';
  const isGroupsPage = location.pathname === '/groups';
  const isReelsPage = location.pathname === '/reels';
  const isPostsPage = location.pathname === '/posts';
  const isSearchPage = location.pathname === '/search';
  const isProfilePage = location.pathname === '/profile';
  const isCallsPage = location.pathname === '/calls';

  return (
    <div className="w-full px-4 min-h-[56px] flex justify-between items-center z-50 shrink-0 relative">
      <div className="flex items-center">
        <Link to="/chats" className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[var(--header-text)] tracking-tighter">
            GrixChat
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        {/* Heart Icon - Show on Reels */}
        {isReelsPage && (
          <Link to="/notifications/likes" className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group relative">
            <Heart size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" fill={location.pathname === '/notifications/likes' ? "currentColor" : "none"} />
            {hasUnreadLikes && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#0494f4] rounded-full border-2 border-[var(--header-bg)]" />
            )}
          </Link>
        )}

        {/* Bell Icon - Show on Reels */}
        {isReelsPage && (
          <Link to="/notifications" className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group relative">
            <Bell size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
            {hasUnreadNotifs && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-[#0494f4] rounded-full border-2 border-[var(--header-bg)]" />
            )}
          </Link>
        )}

        {/* 3 Dots Menu - Show on Chats, Groups, and Search pages */}
        {(isChatsPage || isGroupsPage || isSearchPage) && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(prev => !prev)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer relative active:scale-95 duration-100"
              id="header-three-dots"
            >
              <MoreVertical size={22} className="text-[var(--header-text)]" />
            </button>
            <AnimatePresence>
              {showMenu && (
                isChatsPage ? (
                  <ChatTabDropdown 
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                    chatListFilter={chatListFilter}
                    setChatListFilter={setChatListFilter}
                    showHiddenChatsEntry={userData?.hiddenChatSettings?.showMenuEntry !== false}
                  />
                ) : isGroupsPage ? (
                  <GroupsTabDropdown 
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                  />
                ) : (
                  <SearchTabDropdown 
                    isOpen={showMenu}
                    onClose={() => setShowMenu(false)}
                  />
                )
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 3 Dots Menu - Show on Calls Tab */}
        {isCallsPage && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(prev => !prev)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer relative active:scale-95 duration-100"
              id="header-three-dots-calls"
            >
              <MoreVertical size={22} className="text-[var(--header-text)]" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <CallsTabDropdown 
                  isOpen={showMenu}
                  onClose={() => setShowMenu(false)}
                />
              )}
            </AnimatePresence>
          </div>
        )}

        {/* 3 Dots Menu - Show on Profile Tab with direct slide-out Logout action */}
        {isProfilePage && (
          <div className="relative flex items-center gap-2" ref={profileMenuRef}>
            <AnimatePresence>
              {showProfileMenu && (
                <motion.button
                  initial={{ opacity: 0, x: 8, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  onClick={handleProfileLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 hover:bg-rose-600 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer select-none"
                  id="btn_header_logout"
                >
                  <LogOut size={13} strokeWidth={2.5} />
                  <span>Logout</span>
                </motion.button>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setShowProfileMenu(prev => !prev)}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors cursor-pointer relative active:scale-95 duration-100"
              id="header-profile-three-dots"
            >
              <MoreVertical size={22} className="text-[var(--header-text)]" />
            </button>
          </div>
        )}

        {/* Settings button is removed from header since it is mixed into the profile tab */}
      </div>
    </div>
  );
}
