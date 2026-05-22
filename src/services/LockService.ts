/**
 * LockService handles the logic for the App Lock system.
 * It now interacts with Supabase to ensure the lock is synchronized across devices.
 */

import { supabase } from '../lib/supabase';

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const lockData: LockData = {
      isEnabled: true,
      type,
      hash: value
    };
    
    const { error } = await supabase
      .from('users')
      .update({ lock: lockData } as any)
      .eq('id', user.id);
    
    if (error) throw error;
  },

  disableLock: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const lockData: LockData = {
      isEnabled: false,
      type: null,
      hash: null
    };
    
    const { error } = await supabase
      .from('users')
      .update({ lock: lockData } as any)
      .eq('id', user.id);
    
    if (error) throw error;
  },

  verifyLock: (value: string, hash: string | null): boolean => {
    return hash === value;
  }
};
