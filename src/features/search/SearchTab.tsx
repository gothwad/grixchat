import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  ChevronRight,
  Loader2,
  User,
  Heart,
  UserCheck,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { supabase } from '../../lib/supabase';
import { isUserOnline } from '../../utils/presence';
import Avatar from '../../components/common/Avatar';
import { CommonSearchBar } from '../../components/common/CommonSearchBar';
import { LocalDataCache } from '../../services/LocalDataCache';
import { useCall } from '../../providers/CallProvider';

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
  const { initiateCall } = useCall();
  
  // Tab-specific search state
  const [discoverSearchTerm, setDiscoverSearchTerm] = useState('');
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [hiddenUserIds, setHiddenUserIds] = useState<string[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Contacts / friends state
  const [contacts, setContacts] = useState<UserProfile[]>(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.get<any[]>(`gx_calls_contacts_${authUser.id}`);
      if (cached && Array.isArray(cached)) return cached;
    }
    return [];
  });
  const [contactsLoading, setContactsLoading] = useState(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.get<any[]>(`gx_calls_contacts_${authUser.id}`);
      if (cached && Array.isArray(cached) && cached.length > 0) return false;
    }
    return true;
  });

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

  // Fetch Contacts (mutual followers)
  const fetchContacts = useCallback(async () => {
    if (!authUser?.id || !supabase) return;
    try {
      const cached = LocalDataCache.get<any[]>(`gx_calls_contacts_${authUser.id}`);
      if (!cached || cached.length === 0) {
        setContactsLoading(true);
      }
      
      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .or(`follower_id.eq.${authUser.id},following_id.eq.${authUser.id}`);
      
      if (followError) throw followError;

      const IFollow = new Set<string>();
      const FollowsMe = new Set<string>();

      followRows?.forEach((row: any) => {
        if (row.follower_id === authUser.id) {
          IFollow.add(row.following_id);
        }
        if (row.following_id === authUser.id) {
          FollowsMe.add(row.follower_id);
        }
      });

      const mutualIds = Array.from(IFollow).filter(id => FollowsMe.has(id));
      const incomingRequests = Array.from(FollowsMe).filter(id => !IFollow.has(id));
      setPendingRequestsCount(incomingRequests.length);
      
      if (mutualIds.length > 0) {
        const { data: friendsData, error: friendsError } = await supabase
          .from('users')
          .select('id, username, full_name, photo_url, is_online, last_seen')
          .in('id', mutualIds)
          .limit(100);
        
        if (friendsError) throw friendsError;

        if (friendsData) {
          const formatted = friendsData.map(f => {
            const lastSeen = f.last_seen;
            const isOnline = !!(f.is_online && lastSeen && (new Date().getTime() - new Date(lastSeen).getTime()) < 65000);
            return {
              uid: f.id,
              username: f.username,
              fullName: f.full_name || f.username,
              photoURL: f.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
              isOnline
            };
          });
          setContacts(formatted);
          LocalDataCache.set(`gx_calls_contacts_${authUser.id}`, formatted);
        }
      } else {
        setContacts([]);
        LocalDataCache.set(`gx_calls_contacts_${authUser.id}`, []);
      }
    } catch (err) {
      console.error('Error fetching friends contacts:', err);
    } finally {
      setContactsLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchContacts();

    if (!supabase || !authUser?.id) return;

    const channel = supabase
      .channel('search-follows-realtime')
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'follows',
         filter: `follower_id=eq.${authUser.id}`
       }, () => fetchContacts())
      .on('postgres_changes', { 
         event: '*', 
         schema: 'public', 
         table: 'follows',
         filter: `following_id=eq.${authUser.id}`
       }, () => fetchContacts())
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [authUser?.id, fetchContacts]);

  // Handle Discover User Search (Global searching)
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

  // Handle Call Initialization
  const handleCall = (userId: string, type: 'voice' | 'video') => {
    if (initiateCall) {
      initiateCall(userId, type);
    }
  };

  const renderUserProfileRow = (profile: UserProfile, isFriend: boolean = false) => {
    const AVATAR_COLORS = ['#E17076','#7BC862','#65AADD','#E78A2F','#956FE4','#3CAFE5','#F57244','#49A0E9'];
    const getAvatarColor = (name: string) => AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
    const nameToUse = profile.fullName || profile.username || 'GrixUser';
    const avatarColor = getAvatarColor(nameToUse);
    const initials = nameToUse[0].toUpperCase();
    const isPlaceholder = !profile.photoURL || profile.photoURL.includes('149071.png') || profile.photoURL.includes('166258.png') || profile.photoURL.trim() === '';

    return (
      <div 
        key={profile.uid}
        onClick={() => navigate(`/user/${profile.uid}`)}
        className="relative flex items-center gap-3 px-3 py-2 min-h-[72px] transition-all duration-205 group cursor-pointer select-none bg-[var(--bg-card)] hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/8"
      >
        {/* Avatar Container */}
        <div className="relative shrink-0 w-[54px] h-[54px]">
          {isPlaceholder ? (
            <div 
              className="w-full h-full rounded-full flex items-center justify-center text-white text-[22px] font-medium"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          ) : (
            <div className="w-full h-full rounded-full overflow-hidden border border-[var(--border-color)]/20 shadow-sm flex items-center justify-center bg-[var(--border-color)]/5">
              <img 
                src={profile.photoURL} 
                className="w-full h-full object-cover rounded-full"
                referrerPolicy="no-referrer"
                alt={nameToUse}
              />
            </div>
          )}
          {profile.isOnline && (
            <div className="absolute bottom-0.5 right-0.5 w-[10px] h-[10px] bg-green-500 border-2 border-[var(--bg-card)] rounded-full z-10" />
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          <h3 className="text-[16px] truncate font-medium text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
            {nameToUse}
          </h3>
          <p className="text-[15px] text-[var(--text-secondary)] opacity-75 mt-0.5 truncate">
            @{profile.username || 'username'}
          </p>
        </div>

        {/* Action / Arrow Area */}
        <div className="flex items-center gap-1.5 shrink-0 mr-1">
          <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-20 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200" />
        </div>

        {/* Separator Line */}
        <div className="absolute bottom-0 left-[78px] right-0 h-[0.5px] bg-[var(--border-color)]/25 pointer-events-none" />
      </div>
    );
  };

  const renderInlineHeader = (title: string, count?: number) => {
    return (
      <div className="px-4 py-2 bg-[var(--bg-main)]/30 border-b border-t border-[var(--border-color)]/5 select-none flex items-center justify-between first:border-t-0 font-sans">
        <span className="text-[9.5px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0494f4]"></span>
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="text-[9px] font-black text-[#0494f4] bg-[#0494f4]/15 px-1.5 h-4.5 rounded-full flex items-center justify-center font-mono">
            {count}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y font-sans">
      <div className="flex-grow overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        
        {/* Search Bar */}
        <CommonSearchBar 
          placeholder="Search global profiles, contacts, username..."
          value={discoverSearchTerm}
          onChange={setDiscoverSearchTerm}
          onClear={() => setDiscoverSearchTerm('')}
        />

        <div className="flex flex-col mt-1 bg-[var(--bg-card)]">
          {discoverSearchTerm ? (
            /* Search results view and header */
            <div className="flex flex-col bg-[var(--bg-card)]">
              {renderInlineHeader('Global Network Discovery', userResults.filter(p => !hiddenUserIds.includes(p.uid)).length)}
              {discoverLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2 bg-[var(--bg-card)]">
                  <Loader2 className="animate-spin text-[#0494f4]" size={22} />
                  <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-wider">Searching direct entries...</p>
                </div>
              ) : userResults.filter(p => !hiddenUserIds.includes(p.uid)).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center px-4 gap-2 bg-[var(--bg-card)]">
                  <Users size={22} className="text-[var(--text-secondary)] opacity-50 shrink-0" />
                  <div>
                    <h4 className="text-[13px] font-bold text-[var(--text-primary)]">No profiles matched</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] px-4 leading-tight mt-0.5">Please check spelling or type correct username references.</p>
                  </div>
                </div>
              ) : (
                userResults.filter(p => !hiddenUserIds.includes(p.uid)).map(profile => {
                  const isMutual = contacts.some(c => c.uid === profile.uid);
                  return renderUserProfileRow(profile, isMutual);
                })
              )}
            </div>
          ) : (
            /* Default Contacts List View */
            <div className="flex flex-col bg-[var(--bg-card)]">
              
              {/* Only show requests folder if not browsing search keyword results */}
              <div 
                onClick={() => navigate('/chats/requests')}
                className="relative flex items-center gap-3 px-3 py-2 min-h-[72px] transition-all duration-205 group cursor-pointer select-none bg-[var(--bg-card)] hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/8"
              >
                <div className="relative shrink-0 w-[54px] h-[54px]">
                  <div className="w-full h-full rounded-full bg-[#0494f4]/10 dark:bg-zinc-800/60 flex items-center justify-center text-[#0494f4] group-hover:scale-[1.02] transition-transform border border-[var(--border-color)]/15">
                    <Users size={22} className="text-[#0494f4] stroke-[2.2]" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
                  <h3 className="text-[16px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[var(--primary)] transition-colors">
                    Pending Requests
                  </h3>
                  <p className="text-[15px] truncate text-[var(--text-secondary)] mt-0.5 font-normal opacity-75">
                    Incoming friend requests
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 mr-1">
                  <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-20 group-hover:opacity-70 group-hover:translate-x-0.5 transition-all duration-200" />
                </div>

                {/* Separator Line */}
                <div className="absolute bottom-0 left-[78px] right-0 h-[0.5px] bg-[var(--border-color)]/25 pointer-events-none" />
              </div>

              {contactsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-2">
                  <Loader2 className="animate-spin text-[#0494f4]" size={22} />
                  <p className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-wider">Syncing Contacts...</p>
                </div>
              ) : contacts.length === 0 ? (
                <div className="px-5 py-12 text-center bg-[var(--bg-card)] flex flex-col items-center justify-center gap-3 select-none">
                  <div className="p-3 bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] border border-[var(--border-color)]/10 shadow-sm">
                    <UserCheck size={28} className="opacity-75" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-[var(--text-primary)] tracking-wider">No contacts synced yet</h4>
                    <p className="text-[11px] text-[var(--text-secondary)] max-w-xs leading-relaxed mt-1">
                      Discover people globally using search. Once they follow you back, they will appear in your contacts channel instantly!
                    </p>
                  </div>
                </div>
              ) : (
                contacts.map(profile => renderUserProfileRow(profile, true))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
