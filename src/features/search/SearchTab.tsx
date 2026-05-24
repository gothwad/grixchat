import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { Search, X, Loader2, MessageSquare, Plus, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline?: boolean;
}

interface StoryGroup {
  userId: string;
  username: string;
  fullName: string;
  photoURL: string;
  hasUnseen: boolean;
}

export default function SearchTab() {
  const navigate = useNavigate();
  const { user: authUser, userData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [stories, setStories] = useState<StoryGroup[]>([]);

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

      // Fetch active stories
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*, users:user_id(id, username, full_name, photo_url)')
        .order('created_at', { ascending: false });

      if (storiesData) {
        // Group stories by user to show unique circles
        const grouped: Record<string, StoryGroup> = {};
        storiesData.forEach((s: any) => {
          if (s.users && s.user_id !== authUser?.id) {
            grouped[s.user_id] = {
              userId: s.user_id,
              username: s.users.username || 'User',
              fullName: s.users.full_name || 'Grix User',
              photoURL: s.users.photo_url || '',
              hasUnseen: true // Simple read state mockup
            };
          }
        });
        setStories(Object.values(grouped));
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

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden font-sans">
      
      {/* 1. INSTAGRAM STYLE STORIES - HORIZONTAL SCROLL ROW */}
      <div className="shrink-0 border-b border-[var(--border-color)]/30 bg-[var(--bg-card)] py-4 px-4 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Current User Story Circle */}
        <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer min-w-[68px]">
          <div 
            onClick={() => navigate('/stories/create')} 
            className="relative w-[60px] h-[60px] rounded-full overflow-visible flex items-center justify-center p-[2px] transition-transform active:scale-95"
          >
            <div className="w-full h-full rounded-full overflow-hidden border border-[var(--border-color)]/50">
              <img 
                src={userData?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                alt="My profile"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            {/* Plus Icon Overlay */}
            <div className="absolute bottom-[-1px] right-[-1px] w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white border-2 border-[var(--bg-card)] shadow-md">
              <Plus size={12} strokeWidth={3} />
            </div>
          </div>
          <span className="text-[10px] font-bold text-[var(--text-secondary)] text-center w-full truncate">
            Your Story
          </span>
        </div>

        {/* Stories from database */}
        {stories.length > 0 ? (
          stories.map((story) => (
            <div 
              key={story.userId}
              onClick={() => navigate(`/stories/view/${story.userId}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer min-w-[68px]"
            >
              <div className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center p-[2.5px] border-2 border-indigo-500 transition-transform active:scale-95">
                <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-main)] border border-[var(--bg-card)]">
                  <img 
                    src={story.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                    alt={story.username}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-primary)] text-center w-full truncate">
                {story.username}
              </span>
            </div>
          ))
        ) : (
          /* fallback suggestion bubbles if no stories to keep alignment professional and gorgeous */
          suggestedUsers.slice(0, 6).map((suggested) => (
            <div 
              key={suggested.uid}
              onClick={() => navigate(`/user/${suggested.uid}`)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer min-w-[68px] opacity-80"
            >
              <div className="relative w-[60px] h-[60px] rounded-full flex items-center justify-center p-[2px] border border-dashed border-[var(--border-color)] transition-transform active:scale-95">
                <div className="w-full h-full rounded-full overflow-hidden">
                  <img 
                    src={suggested.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                    alt={suggested.username}
                    className="w-full h-full object-cover grayscale"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <span className="text-[10px] font-medium text-[var(--text-secondary)] text-center w-full truncate">
                {suggested.username}
              </span>
            </div>
          ))
        )}
      </div>

      {/* 2. BEAUTIFIED SEARCH BAR */}
      <div className="px-5 py-4 shrink-0 bg-[var(--bg-card)] z-40">
        <div className="flex items-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/80 focus-within:bg-[var(--bg-main)] rounded-2xl px-4 h-12 border border-[var(--border-color)]/30 shadow-sm transition-all">
          <Search size={18} className="text-[var(--text-secondary)] mr-3 opacity-60" />
          <input 
            type="text" 
            placeholder="Search username or name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[14px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="p-1 hover:bg-black/5 rounded-full transition-colors"
            >
              <X size={16} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {/* 3. SEARCH RESULTS OR SUGGESTIONS */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {loading && searchTerm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Searching users...</p>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="px-6 py-2">
              <h3 className="text-[11px] font-extrabold text-[var(--text-secondary)] uppercase tracking-[0.15em]">
                {searchTerm ? 'Search Results' : 'Suggested People'}
              </h3>
            </div>

            <div className="divide-y divide-[var(--border-color)]/20 mt-1">
              {(searchTerm ? userResults : suggestedUsers).map((profile) => (
                <div 
                  key={profile.uid}
                  onClick={() => navigate(`/user/${profile.uid}`)}
                  className="flex items-center gap-3.5 px-6 py-4 hover:bg-[var(--bg-main)]/50 transition-colors cursor-pointer group active:bg-[var(--bg-main)]"
                >
                  <div className="relative">
                    <img 
                      src={profile.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      alt={profile.username}
                      className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)] group-hover:scale-105 transition-transform"
                      referrerPolicy="no-referrer"
                    />
                    {profile.isOnline && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[14px] font-bold text-[var(--text-primary)] truncate">
                      {profile.fullName || profile.username}
                    </h4>
                    <p className="text-xs text-[var(--text-secondary)] truncate">@{profile.username}</p>
                  </div>
                  
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/chat/${profile.uid}`);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm shrink-0"
                  >
                    <MessageSquare size={13} strokeWidth={2.5} />
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
