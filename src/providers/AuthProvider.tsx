import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

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
  const [user, setUser] = useState<CustomUser | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const profileChannelRef = React.useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = React.useRef<RealtimeChannel | null>(null);

  const fetchProfileData = async (currentUserId: string, isSubscribed: boolean) => {
    if (!supabase) return;
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single();

      // Fetch following and followers
      const { data: followings } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', currentUserId);

      const { data: followers } = await supabase
        .from('follows')
        .select('follower_id')
        .eq('following_id', currentUserId);

      const following = followings?.map(f => f.following_id) || [];
      const followerIds = followers?.map(f => f.follower_id) || [];
      setFollowingIds(following);

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
          hiddenChatSettings: p.hidden_chat_settings,
          settings: p.settings,
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
      const supabaseUser = session?.user ?? null;
      const currentUser = supabaseUser ? { ...supabaseUser, uid: supabaseUser.id } as CustomUser : null;
      
      if (event === 'SIGNED_OUT') {
        // Explicitly set offline when signing out
        if (user?.id) {
          await supabase.from('users')
            .update({ is_online: false, last_seen: new Date().toISOString() } as any)
            .eq('id', user.id);
        }
        setUserData(null);
        setUser(null);
        setLoading(false);
        setIsAuthReady(true);
      } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || (event as string) === 'USER_UPDATED') {
        if (supabaseUser) {
          await supabase.from('users')
            .update({ is_online: true, last_seen: new Date().toISOString() } as any)
            .eq('id', supabaseUser.id);
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

        // 1. Initial Fetch
        await fetchProfileData(currentUserId, isSubscribed);

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

  // 3. Visibility and BeforeUnload Handler
  useEffect(() => {
    const setStatus = async (isOnline: boolean) => {
      if (supabase && user?.id) {
        await supabase.from('users')
          .update({
            is_online: isOnline,
            last_seen: new Date().toISOString()
          } as any)
          .eq('id', user.id);
      }
    };

    const handleVisibilityChange = () => {
      setStatus(document.visibilityState === 'visible');
    };

    const handleBeforeUnload = () => {
      // Use navigator.sendBeacon or a synchronous fetch if possible, 
      // but Supabase update is async. For beforeunload, we try our best.
      setStatus(false);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user?.id]);

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
