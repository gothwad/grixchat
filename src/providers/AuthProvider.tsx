import React, { createContext, useContext, useEffect, useState, useRef, useMemo } from 'react';
import { User, RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';
import { storage, safeSessionStorage } from '../services/StorageService';
import { userProfileService } from '../services/db/userProfileService';
import { sessionService } from '../services/db/sessionService';

interface CustomUser extends User {
  uid: string;
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
    } catch (_) { return null; }
  });

  const [userData, setUserData] = useState<UserProfile | null>(() => {
    try {
      const cached = storage.getItem('grix_cached_userdata');
      return cached ? JSON.parse(cached) : null;
    } catch (_) { return null; }
  });

  const [loading, setLoading] = useState(() => !storage.getItem('grix_cached_user'));
  const [isAuthReady, setIsAuthReady] = useState(() => !!storage.getItem('grix_cached_user'));
  const [followingIds, setFollowingIds] = useState<string[]>([]);

  const profileChannelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const sessionRegisteredRef = useRef<boolean>(false);

  const fetchProfileData = async (currentUserId: string, email: string, meta: any) => {
    const { profileData, following } = await userProfileService.fetchFullProfileData(currentUserId, email, meta);
    if (profileData) {
      setUserData(profileData);
      setFollowingIds(following);
    }
  };

  const refreshUserData = async () => {
    if (user?.id) {
      await fetchProfileData(user.id, user.email || '', user.user_metadata);
    }
  };

  // 1. Auth Listener and Session Bootstrap
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
          if (user?.id) {
            await userProfileService.throttledSetStatus(user.id, false, true);
          }
          setUserData(null);
          setUser(null);
          setLoading(false);
          setIsAuthReady(true);
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || (event as string) === 'USER_UPDATED') {
          if (supabaseUser) {
            await userProfileService.throttledSetStatus(supabaseUser.id, true, true);
          }
          setUser(currentUser);
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
        console.error('onAuthStateChange execution error:', err);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const currentUser = session?.user ? { ...session.user, uid: session.user.id } as CustomUser : null;
        setUser(currentUser);
        if (!currentUser) {
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
    return () => subscription.unsubscribe();
  }, [user?.id]);

  // 2. Profile and Realtime Presence Subscriptions
  useEffect(() => {
    if (!user || !supabase) return;

    const currentUserId = user.id;
    let isSubscribed = true;

    const setupProfileAndPresence = async () => {
      setLoading(true);
      setIsAuthReady(false);

      try {
        if (profileChannelRef.current) supabase.removeChannel(profileChannelRef.current);
        if (presenceChannelRef.current) supabase.removeChannel(presenceChannelRef.current);

        // Fetch primary profile data with timeout race protection
        const fetchPromise = fetchProfileData(currentUserId, user.email || '', user.user_metadata);
        await Promise.race([fetchPromise, new Promise((res) => setTimeout(res, 2500))]);

        // Setup realtime profile change listener
        const profileChannel = supabase
          .channel(`profile-${currentUserId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'users', filter: `id=eq.${currentUserId}` }, () => {
            if (isSubscribed) fetchProfileData(currentUserId, user.email || '', user.user_metadata);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `follower_id=eq.${currentUserId}` }, () => {
            if (isSubscribed) fetchProfileData(currentUserId, user.email || '', user.user_metadata);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'follows', filter: `following_id=eq.${currentUserId}` }, () => {
            if (isSubscribed) fetchProfileData(currentUserId, user.email || '', user.user_metadata);
          });
        
        profileChannel.subscribe();
        profileChannelRef.current = profileChannel;

        // Setup Presence synchronization
        const presenceChannel = supabase.channel('online-users', { config: { presence: { key: currentUserId } } });
        presenceChannel
          .on('presence', { event: 'sync' }, () => {})
          .on('presence', { event: 'join' }, ({ key }) => {
            if (key === currentUserId) userProfileService.throttledSetStatus(currentUserId, true);
          })
          .on('presence', { event: 'leave' }, ({ key }) => {
            if (key === currentUserId) userProfileService.throttledSetStatus(currentUserId, false);
          });

        presenceChannel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await presenceChannel.track({ user_id: currentUserId, online_at: new Date().toISOString() });
          }
        });
        presenceChannelRef.current = presenceChannel;
      } catch (err) {
        console.error('Presence setup error:', err);
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

  // 3. Heartbeat & Tab Visibility (Throttled write-prevention: Issue 2)
  useEffect(() => {
    if (!user?.id) return;
    let heartbeatInterval: any = null;

    const updateStatus = (online: boolean) => {
      userProfileService.throttledSetStatus(user.id, online);
    };

    const handleVisibility = () => {
      const isVisible = document.visibilityState === 'visible';
      updateStatus(isVisible);
      if (isVisible) {
        if (!heartbeatInterval) {
          heartbeatInterval = setInterval(() => updateStatus(true), 60000);
        }
      } else if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    updateStatus(true);
    if (document.visibilityState === 'visible') {
      heartbeatInterval = setInterval(() => updateStatus(true), 60000);
    }

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', () => updateStatus(false));
    
    return () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user?.id]);

  // Sync cache records
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

  // Sync Device Login Session Metadata
  useEffect(() => {
    if (!user || !userData || !isAuthReady) return;
    sessionService.registerActiveSession(user.id, userData.settings).catch(() => {});
  }, [userData?.id]);

  // Secure instant remote logouts
  useEffect(() => {
    if (!user || !userData || !isAuthReady || !supabase) return;

    const sessId = safeSessionStorage.getItem('grix_current_session_id');
    if (!sessId) return;

    const activeSessions = (userData.settings as any)?.active_sessions;
    if (Array.isArray(activeSessions)) {
      const stillRegistered = activeSessions.some((s: any) => s.id === sessId);
      if (stillRegistered) {
        sessionRegisteredRef.current = true;
      } else if (sessionRegisteredRef.current) {
        console.warn('Revocation detected remotely. Signing out.');
        supabase.auth.signOut().then(() => {
          safeSessionStorage.removeItem('grix_current_session_id');
          storage.removeItem('grix_cached_user');
          storage.removeItem('grix_cached_userdata');
          window.location.reload();
        });
      }
    }
  }, [(userData?.settings as any)?.active_sessions]);

  // Bootstrap failsafe timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isAuthReady) {
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [isAuthReady]);

  const authContextValue = useMemo(() => ({ 
    user, userData, loading, isAuthReady, refreshUserData, followingIds 
  }), [user, userData, loading, isAuthReady, followingIds]);

  return <AuthContext.Provider value={authContextValue}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
