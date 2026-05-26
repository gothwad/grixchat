import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { Search, X, Loader2, MessageSquare, Plus, Check, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useConversations } from '../chat/hooks/useConversations';
import { getAcceptedChats } from '../../utils/acceptedChats';

interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline?: boolean;
}

export default function SearchTab() {
  const navigate = useNavigate();
  const { user: authUser, userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);

  // Real-time conversation tracking to fetch genuine incoming requests count
  const { conversations } = useConversations('Chats');
  const requestCount = conversations.filter(c => c.type === 'direct' && !getAcceptedChats().includes(c.id)).length;

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    if (!supabase) return;
    try {
      setLoading(true);
      
      // Fetch Suggested Users
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, full_name, photo_url, is_online')
        .neq('id', authUser?.id)
        .limit(20);
      
      const mappedSuggested: UserProfile[] = [];
      if (usersData) {
        usersData.forEach(u => {
          mappedSuggested.push({
            uid: u.id,
            username: u.username,
            fullName: u.full_name,
            photoURL: u.photo_url,
            isOnline: u.is_online
          });
        });
        setSuggestedUsers(mappedSuggested);
      }

    } catch (error) {
      console.error('Error fetching discovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setUserResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    const term = searchTerm.toLowerCase();
    if (!supabase) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('users')
        .select('id, username, full_name, photo_url, is_online')
        .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
        .neq('id', authUser?.id)
        .limit(30);
      
      if (data) {
        setUserResults(data.map(u => ({
          uid: u.id,
          username: u.username,
          fullName: u.full_name,
          photoURL: u.photo_url,
          isOnline: u.is_online
        })));
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  // Trending & Discovery Explore categories
  const trendingTags = [
    { name: 'Grix AI', query: 'grix-ai', icon: '🤖' },
    { name: 'Reels Maker', query: 'reel', icon: '🍿' },
    { name: 'Trending Users', query: 'a', icon: '✨' },
    { name: 'Active Now', query: 'grix', icon: '📱' },
    { name: 'Support', query: 'support', icon: '💬' },
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden font-sans">
      
      {/* 2. BEAUTIFIED SEARCH BAR (Fixed at Top) */}
      <div className="px-5 py-3.5 shrink-0 bg-[var(--bg-card)] z-40 border-b border-[var(--border-color)]/20">
        <div className="flex items-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/90 focus-within:bg-[var(--bg-main)] rounded-2xl px-4 h-11 border border-[var(--border-color)]/30 focus-within:border-indigo-500/50 focus-within:ring-2 focus-within:ring-indigo-500/10 shadow-sm transition-all duration-250">
          <Search size={16} className="text-[var(--text-secondary)] mr-2.5 opacity-60" />
          <input 
            type="text" 
            placeholder="Search username or name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={14} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {/* 3. SCROLLABLE CONTAINER FOR ALL ELEMENTS */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        
        {/* 2.5 MESSAGE REQUESTS SHORTCUT (Now Inside Scrollable Container) */}
        {!searchTerm && (
          <div 
            onClick={() => navigate('/chats/requests')}
            className="flex items-center gap-[15px] px-5 py-4 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer border-b border-[var(--border-color)]/20 bg-[var(--bg-card)] select-none"
          >
            <div className="relative shrink-0 z-10">
              {/* Custom rounded profile icon style matching Chat List items / Archived Chats */}
              <div className="w-[52px] h-[52px] rounded-full bg-indigo-500/10 dark:bg-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform border border-[var(--border-color)]/30">
                <MessageSquare size={21} strokeWidth={2.5} />
              </div>
              {requestCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-[10px] font-black font-mono text-white rounded-full flex items-center justify-center animate-bounce border border-white dark:border-[var(--bg-card)]">
                  {requestCount}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1 relative">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                  Message Requests
                </h3>
                <span className="text-[11px] whitespace-nowrap text-indigo-500 dark:text-indigo-400 font-bold tracking-tight">
                  View
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                  {requestCount > 0 
                    ? `You have ${requestCount} pending chat request${requestCount > 1 ? 's' : ''}` 
                    : "No new requests from people you don't know"
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 2.6 FRIENDS SUB-MENU (Direct, native-inspired entries) */}
        {!searchTerm && (
          <div className="bg-[var(--bg-card)] border-b border-[var(--border-color)]/20 select-none">
            {/* Friends Option */}
            <div 
              onClick={() => navigate('/search/friends')}
              className="flex items-center gap-[15px] px-5 py-4 hover:bg-[var(--bg-main)] dark:hover:bg-zinc-800/30 transition-all active:scale-[0.98] group cursor-pointer"
            >
              <div className="w-[52px] h-[52px] rounded-full bg-emerald-500/10 dark:bg-zinc-800 flex items-center justify-center text-emerald-500 group-hover:scale-105 transition-transform border border-[var(--border-color)]/35">
                <Users size={21} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                    Friends
                  </h3>
                  <span className="text-[11px] whitespace-nowrap text-emerald-500 font-bold tracking-tight">
                    Open
                  </span>
                </div>
                <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                  Connect with people you chat with on Grix
                </p>
              </div>
            </div>
          </div>
        )}

        {loading && searchTerm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Searching users...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {searchTerm && (
              <div className="px-5 pt-5 pb-2">
                <h3 className="text-[11px] font-black text-[var(--text-secondary)] tracking-wide opacity-80 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                  Search Results
                </h3>
              </div>
            )}

            <div className="mt-1">
              {(searchTerm ? userResults : suggestedUsers).map((profile) => (
                <div 
                  key={profile.uid}
                  onClick={() => navigate(`/user/${profile.uid}`)}
                  className="flex items-center gap-3.5 px-5 py-3 hover:bg-[var(--bg-main)] transition-all duration-200 cursor-pointer group active:bg-[var(--bg-main)] border-b border-[var(--border-color)]/10"
                >
                  <div className="relative">
                    <img 
                      src={profile.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      alt={profile.username}
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)] group-hover:scale-102 transition-transform shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    {profile.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13.5px] font-extrabold text-[var(--text-primary)] truncate group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                      {profile.fullName || profile.username}
                    </h4>
                    <p className="text-[11px] text-[var(--text-secondary)]/80 font-bold truncate">@{profile.username}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/chat/${profile.uid}`);
                    }}
                    className="px-3.5 py-1.5 bg-[#0c1319] hover:bg-[#0c1319]/90 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center justify-center gap-1 shadow-md shrink-0 cursor-pointer border border-[#0c1319]/10"
                  >
                    <MessageSquare size={12} strokeWidth={3} />
                    <span>Message</span>
                  </button>
                </div>
              ))}
            </div>

            {!loading && searchTerm && userResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
                <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-color)]/30">
                  <Search size={22} className="text-[var(--text-secondary)] opacity-30" />
                </div>
                <h4 className="text-sm font-bold text-[var(--text-primary)] mb-1">No matches found</h4>
                <p className="text-xs text-[var(--text-secondary)]">We couldn't find any users under that exact name or handle.</p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
