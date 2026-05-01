import React, { useState, useRef, useEffect } from 'react';
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
  PlaySquare
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { useAuth } from '../../providers/AuthProvider.tsx';

export default function TabHeader() {
  const { userData } = useAuth();
  const { setIsSearchOpen } = useSearch();
  const location = useLocation();
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasUnreadLikes, setHasUnreadLikes] = useState(false);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen for unread activity (likes/comments)
    const likesQuery = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid),
      where("read", "==", false),
      limit(20) // Small limit to keep costs down but enough to differentiate
    );

    const unsubscribe = onSnapshot(likesQuery, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      const hasLikes = docs.some(d => ["like", "comment"].includes(d.type));
      const hasNotifs = docs.some(d => ["follow", "system"].includes(d.type));
      
      setHasUnreadLikes(hasLikes);
      setHasUnreadNotifs(hasNotifs);
    });

    return () => unsubscribe();
  }, []);

  const menuOptions = [
    { label: 'New group', icon: Users },
    { label: 'New broadcast', icon: UserPlus },
    { label: 'Linked devices', icon: Laptop },
    { label: 'Starred messages', icon: Star },
    { label: 'Archived', icon: Archive, path: '/chats/archived' },
    { label: 'GrixHub', icon: LayoutGrid, path: '/hub' },
    ...(userData?.hiddenChatSettings?.showMenuEntry !== false ? [
      { label: 'Hidden chats', icon: EyeOff, path: '/chats/hidden' }
    ] : []),
    { label: 'Settings', icon: Settings, path: '/settings' },
  ];

  const isHomePage = location.pathname === '/';
  const isChatsPage = location.pathname === '/chats';
  const isHubPage = location.pathname === '/hub';
  const isReelsPage = location.pathname === '/reels';
  const isTubePage = location.pathname === '/reels/grixtube';
  const isProfilePage = location.pathname === '/profile';

  return (
    <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex justify-between items-center z-50 shrink-0 relative border-b border-[var(--border-color)] shadow-sm rounded-b-2xl">
      <div className="flex items-center">
        <Link to="/" className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-[var(--header-text)] tracking-tighter italic">
            GrixChat
          </h1>
        </Link>
      </div>
      <div className="flex items-center gap-1">
        {/* Plus Icon - Show on Chats */}
        {isChatsPage && (
          <button 
            onClick={() => navigate('/search-user')}
            className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group"
          >
            <Plus size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}



        {/* Create Reel Icon - Show on Reels */}
        {isReelsPage && (
          <button 
            onClick={() => navigate('/reels/create')}
            className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group"
            title="Create Reel"
          >
            <Plus size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}

        {/* Search Icon - Show on Chats, Hub, and Tube */}
        {(isChatsPage || isHubPage || isTubePage) && (
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group"
          >
            <Search size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}

        {/* Lock Icon - Show on Profile */}
        {isProfilePage && (
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group">
            <Lock size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}

        {/* Statics Icon - Show on Profile */}
        {isProfilePage && (
          <button className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group">
            <BarChart2 size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}

        {/* Heart Icon - Show on Home */}
        {isHomePage && (
          <Link to="/notifications/likes" className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group relative">
            <Heart size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" fill="currentColor" fillOpacity={0.1} />
            {hasUnreadLikes && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--header-bg)]" />
            )}
          </Link>
        )}

        {/* Bell Icon - Show on Home */}
        {isHomePage && (
          <Link to="/notifications" className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group relative">
            <Bell size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
            {hasUnreadNotifs && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-[var(--header-bg)]" />
            )}
          </Link>
        )}

        {/* Settings Icon - Show on Profile */}
        {isProfilePage && (
          <button 
            onClick={() => navigate('/settings')}
            className="p-2 hover:bg-black/5 rounded-full transition-colors cursor-pointer group"
          >
            <Settings size={22} className="text-[var(--header-text)] group-active:scale-110 transition-transform" />
          </button>
        )}

        {/* 3 Dots Menu - Show on Chats */}
        {isChatsPage && (
          <div className="relative" ref={menuRef}>
            <button 
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
            >
              <MoreVertical size={22} className="text-[var(--header-text)]" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-52 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] py-2 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                {menuOptions.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setShowMenu(false);
                      if (option.path) navigate(option.path);
                    }}
                    className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                  >
                    <option.icon size={18} className="text-[var(--text-secondary)]" />
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
