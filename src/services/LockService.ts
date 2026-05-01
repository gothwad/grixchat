/**
 * LockService handles the logic for the App Lock system.
 * It now interacts with Firebase Firestore to ensure the lock is synchronized across devices.
 */

import { auth, db } from './firebase.ts';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

export type LockType = 'pin4' | 'pin6' | 'alpha' | null;

interface LockData {
  isEnabled: boolean;
  type: LockType;
  hash: string | null;
}

export const LockService = {
  // We'll pass the userData from the context to get current lock status instantly
  getLockDataFromProfile: (profile: any): LockData => {
    if (profile?.lock) {
      return profile.lock;
    }
    return { isEnabled: false, type: null, hash: null };
  },

  enableLock: async (type: LockType, value: string) => {
    if (!auth.currentUser) return;
    const lockData: LockData = {
      isEnabled: true,
      type,
      hash: value
    };
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      lock: lockData
    });
  },

  disableLock: async () => {
    if (!auth.currentUser) return;
    const lockData: LockData = {
      isEnabled: false,
      type: null,
      hash: null
    };
    
    await updateDoc(doc(db, "users", auth.currentUser.uid), {
      lock: lockData
    });
  },

  verifyLock: (value: string, hash: string | null): boolean => {
    return hash === value;
  }
};
