import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ChevronRight,
  Loader2,
  Plus
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { supabase } from '../../lib/supabase';
import { isUserOnline } from '../../utils/presence';
import Avatar from '../../components/common/Avatar';
import { CommonSearchBar } from '../../components/common/CommonSearchBar';

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
  
  // Tab-specific search state
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);

  // Fetch hidden user IDs
  useEffect(() => {
    if (!supabase || !authUser?.id || !userData?.hiddenChats || userData.hiddenChats.length === 0) {
      setHiddenUserIds([]);
      return;
    }
    const fetchHiddenUserIds = async () => {
      try {
        const { data } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', userData.hiddenChats)
          .neq('user_id', authUser.id);
        
        if (data) {
          setHiddenUserIds(data.map(d => d.user_id));
        }
      } catch (e) {
        console.warn("Failed to fetch hidden user ids inside search tab:", e);
      }
    };
    fetchHiddenUserIds();
  }, [userData?.hiddenChats, authUser?.id]);

  // Stories integration
  const [stories, setStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  const fetchStories = useCallback(async () => {
    if (!supabase || !authUser?.id) return;
    setStoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, users:user_id(username, full_name, photo_url)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStories(data);
      }
    } catch (err) {
      console.error('Error fetching stories for search tab:', err);
    } finally {
      setStoriesLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const storiesGroupedByUser = useMemo(() => {
    const groups: { [key: string]: { userId: string; username: string; fullName: string; photoURL: string; stories: any[] } } = {};
    
    stories.forEach((story: any) => {
      if (hiddenUserIds.includes(story.user_id)) return;

      const uid = story.user_id;
      const userObj = story.users;
      const username = userObj?.username || 'User';
      const fullName = userObj?.full_name || username;
      const photoURL = userObj?.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      
      if (!groups[uid]) {
        groups[uid] = {
          userId: uid,
          username,
          fullName,
          photoURL,
          stories: []
        };
      }
      groups[uid].stories.push(story);
    });

    return Object.values(groups);
  }, [stories, hiddenUserIds]);

  const myStoriesGroup = storiesGroupedByUser.find(g => g.userId === authUser?.id);
  const otherStoriesGroups = storiesGroupedByUser.filter(g => g.userId !== authUser?.id);

  const formatStoryTime = (createdAtString: string) => {
    if (!createdAtString) return '';
    const date = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const isToday = date.toDateString() === now.toDateString();
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', hour12: true };
    
    if (isToday) {
      return `Today, ${date.toLocaleTimeString([], options)}`;
    }
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    if (isYesterday) {
      return `Yesterday, ${date.toLocaleTimeString([], options)}`;
    }
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + date.toLocaleTimeString([], options);
  };

  // Handle Discover User Search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (discoverSearchTerm.trim()) {
        const handleSearch = async () => {
          const term = discoverSearchTerm.toLowerCase().trim();
          if (!supabase || !authUser?.id) return;
          setDiscoverLoading(true);
          try {
            const { data } = await supabase
              .from('users')
              .select('id, username, full_name, photo_url, is_online, last_seen')
              .or(`username.ilike.%${term}%,full_name.ilike.%${term}%`)
              .neq('id', authUser?.id)
              .limit(40);
            
            if (data) {
              setUserResults(
                data.map(u => ({
                  uid: u.id,
                  username: u.username,
                  fullName: u.full_name,
                  photoURL: u.photo_url || '',
                  isOnline: isUserOnline(u.is_online, u.last_seen)
                }))
              );
            }
          } catch (error) {
            console.error('Error searching in search tab:', error);
          } finally {
            setDiscoverLoading(false);
          }
        };

        handleSearch();
      } else {
        setUserResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [discoverSearchTerm, authUser?.id]);

  const renderUserRow = (profile: UserProfile) => {
    return (
      <div 
        key={profile.uid}
        onClick={() => navigate(`/user/${profile.uid}`)}
        className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group cursor-pointer select-none"
      >
        <Avatar 
          url={profile.photoURL} 
          type="direct" 
          name={profile.fullName || profile.username || 'GrixUser'} 
          isOnline={profile.isOnline} 
        />
        
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h4 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
              {profile.fullName || profile.username || 'GrixChat User'}
            </h4>
            <p className="text-[12.5px] text-[var(--text-secondary)] opacity-75 font-medium mt-0.5 leading-tight">@{profile.username || 'username'}</p>
          </div>
          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-30 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
        </div>
      </div>
    );
  };

  const renderInlineHeader = (title: string, count?: number) => {
    return (
      <div className="px-4 py-2 bg-[var(--bg-main)]/30 border-b border-t border-[var(--border-color)]/5 select-none flex items-center justify-between first:border-t-0 font-sans">
        <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0494f4]"></span>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[9.5px] font-bold text-[#0494f4] bg-[#0494f4]/15 px-1.5 h-4 rounded-full flex items-center justify-center font-mono">
            {count}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y font-sans">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        {/* Scrollable Reusable Search Bar */}
        <CommonSearchBar 
          placeholder="Search profiles by name or username..."
          value={discoverSearchTerm}
          onChange={setDiscoverSearchTerm}
          onClear={() => setDiscoverSearchTerm('')}
        />

        <div className="flex flex-col mt-1">
          {discoverSearchTerm ? (
            /* Search results view and header */
            <div className="flex flex-col bg-[var(--bg-card)] divide-y divide-[var(--border-color)]/5 border-b border-[var(--border-color)]/5">
              {renderInlineHeader("Global Query Results", userResults.filter(p => !hiddenUserIds.includes(p.uid)).length)}
              
              {discoverLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 bg-[var(--bg-card)]">
                  <Loader2 className="animate-spin text-[#0494f4]" size={22} />
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Browsing matches...</p>
                </div>
              ) : userResults.filter(p => !hiddenUserIds.includes(p.uid)).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-2 bg-[var(--bg-card)]">
                  <Users size={22} className="text-[var(--text-secondary)] opacity-50 shrink-0" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)]">No profiles matched</h4>
                    <p className="text-[11.5px] text-[var(--text-secondary)] px-4 leading-tight mt-0.5">Please check the search spelling, or wait until users register on Grixvibe.</p>
                  </div>
                </div>
              ) : (
                userResults.filter(p => !hiddenUserIds.includes(p.uid)).map(profile => renderUserRow(profile))
              )}
            </div>
          ) : (
            /* Default unified top-to-bottom list */
            <div className="flex flex-col bg-[var(--bg-card)] divide-y divide-[var(--border-color)]/5 border-b border-[var(--border-color)]/5">
              
              {/* STATUS LIST */}
              {(() => {
                return (
                  <>
                    {/* MY STATUS TILE */}
                    <div 
                      onClick={() => {
                        if (myStoriesGroup) {
                          navigate(`/stories/view/${authUser?.id}`);
                        } else {
                          navigate('/stories/create');
                        }
                      }}
                      className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group cursor-pointer select-none"
                    >
                      {/* Left: Avatar */}
                      <div className="relative shrink-0">
                        {myStoriesGroup ? (
                          <Avatar 
                            url={userData?.photoURL} 
                            type="direct" 
                            name="My Story" 
                          />
                        ) : (
                          <div className="relative">
                            <Avatar 
                              url={userData?.photoURL} 
                              type="direct" 
                              name="My Story" 
                            />
                            <div className="absolute -bottom-0.5 -right-0.5 w-[16px] h-[16px] bg-[#0494f4] text-white rounded-full flex items-center justify-center border-2 border-[var(--bg-card)] shadow-md">
                              <Plus size={10} strokeWidth={3} />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Middle: Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
                          My Story
                        </h4>
                        <p className="text-[12.5px] text-[var(--text-secondary)] opacity-75 mt-0.5 font-medium leading-tight">
                          {myStoriesGroup 
                            ? `Last update: ${formatStoryTime(myStoriesGroup.stories[0].created_at)}` 
                            : 'Tap to add story update'
                          }
                        </p>
                      </div>

                      {/* Right: Plus to add new stories */}
                      {myStoriesGroup && (
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate('/stories/create');
                          }}
                          className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent text-[#0494f4] hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
                          title="Add New Story"
                        >
                          <Plus size={18} className="stroke-[2.2]" />
                        </button>
                      )}
                    </div>

                    {/* FRIENDS' STATUSES (RECENT UPDATES) */}
                    {storiesLoading ? (
                      <div className="flex items-center gap-2 px-4 py-4 justify-center">
                        <Loader2 className="animate-spin text-[#0494f4]" size={16} />
                        <span className="text-xs text-[var(--text-secondary)]">Loading stories...</span>
                      </div>
                    ) : otherStoriesGroups.length === 0 ? (
                      <div className="px-5 py-4 text-center">
                        <p className="text-[11.5px] text-[var(--text-secondary)] italic">No updates from other people yet.</p>
                      </div>
                    ) : (
                      otherStoriesGroups.map(group => (
                        <div 
                          key={group.userId}
                          onClick={() => navigate(`/stories/view/${group.userId}`)}
                          className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group cursor-pointer select-none"
                        >
                          {/* Left: Avatar */}
                          <div className="relative shrink-0">
                            <Avatar 
                              url={group.photoURL} 
                              type="direct" 
                              name={group.username} 
                            />
                          </div>

                          {/* Middle: Details */}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
                              {group.fullName || group.username}
                            </h4>
                            <p className="text-[12.5px] text-[var(--text-secondary)] opacity-75 mt-0.5 font-medium leading-tight">
                              {formatStoryTime(group.stories[0].created_at)}
                            </p>
                          </div>

                          {/* Right: navigation chevron */}
                          <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                        </div>
                      ))
                    )}
                  </>
                );
              })()}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
