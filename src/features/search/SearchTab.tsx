import React, { useEffect, useState, useCallback } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  Loader2, 
  Users, 
  Check, 
  Clock, 
  MessageSquare,
  Plus
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { supabase } from '../../lib/supabase';
import { isUserOnline } from '../../utils/presence';
import { chatService } from '../chat/services/chatService';
import { acceptChat } from '../../utils/acceptedChats';

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

      const friendIds = Array.from(IFollow);
      setFollowingIds(friendIds);
      setFollowerIds(Array.from(FollowsMe));

      const incomingIds = Array.from(FollowsMe).filter(id => !IFollow.has(id));
      setRequestCount(incomingIds.length);

      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, full_name, photo_url, is_online, last_seen')
        .neq('id', authUser?.id)
        .limit(40);
      
      const mappedSuggested: UserProfile[] = [];
      if (usersData) {
        usersData.forEach(u => {
          if (!IFollow.has(u.id) && !FollowsMe.has(u.id)) {
            mappedSuggested.push({
              uid: u.id,
              username: u.username,
              fullName: u.full_name,
              photoURL: u.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              isOnline: isUserOnline(u.is_online, u.last_seen)
            });
          }
        });
        setSuggestedUsers(mappedSuggested.slice(0, 20));
      }
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => {
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
                  photoURL: u.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
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

      setFollowingIds(prev => prev.filter(id => id !== receiverId));
      setLocalRequestedUids(prev => prev.filter(id => id !== receiverId));
    } catch (err) {
      console.error("Error canceling request inside search tab:", err);
    } finally {
      setActionInProgressUid(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden animate-fade-in touch-pan-y">
      
      {/* Search Header Banner */}
      <div className="px-5 py-4 bg-[var(--bg-card)] border-b border-[var(--border-color)]/20 shadow-sm shrink-0 flex items-center justify-between">
        <div>
          <h2 className="text-[17px] font-bold text-[var(--text-primary)] tracking-tight">Discover People</h2>
          <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-none mt-1">Find friends and build real-time chats</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        <div className="p-4 space-y-4">

          {/* BEAUTIFIED SEARCH INPUT */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl shadow-sm p-3.5">
            <div className="flex items-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/90 focus-within:bg-[var(--bg-main)] rounded-2xl px-4 h-11.5 border border-[var(--border-color)]/25 focus-within:border-[#0494f4]/45 focus-within:ring-2 focus-within:ring-[#0494f4]/5 transition-all duration-200">
              <Search size={16} className="text-[var(--text-secondary)] mr-2.5 opacity-65 shrink-0" />
              <input 
                type="text" 
                placeholder="Find human profiles by username or name..." 
                value={discoverSearchTerm}
                onChange={(e) => setDiscoverSearchTerm(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40"
              />
              {discoverSearchTerm && (
                <button 
                  onClick={() => setDiscoverSearchTerm('')}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors shrink-0"
                >
                  <X size={14} className="text-[var(--text-secondary)]" />
                </button>
              )}
            </div>
          </div>

          {/* Incoming Message Request shortcut */}
          {!discoverSearchTerm && (
            <div 
              onClick={() => navigate('/chats/requests')}
              className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl shadow-sm p-4 flex items-center justify-between cursor-pointer group hover:bg-[var(--bg-card)]/90 transition-all select-none"
            >
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <div className="w-[38px] h-[38px] rounded-xl bg-[#0494f4]/15 flex items-center justify-center text-[#0494f4] border border-[#0494f4]/10 shadow-inner">
                    <Users size={16} strokeWidth={2.5} />
                  </div>
                  {requestCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-[#0494f4] text-[9px] font-black font-mono text-white rounded-full flex items-center justify-center border border-white dark:border-[var(--bg-card)]">
                      {requestCount}
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-[11.5px] font-bold text-[var(--text-primary)]">Pending Requests</h4>
                  <p className="text-[10px] text-[var(--text-secondary)]">
                    {requestCount > 0 ? `${requestCount} incoming request letters waiting` : 'No inbound requests pending'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-[#0494f4]/10 hover:bg-[#0494f4]/20 text-[#0494f4] font-black px-3.5 py-1.5 rounded-xl border border-[#0494f4]/10 transition-colors uppercase tracking-wider">
                Manage
              </span>
            </div>
          )}

          {/* Dynamic Users Hub List */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl shadow-sm p-4 overflow-hidden">
            <div className="flex items-center justify-between mb-3.5">
              <h3 className="text-xs font-black text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5 leading-none select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0494f4]"></span>
                {discoverSearchTerm ? 'Global Results' : 'Suggested Connections'}
              </h3>
              <span className="text-[10px] bg-[#0494f4]/10 text-[#0494f4] font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none shrink-0 text-right">
                Join World
              </span>
            </div>

            {discoverLoading && discoverSearchTerm ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Loader2 className="animate-spin text-[#0494f4]" size={22} />
                <p className="text-[9px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Browsing matches...</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[480px] overflow-y-auto no-scrollbar pr-0.5">
                {((discoverSearchTerm ? userResults : suggestedUsers)
                  .filter(profile => !hiddenUserIds.includes(profile.uid))
                  .length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center select-none bg-[var(--bg-main)]/30 border border-[var(--border-color)]/20 rounded-2xl gap-2">
                      <Users size={22} className="text-[var(--text-secondary)] opacity-50 shrink-0" />
                      <div>
                        <h4 className="text-[11px] font-bold text-[var(--text-primary)]">No matching users</h4>
                        <p className="text-[9px] text-[var(--text-secondary)] px-4 leading-tight">Checking search spelling, or wait until more users register on Grixvibe.</p>
                      </div>
                    </div>
                  ) : (
                    (discoverSearchTerm ? userResults : suggestedUsers)
                      .filter(profile => !hiddenUserIds.includes(profile.uid))
                      .map((profile) => {
                        const isFollowing = followingIds.includes(profile.uid) || localRequestedUids.includes(profile.uid);
                        const isFollower = followerIds.includes(profile.uid);
                        const isMutual = isFollowing && isFollower;
                        const isOutgoingRequest = isFollowing && !isFollower;
                        const isIncomingRequest = isFollower && !isFollowing;
                        
                        return (
                          <div 
                            key={profile.uid}
                            onClick={() => navigate(`/user/${profile.uid}`)}
                            className="flex items-center justify-between p-2.5 hover:bg-[var(--bg-main)] rounded-xl transition-all duration-150 cursor-pointer group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                <img 
                                  src={profile.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                                  alt={profile.username}
                                  className="w-9.5 h-9.5 rounded-full object-cover border border-[var(--border-color)]/40"
                                  referrerPolicy="no-referrer"
                                />
                                {profile.isOnline && (
                                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <h5 className="text-xs font-black text-[var(--text-primary)] truncate group-hover:text-[#0494f4] transition-colors">
                                  {profile.fullName || profile.username}
                                </h5>
                                <p className="text-[9px] text-[var(--text-secondary)] font-mono">@{profile.username}</p>
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center pr-1">
                              {isMutual ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/chat/${profile.uid}`);
                                  }}
                                  className="px-2.5 py-1.5 bg-[#0494f4] text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  <MessageSquare size={10} />
                                  <span>Chat</span>
                                </button>
                              ) : isIncomingRequest ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAcceptRequest(profile.uid);
                                  }}
                                  disabled={actionInProgressUid === profile.uid}
                                  className="px-2.5 py-1.5 bg-[#0494f4] text-white rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  {actionInProgressUid === profile.uid ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Check size={10} />
                                  )}
                                  <span>Accept</span>
                                </button>
                              ) : isOutgoingRequest ? (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelRequest(profile.uid);
                                  }}
                                  disabled={actionInProgressUid === profile.uid}
                                  className="px-2 py-1.5 bg-[var(--border-color)]/25 text-[var(--text-secondary)] rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                                >
                                  {actionInProgressUid === profile.uid ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Clock size={10} />
                                  )}
                                  <span>Sent</span>
                                </button>
                              ) : (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendRequest(profile.uid);
                                  }}
                                  disabled={actionInProgressUid === profile.uid}
                                  className="px-2.5 py-1.5 bg-[#0494f4]/10 text-[#0494f4] rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-[#0494f4] hover:text-white transition-colors"
                                >
                                  {actionInProgressUid === profile.uid ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    <Plus size={10} />
                                  )}
                                  <span>Add</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
              </div>
            )}
          </div>

        </div>
      </div>
      
    </div>
  );
}
