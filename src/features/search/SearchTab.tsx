import React, { useEffect, useState, useCallback } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Check, 
  Clock, 
  MessageSquare,
  Plus,
  ChevronRight,
  Loader2,
  UserPlus
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { supabase } from '../../lib/supabase';
import { isUserOnline } from '../../utils/presence';
import { chatService } from '../chat/services/chatService';
import { acceptChat } from '../../utils/acceptedChats';
import { LocalDataCache } from '../../services/LocalDataCache';
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
  
  // Tab-specific search state (rather than global search context sync to avoid typing conflict)
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<UserProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<UserProfile[]>([]);
  const [myFriends, setMyFriends] = useState<UserProfile[]>([]);

  // View limits for each list
  const [suggestedLimit, setSuggestedLimit] = useState(5);
  const [incomingLimit, setIncomingLimit] = useState(5);
  const [outgoingLimit, setOutgoingLimit] = useState(5);
  const [friendsLimit, setFriendsLimit] = useState(5);

  const [localRequestedUids, setLocalRequestedUids] = useState<string[]>([]);
  const [actionInProgressUid, setActionInProgressUid] = useState<string | null>(null);
  const [requestCount, setRequestCount] = useState(0);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followerIds, setFollowerIds] = useState<string[]>([]);
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

  const storiesGroupedByUser = React.useMemo(() => {
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

  // Fetch initial data (Mutuals, Suggested, etc.)
  const fetchInitialData = useCallback(async (showLoading = false) => {
    if (!supabase || !authUser?.id) return;
    try {
      if (showLoading) setDiscoverLoading(true);
      
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

      const following_Ids = Array.from(IFollow);
      const follower_Ids = Array.from(FollowsMe);
      setFollowingIds(following_Ids);
      setFollowerIds(follower_Ids);

      const incomingIds = follower_Ids.filter(id => !IFollow.has(id));
      setRequestCount(incomingIds.length);

      // Collect relationship IDs
      const relationshipIds = Array.from(new Set([...following_Ids, ...follower_Ids]));

      // Query relationship detailed profiles
      let relationshipUsers: any[] = [];
      if (relationshipIds.length > 0) {
        const { data: relData } = await supabase
          .from('users')
          .select('id, username, full_name, photo_url, is_online, last_seen')
          .in('id', relationshipIds);
        if (relData) {
          relationshipUsers = relData;
        }
      }

      // Query general suggested users
      const { data: sugData } = await supabase
        .from('users')
        .select('id, username, full_name, photo_url, is_online, last_seen')
        .neq('id', authUser?.id)
        .limit(100);

      // Merge uniqueness
      const mergedMap = new Map<string, any>();
      relationshipUsers.forEach(u => mergedMap.set(u.id, u));
      sugData?.forEach(u => {
        if (!mergedMap.has(u.id) && u.id !== authUser.id) {
          mergedMap.set(u.id, u);
        }
      });

      const allUsers = Array.from(mergedMap.values());

      const tempSuggested: UserProfile[] = [];
      const tempIncoming: UserProfile[] = [];
      const tempOutgoing: UserProfile[] = [];
      const tempFriends: UserProfile[] = [];

      allUsers.forEach(u => {
        const profile: UserProfile = {
          uid: u.id,
          username: u.username,
          fullName: u.full_name,
          photoURL: u.photo_url || '',
          isOnline: isUserOnline(u.is_online, u.last_seen)
        };

        const isFollowing = IFollow.has(u.id);
        const isFollower = FollowsMe.has(u.id);

        if (isFollowing && isFollower) {
          tempFriends.push(profile);
        } else if (isFollower && !isFollowing) {
          tempIncoming.push(profile);
        } else if (isFollowing && !isFollower) {
          tempOutgoing.push(profile);
        } else {
          tempSuggested.push(profile);
        }
      });

      setSuggestedUsers(tempSuggested);
      setIncomingRequests(tempIncoming);
      setOutgoingRequests(tempOutgoing);
      setMyFriends(tempFriends);

    } catch (e) {
      console.error('Error fetching discovery in search tab:', e);
    } finally {
      setDiscoverLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchInitialData(true);

    if (!supabase || !authUser?.id) return;
    const channelId = `search-tab-follows-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${authUser.id}` }, () => {
        fetchInitialData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${authUser.id}` }, () => {
        fetchInitialData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id, fetchInitialData]);

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

  const handleSendRequest = async (receiverId: string) => {
    if (!supabase || !authUser?.id || actionInProgressUid) return;
    try {
      setActionInProgressUid(receiverId);
      setLocalRequestedUids(prev => [...prev, receiverId]);

      const { error } = await supabase.from('follows').insert({
        follower_id: authUser.id,
        following_id: receiverId
      });
      if (error) throw error;

      LocalDataCache.invalidateConversations(authUser.id);

      setFollowingIds(prev => [...prev, receiverId]);
    } catch (err) {
      console.error("Error creating request in search tab:", err);
    } finally {
      setActionInProgressUid(null);
    }
  };

  const handleAcceptRequest = async (receiverId: string) => {
    if (!supabase || !authUser?.id || actionInProgressUid) return;
    try {
      setActionInProgressUid(receiverId);

      const { error } = await supabase.from('follows').insert({
        follower_id: authUser.id,
        following_id: receiverId
      });
      if (error) throw error;

      const convId = await chatService.getOrCreateDirectConversation(authUser.id, receiverId);
      if (convId) {
        acceptChat(convId);
      }

      LocalDataCache.invalidateConversations(authUser.id);

      setFollowingIds(prev => [...prev, receiverId]);
    } catch (err) {
      console.error("Error accepting request in search tab:", err);
    } finally {
      setActionInProgressUid(null);
    }
  };

  const handleCancelRequest = async (receiverId: string) => {
    if (!supabase || !authUser?.id || actionInProgressUid) return;
    try {
      setActionInProgressUid(receiverId);

      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', authUser.id)
        .eq('following_id', receiverId);
      
      if (error) throw error;

      LocalDataCache.invalidateConversations(authUser.id);

      setFollowingIds(prev => prev.filter(id => id !== receiverId));
      setLocalRequestedUids(prev => prev.filter(id => id !== receiverId));
    } catch (err) {
      console.error("Error canceling request inside search tab:", err);
    } finally {
      setActionInProgressUid(null);
    }
  };

  const mutualFriendsCount = followingIds.filter(id => followerIds.includes(id)).length;

  const renderUserRow = (profile: UserProfile, type: 'suggested' | 'incoming' | 'outgoing' | 'friend') => {
    const isActionLoading = actionInProgressUid === profile.uid;
    
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
        
        {/* Symmetrical Details styling matching standard Chat and Call list rows */}
        <div className="flex-1 min-w-0 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <h4 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
              {profile.fullName || profile.username || 'GrixChat User'}
            </h4>
            <p className="text-[12.5px] text-[var(--text-secondary)] opacity-75 font-medium mt-0.5 leading-tight">@{profile.username || 'username'}</p>
          </div>

          <div className="shrink-0 flex items-center pr-1 gap-2.5" onClick={(e) => e.stopPropagation()}>
            {type === 'friend' && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/chat/${profile.uid}`);
                }}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent text-[#0494f4] hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0"
                title="Open Chat"
              >
                <MessageSquare size={18} className="stroke-[2.2]" />
              </button>
            )}

            {type === 'incoming' && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptRequest(profile.uid);
                }}
                disabled={isActionLoading}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent text-emerald-500 hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50"
                title="Accept Request"
              >
                {isActionLoading ? (
                  <Loader2 size={16} className="animate-spin text-emerald-500" />
                ) : (
                  <Check size={20} className="stroke-[2.8]" />
                )}
              </button>
            )}

            {type === 'outgoing' && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancelRequest(profile.uid);
                }}
                disabled={isActionLoading}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent text-rose-500 hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50"
                title="Cancel Request"
              >
                {isActionLoading ? (
                  <Loader2 size={16} className="animate-spin text-rose-500" />
                ) : (
                  <Clock size={18} className="stroke-[2.2] animate-[pulse_2.2s_infinite]" />
                )}
              </button>
            )}

            {type === 'suggested' && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSendRequest(profile.uid);
                }}
                disabled={isActionLoading}
                className="w-9 h-9 rounded-full flex items-center justify-center bg-transparent text-[#0494f4] hover:bg-[var(--border-color)]/10 active:scale-95 transition-all duration-150 cursor-pointer shrink-0 disabled:opacity-50"
                title="Add Friend"
              >
                {isActionLoading ? (
                  <Loader2 size={16} className="animate-spin text-[#0494f4]" />
                ) : (
                  <UserPlus size={18} className="stroke-[2.2]" />
                )}
              </button>
            )}
          </div>
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
                userResults.filter(p => !hiddenUserIds.includes(p.uid)).map(profile => {
                  const isFollowing = followingIds.includes(profile.uid) || localRequestedUids.includes(profile.uid);
                  const isFollower = followerIds.includes(profile.uid);
                  const isMutual = isFollowing && isFollower;
                  const isOutgoingRequest = isFollowing && !isFollower;
                  const isIncomingRequest = isFollower && !isFollowing;
                  
                  const type = isMutual ? 'friend' : (isIncomingRequest ? 'incoming' : (isOutgoingRequest ? 'outgoing' : 'suggested'));
                  return renderUserRow(profile, type);
                })
              )}
            </div>
          ) : (
            /* Default unified top-to-bottom list */
            <div className="flex flex-col bg-[var(--bg-card)] divide-y divide-[var(--border-color)]/5 border-b border-[var(--border-color)]/5">
              
              {/* STATUS LIST */}
              {(() => {
                const storiesCount = otherStoriesGroups.length + (myStoriesGroup ? 1 : 0);
                return (
                  <>
                    {renderInlineHeader("Stories Updates", storiesCount)}
                    
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
                    {otherStoriesGroups.map(group => (
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
                    ))}
                  </>
                );
              })()}

              {/* Pillar 1: Suggested Connections */}
              {(() => {
                const filtered = suggestedUsers.filter(profile => !hiddenUserIds.includes(profile.uid));
                const visibleItems = filtered.slice(0, suggestedLimit);
                return (
                  <>
                    {renderInlineHeader("Suggested Connections", filtered.length)}
                    
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 gap-2 bg-[var(--bg-card)]">
                        <Users size={18} className="text-[var(--text-secondary)] opacity-45 shrink-0" />
                        <p className="text-[12px] font-medium text-[var(--text-secondary)] max-w-xs leading-normal">
                          No alternative profiles available at this moment. Invite more Grixvibe friends!
                        </p>
                      </div>
                    ) : (
                      visibleItems.map(p => renderUserRow(p, 'suggested'))
                    )}
                    
                    {filtered.length > 5 && (
                      <div className="px-4 py-2 bg-[var(--bg-card)]">
                        <button
                           type="button"
                           onClick={() => setSuggestedLimit(prev => prev === 5 ? filtered.length : 5)}
                           className="w-full py-1.5 text-center text-[10.5px] font-bold text-[#0494f4] bg-[#0494f4]/5 hover:bg-[#0494f4]/10 active:scale-[0.98] transition-all rounded-xl cursor-pointer uppercase tracking-wider"
                        >
                          {suggestedLimit === 5 ? `View More (+${filtered.length - 5})` : 'Show Less'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Pillar 2: Outgoing Requests */}
              {(() => {
                const filtered = outgoingRequests.filter(profile => !hiddenUserIds.includes(profile.uid));
                const visibleItems = filtered.slice(0, outgoingLimit);
                if (filtered.length === 0) return null;
                return (
                  <>
                    {renderInlineHeader("Outgoing Requests", filtered.length)}
                    {visibleItems.map(p => renderUserRow(p, 'outgoing'))}
                    
                    {filtered.length > 5 && (
                      <div className="px-4 py-2 bg-[var(--bg-card)]">
                        <button
                           type="button"
                           onClick={() => setOutgoingLimit(prev => prev === 5 ? filtered.length : 5)}
                           className="w-full py-1.5 text-center text-[10.5px] font-bold text-[#0494f4] bg-[#0494f4]/5 hover:bg-[#0494f4]/10 active:scale-[0.98] transition-all rounded-xl cursor-pointer uppercase tracking-wider"
                        >
                          {outgoingLimit === 5 ? `View More (+${filtered.length - 5})` : 'Show Less'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Pillar 3: Pending Incoming Requests */}
              {(() => {
                const filtered = incomingRequests.filter(profile => !hiddenUserIds.includes(profile.uid));
                const visibleItems = filtered.slice(0, incomingLimit);
                if (filtered.length === 0) return null;
                return (
                  <>
                    {renderInlineHeader("Pending Inbound Requests", filtered.length)}
                    {visibleItems.map(p => renderUserRow(p, 'incoming'))}
                    
                    {filtered.length > 5 && (
                      <div className="px-4 py-2 bg-[var(--bg-card)]">
                        <button
                           type="button"
                           onClick={() => setIncomingLimit(prev => prev === 5 ? filtered.length : 5)}
                           className="w-full py-1.5 text-center text-[10.5px] font-bold text-[#0494f4] bg-[#0494f4]/5 hover:bg-[#0494f4]/10 active:scale-[0.98] transition-all rounded-xl cursor-pointer uppercase tracking-wider"
                        >
                          {incomingLimit === 5 ? `View More (+${filtered.length - 5})` : 'Show Less'}
                        </button>
                      </div>
                    )}
                  </>
                );
              })()}

              {/* Pillar 4: Mutual Friends */}
              {(() => {
                const filtered = myFriends.filter(profile => !hiddenUserIds.includes(profile.uid));
                const visibleItems = filtered.slice(0, friendsLimit);
                return (
                  <>
                    {renderInlineHeader("My Friends", filtered.length)}
                    
                    {filtered.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4 gap-2 bg-[var(--bg-card)]">
                        <Users size={18} className="text-[var(--text-secondary)] opacity-45 shrink-0" />
                        <p className="text-[12px] font-medium text-[var(--text-secondary)] max-w-xs leading-normal">
                          No friends connected yet. Tap Add on Suggested Connections to build friendships!
                        </p>
                      </div>
                    ) : (
                      visibleItems.map(p => renderUserRow(p, 'friend'))
                    )}
                    
                    {filtered.length > 5 && (
                      <div className="px-4 py-2 bg-[var(--bg-card)]">
                        <button
                           type="button"
                           onClick={() => setFriendsLimit(prev => prev === 5 ? filtered.length : 5)}
                           className="w-full py-1.5 text-center text-[10.5px] font-bold text-[#0494f4] bg-[#0494f4]/5 hover:bg-[#0494f4]/10 active:scale-[0.98] transition-all rounded-xl cursor-pointer uppercase tracking-wider"
                        >
                          {friendsLimit === 5 ? `View More (+${filtered.length - 5})` : 'Show Less'}
                        </button>
                      </div>
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
