import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { storage } from '../services/StorageService';

interface CustomUser extends User {
  uid: string; // Add uid to match Firebase interface expected by the rest of the app
}

interface AuthContextType {
  user: CustomUser | null;
  userData: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
  refreshUserData: () => Promise<void>;
  followingIds: string[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<CustomUser | null>(() => {
    try {
      const cached = storage.getItem('grix_cached_user');
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });

  const [userData, setUserData] = useState<UserProfile | null>(() => {
    try {
      const cached = storage.getItem('grix_cached_userdata');
      return cached ? JSON.parse(cached) : null;
    } catch (_) {
      return null;
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      return !storage.getItem('grix_cached_user');
    } catch (_) {
      return true;
    }
  });

  const [isAuthReady, setIsAuthReady] = useState(() => {
    try {
      return !!storage.getItem('grix_cached_user');
    } catch (_) {
      return false;
    }
  });

  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const profileChannelRef = React.useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchProfileData = async (currentUserId: string, isSubscribed: boolean) => {
    if (!supabase) return;
    try {
      // Offline fallback check first
      if (!navigator.onLine) {
        console.log('Detected offline state during profile fetch, using cached profile.');
        const cachedRaw = storage.getItem('grix_cached_userdata');
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (cached && cached.id === currentUserId) {
              setUserData(cached);
              if (cached.following) {
                setFollowingIds(cached.following);
              }
              return;
            }
          } catch (_) {}
        }
      }

      let { data: profile, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle();

      if (fetchError) {
        console.warn('Error fetching profile:', fetchError);
        // Fallback to cache on query error if offline/network issue
        const isNetworkErr = !navigator.onLine || fetchError.message?.toLowerCase().includes('fetch') || fetchError.message?.toLowerCase().includes('network');
        if (isNetworkErr) {
          const cachedRaw = storage.getItem('grix_cached_userdata');
          if (cachedRaw) {
            try {
              const cached = JSON.parse(cachedRaw);
              if (cached && cached.id === currentUserId) {
                // Ensure local offline cache is also truncated if it was legacy too-long
                if (cached.username && cached.username.length > 15) {
                  cached.username = cached.username.substring(0, 15);
                }
                setUserData(cached);
                if (cached.following) {
                  setFollowingIds(cached.following);
                }
                return;
              }
            } catch (_) {}
          }
        }
      }

      // Automatically truncate legacy too-long user names on load
      if (profile && profile.username && profile.username.length > 15) {
        const truncated = profile.username.substring(0, 15);
        console.log(`Auto-truncating legacy username for user ${currentUserId}: ${profile.username} -> ${truncated}`);
        const { data: updatedProfile, error: updateError } = await supabase
          .from('users')
          .update({ username: truncated } as any)
          .eq('id', currentUserId)
          .select()
          .maybeSingle();

        if (!updateError && updatedProfile) {
          profile = updatedProfile;
        } else {
          profile.username = truncated;
        }
      }

      if (!profile) {
        // If we get here and we are truly offline/network is broken, we should avoid auto-creating as it will fail
        if (!navigator.onLine) {
          return;
        }
        // Safe auto-creation of profile row
        const email = user?.email || '';
        const emailPrefix = email ? email.split('@')[0] : 'grix_user';
        const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        // Strict 15-char substring
        const finalUsername = `${baseUsername || 'user'}_${randomSuffix}`.substring(0, 15);
        const fullName = user?.user_metadata?.full_name || emailPrefix || 'Grix User';
        const photoUrl = user?.user_metadata?.avatar_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`;

        console.log('Inserting auto-generated profile for', currentUserId);
        const { data: insertedProfile, error: insertError } = await supabase
          .from('users')
          .upsert({
            id: currentUserId,
            email: email,
            full_name: fullName,
            username: finalUsername,
            photo_url: photoUrl,
            updated_at: new Date().toISOString()
          } as any)
          .select()
          .maybeSingle();

        if (insertError) {
          console.error('Error inserting auto-generated profile:', insertError);
        } else if (insertedProfile) {
          profile = insertedProfile;
        }
      } else if (!profile.username) {
        // Profile exists but username is missing
        const email = profile.email || user?.email || '';
        const emailPrefix = email ? email.split('@')[0] : 'grix_user';
        const baseUsername = emailPrefix.toLowerCase().replace(/[^a-z0-9_]/g, '');
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        // Strict 15-char substring
        const finalUsername = `${baseUsername || 'user'}_${randomSuffix}`.substring(0, 15);

        console.log('Updating missing username for existing profile', currentUserId);
        const { data: updatedProfile, error: updateError } = await supabase
          .from('users')
          .update({ username: finalUsername } as any)
          .eq('id', currentUserId)
          .select()
          .maybeSingle();

        if (updateError) {
          console.error('Error updating missing username:', updateError);
        } else if (updatedProfile) {
          profile = updatedProfile;
        }
      }

      // Fetch following and followers with safety catch blocks to prevent crash block on offline
      let following: string[] = [];
      let followerIds: string[] = [];
      try {
        const { data: followings } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId);

        const { data: followers } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('following_id', currentUserId);

        following = followings?.map(f => f.following_id) || [];
        followerIds = followers?.map(f => f.follower_id) || [];
        setFollowingIds(following);
      } catch (followsErr) {
        console.warn('Error fetching follows offline, falling back:', followsErr);
        const cachedRaw = storage.getItem('grix_cached_userdata');
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            following = cached.following || [];
            followerIds = cached.followers || [];
            setFollowingIds(following);
          } catch (_) {}
        }
      }

      if (isSubscribed && profile) {
        const p = profile as any;
        setUserData({
          id: p.id,
          uid: p.id,
          email: p.email,
          fullName: p.full_name,
          username: p.username,
          photoURL: p.photo_url,
          bio: p.bio,
          isVerified: p.is_verified,
          profileType: p.profile_type,
          lastSeen: p.last_seen,
          status: p.is_online ? 'online' : 'offline',
          hiddenChats: p.hidden_chats || [],
          archivedChats: p.archived_chats || [],
          hiddenChatSettings: p.hidden_chat_settings || p.settings?.hidden_chat_settings || {},
          fcmTokens: p.fcm_tokens || [],
          settings: p.settings,
          lock: p.lock,
          saved_posts: p.saved_posts || [],
          blockedUsers: p.blocked_users || [],
          blocked_users: p.blocked_users || [],
          muted_users: p.muted_users || [],
          favorites: p.favorites || [],
          following,
          followers: followerIds
        } as any);
      }
    } catch (err) {
      console.warn('Profile fetch error:', err);
      // Main fallback on catch
      const cachedRaw = storage.getItem('grix_cached_userdata');
      if (cachedRaw) {
        try {
          const cached = JSON.parse(cachedRaw);
          if (cached && cached.id === currentUserId) {
            setUserData(cached);
            if (cached.following) {
              setFollowingIds(cached.following);
            }
          }
        } catch (_) {}
      }
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchProfileData(user.id, true);
    }
  };

  // 1. Auth Listener (Runs once on mount)
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setIsAuthReady(true);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      try {
        const supabaseUser = session?.user ?? null;
        const currentUser = supabaseUser ? { ...supabaseUser, uid: supabaseUser.id } as CustomUser : null;
        
        if (event === 'SIGNED_OUT') {
          // Explicitly set offline when signing out
          if (user?.id) {
            supabase.from('users')
              .update({ is_online: false, last_seen: new Date().toISOString() } as any)
              .eq('id', user.id)
              .then(() => {}, (e) => console.warn('Signout offline status update error:', e));
          }
          setUserData(null);
          setUser(null);
          setLoading(false);
          setIsAuthReady(true);
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || (event as string) === 'USER_UPDATED') {
          if (supabaseUser) {
            supabase.from('users')
              .update({ is_online: true, last_seen: new Date().toISOString() } as any)
              .eq('id', supabaseUser.id)
              .then(() => {}, (e) => console.warn('Signin online status update error:', e));
          }
          setUser(currentUser);
          // If there's no user, we're ready. If there is, the profile effect will handle it.
          if (!supabaseUser) {
            setLoading(false);
            setIsAuthReady(true);
          }
        } else {
          setUser(currentUser);
          if (!supabaseUser) {
            setLoading(false);
            setIsAuthReady(true);
          }
        }
      } catch (err) {
        console.error('onAuthStateChange execution catch:', err);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    // Get initial session and ensure loading states are set correctly
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const supabaseUser = session?.user ?? null;
        const currentUser = supabaseUser ? { ...supabaseUser, uid: supabaseUser.id } as CustomUser : null;
        
        if (currentUser) {
          setUser(currentUser);
          // If already logged in, the second effect will handle fetching profile and setting ready
        } else {
          setUser(null);
          setLoading(false);
          setIsAuthReady(true);
        }
      } catch (err) {
        console.error('Initial session fetch error:', err);
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 2. Profile and Presence Effect (Runs when user changes)
  useEffect(() => {
    if (!user || !supabase) return;

    const currentUserId = user.id;
    let isSubscribed = true;

    const setupProfileAndPresence = async () => {
      setLoading(true);
      setIsAuthReady(false);

      try {
        // Cleanup previous
        if (profileChannelRef.current) {
          supabase.removeChannel(profileChannelRef.current);
          profileChannelRef.current = null;
        }
        if (presenceChannelRef.current) {
          supabase.removeChannel(presenceChannelRef.current);
          presenceChannelRef.current = null;
        }

        // 1. Initial Fetch with strict 3-second timeout protection
        const fetchPromise = fetchProfileData(currentUserId, isSubscribed);
        const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 3000));
        
        const fetchResult = await Promise.race([fetchPromise, timeoutPromise]);
        if (fetchResult === 'timeout') {
          console.warn('Profile fetch timed out (3s), proceeding in background to prevent splash screen lock.');
        }

        // 2. Profile Subscription (Listen to ALL events for this user)
        const profileChannel = supabase
          .channel(`profile-${currentUserId}`)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'users',
            filter: `id=eq.${currentUserId}`
          }, (payload) => {
            if (!isSubscribed) return;
            fetchProfileData(currentUserId, isSubscribed);
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'follows',
            filter: `follower_id=eq.${currentUserId}`
          }, () => {
            if (!isSubscribed) return;
            fetchProfileData(currentUserId, isSubscribed);
          })
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'follows',
            filter: `following_id=eq.${currentUserId}`
          }, () => {
            if (!isSubscribed) return;
            fetchProfileData(currentUserId, isSubscribed);
          });
        
        profileChannel.subscribe();
        profileChannelRef.current = profileChannel;

        // 3. Presence Subscription
        const presenceChannel = supabase.channel('online-users', {
          config: { presence: { key: currentUserId } },
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {})
          .on('presence', { event: 'join' }, ({ key }) => {
            if (key === currentUserId) {
              supabase.from('users')
                .update({ is_online: true, last_seen: new Date().toISOString() } as any)
                .eq('id', currentUserId)
                .then();
            }
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (key === currentUserId) {
              supabase.from('users')
                .update({ is_online: false, last_seen: new Date().toISOString() } as any)
                .eq('id', currentUserId)
                .then();
            }
          });

        presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({
              user_id: currentUserId,
              online_at: new Date().toISOString(),
            });
          }
        });
        presenceChannelRef.current = presenceChannel;

      } catch (err) {
        console.error('Profile setup error:', err);
      } finally {
        if (isSubscribed) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    };

    setupProfileAndPresence();

    return () => {
      isSubscribed = false;
      if (profileChannelRef.current) supabase.removeChannel(profileChannelRef.current);
      if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);
    };
  }, [user?.id]);

  // 3. Visibility, Heartbeat, and BeforeUnload Handler
  useEffect(() => {
    let heartbeatInterval: any = null;

    const setStatus = async (isOnline: boolean) => {
      if (supabase && user?.id) {
        try {
          await supabase.from('users')
            .update({
              is_online: isOnline,
              last_seen: new Date().toISOString()
            } as any)
            .eq('id', user.id);
        } catch (e) {
          console.warn('Unable to notify presence status change:', e);
        }
      }
    };

    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      setStatus(isVisible);
      
      // Control heartbeat interval based on active visibility
      if (isVisible) {
        if (!heartbeatInterval) {
          heartbeatInterval = setInterval(() => {
            setStatus(true);
          }, 60000);
        }
      } else {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
      }
    };

    const handleBeforeUnload = () => {
      setStatus(false);
    };

    // First trigger and establish heartbeat on mount
    setStatus(true);
    if (document.visibilityState === 'visible') {
      heartbeatInterval = setInterval(() => {
        setStatus(true);
      }, 60000);
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

  // Sync state changes with local offline backup cache
  useEffect(() => {
    if (user) {
      storage.setItem('grix_cached_user', JSON.stringify(user));
    } else {
      storage.removeItem('grix_cached_user');
      storage.removeItem('grix_cached_userdata');
    }
  }, [user]);

  useEffect(() => {
    if (userData) {
      storage.setItem('grix_cached_userdata', JSON.stringify(userData));
    }
  }, [userData]);

  // 4. Failsafe to guarantee auth ready state and prevent page freeze under slow/blocked connections
  useEffect(() => {
    const backupTimer = setTimeout(() => {
      if (!isAuthReady) {
        console.warn('Auth system initialization is taking too long. Activating failsafe auth-ready fallback.');
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 6000);
    return () => clearTimeout(backupTimer);
  }, [isAuthReady]);

  const authContextValue = React.useMemo(() => ({ 
    user, 
    userData, 
    loading, 
    isAuthReady,
    refreshUserData,
    followingIds
  }), [user, userData, loading, isAuthReady, followingIds]);

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
