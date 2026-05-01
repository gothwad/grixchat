import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from 'firebase/database';
import { auth, db, rtdb } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  loading: boolean;
  isAuthReady: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;
    let unsubscribeStatus: (() => void) | null = null;
    let unsubscribeConnected: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      console.log('Auth State Changed:', currentUser ? 'User Logged In' : 'No User');
      setIsAuthReady(false); // Reset ready state on every change
      try {
        // Cleanup previous listeners if any
        if (unsubscribeDoc) unsubscribeDoc();
        if (unsubscribeStatus) unsubscribeStatus();
        if (unsubscribeConnected) unsubscribeConnected();

        setUser(currentUser);
        
        if (currentUser) {
          const userDocRef = doc(db, "users", currentUser.uid);
          
          // Initial fetch
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              setUserData({ uid: currentUser.uid, ...userDoc.data() } as UserProfile);
            }
          } catch (e) {
            console.warn('Error fetching user doc:', e);
          }

          // RTDB Presence
          const statusRef = ref(rtdb, `/status/${currentUser.uid}`);
          const connectedRef = ref(rtdb, '.info/connected');

          unsubscribeConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === false) return;

            onDisconnect(statusRef).set({
              state: 'offline',
              last_changed: rtdbTimestamp(),
            }).then(() => {
              set(statusRef, {
                state: 'online',
                last_changed: rtdbTimestamp(),
              }).catch(e => console.warn('Error setting online status:', e));
            }).catch(e => console.warn('Error setting onDisconnect:', e));
          });

          // Sync Firestore online status from RTDB
          unsubscribeStatus = onValue(statusRef, (snapshot) => {
            const val = snapshot.val();
            if (val) {
              updateDoc(userDocRef, {
                isOnline: val.state === 'online',
                lastSeen: serverTimestamp()
              }).catch(e => console.warn('Error updating firestore status:', e));
            }
          });

          // Real-time listener for profile changes
          unsubscribeDoc = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
              setUserData({ uid: currentUser.uid, ...doc.data() } as UserProfile);
            }
          }, (err) => console.warn('User doc snapshot error:', err));

          setLoading(false);
          // Small delay to ensure state is synchronized
          setTimeout(() => setIsAuthReady(true), 100);
        } else {
          setUserData(null);
          setLoading(false);
          setTimeout(() => setIsAuthReady(true), 100);
        }
      } catch (e) {
        console.error('Auth state change error:', e);
        setLoading(false);
        setIsAuthReady(true);
      }
    });

    // Handle visibility change for online status
    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        const isOnline = document.visibilityState === 'visible';
        updateDoc(doc(db, "users", auth.currentUser.uid), {
          isOnline,
          lastSeen: serverTimestamp()
        }).catch(e => console.warn('Visibility change update error:', e));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
      if (unsubscribeStatus) unsubscribeStatus();
      if (unsubscribeConnected) unsubscribeConnected();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAuthReady }}>
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
