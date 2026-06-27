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

/**
 * Standard pure JS implementation of SHA-256 hashing to secure PIN/passcode.
 */
function sha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }
  
  const words: number[] = [];
  const asciiLength = ascii.length;
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= (ascii.charCodeAt(i) & 0xff) << (24 - (i % 4) * 8);
  }
  
  words[asciiLength >> 2] |= 0x80 << (24 - (asciiLength % 4) * 8);
  const totalLengthInBits = asciiLength * 8;
  const wordLength = ((asciiLength + 8) >> 6) + 1;
  const paddedWordsLength = wordLength * 16;
  while (words.length < paddedWordsLength) {
    words.push(0);
  }
  words[paddedWordsLength - 1] = totalLengthInBits;
  
  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;
  
  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  
  for (let chunk = 0; chunk < wordLength; chunk++) {
    const w = new Array(64);
    const offset = chunk * 16;
    for (let i = 0; i < 16; i++) {
      w[i] = words[offset + i] || 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;
    
    for (let i = 0; i < 64; i++) {
      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;
      
      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }
    
    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }
  
  const hex = (value: number) => {
    return ('00000000' + (value >>> 0).toString(16)).slice(-8);
  };
  
  return hex(h0) + hex(h1) + hex(h2) + hex(h3) + hex(h4) + hex(h5) + hex(h6) + hex(h7);
}

export const LockService = {
  // Pass the userData from the context to get current lock status instantly
  getLockDataFromProfile: (profile: any): LockData => {
    if (profile?.settings?.lock) {
      return profile.settings.lock;
    }
    if (profile?.lock) {
      return profile.lock;
    }
    return { isEnabled: false, type: null, hash: null };
  },

  enableLock: async (type: LockType, value: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    const hashedValue = sha256(value);
    const lockData: LockData = {
      isEnabled: true,
      type,
      hash: hashedValue
    };
    
    // 1. Try to update the 'lock' column directly
    try {
      const { error } = await supabase
        .from('users')
        .update({ lock: lockData } as any)
        .eq('id', user.id);
        
      if (!error) return; // Success!
      console.warn("Direct lock column update failed, trying settings column fallback:", error);
    } catch (err) {
      console.warn("Direct lock update threw error, trying settings fallback:", err);
    }

    // 2. Fallback: Save inside settings JSONB field
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('settings')
        .eq('id', user.id)
        .single();
      
      const currentSettings = profile?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        lock: lockData
      };

      const { error: fallbackError } = await supabase
        .from('users')
        .update({ settings: updatedSettings } as any)
        .eq('id', user.id);
      
      if (fallbackError) throw fallbackError;
    } catch (err) {
      console.error('Lock fallback failed:', err);
      throw err;
    }
  },

  disableLock: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const lockData: LockData = {
      isEnabled: false,
      type: null,
      hash: null
    };
    
    // 1. Try to update the 'lock' column directly
    try {
      const { error } = await supabase
        .from('users')
        .update({ lock: lockData } as any)
        .eq('id', user.id);
        
      if (!error) return; // Success
      console.warn("Direct lock disable column update failed, trying settings fallback:", error);
    } catch (err) {
      console.warn("Direct lock disable check failed, using settings fallback:", err);
    }

    // 2. Fallback: Save inside settings JSONB field
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('settings')
        .eq('id', user.id)
        .single();
      
      const currentSettings = profile?.settings || {};
      const updatedSettings = {
        ...currentSettings,
        lock: lockData
      };

      const { error: fallbackError } = await supabase
        .from('users')
        .update({ settings: updatedSettings } as any)
        .eq('id', user.id);
      
      if (fallbackError) throw fallbackError;
    } catch (err) {
      console.error('Lock disable fallback failed:', err);
      throw err;
    }
  },

  verifyLock: (value: string, hash: string | null): boolean => {
    if (!hash) return false;
    const hashed = sha256(value);
    return hash === hashed || hash === value;
  }
};
