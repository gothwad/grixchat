/**
 * StorageService provides a safe interface for localStorage and sessionStorage.
 * It checks for availability and handles security policy restrictions in iframes.
 */

class StorageService {
  private isAvailable: boolean;
  private memoryStorage: Record<string, string> = {};

  constructor() {
    this.isAvailable = this.checkAvailability();
    // Pre-populate memory storage so memory is in sync with local storage if readable
    if (this.isAvailable) {
      try {
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key) {
            this.memoryStorage[key] = window.localStorage.getItem(key) || '';
          }
        }
      } catch (e) {
        console.warn('Silent localstorage reading prepopulation warning:', e);
      }
    }
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      const storage = window.localStorage;
      if (!storage) return false;
      
      storage.setItem(testKey, testKey);
      storage.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('LocalStorage is not available. Using memory fallback.', e);
      return false;
    }
  }

  getItem(key: string): string | null {
    // Read from memory map first as primary reference for iframe sandbox speed & reliability
    if (this.memoryStorage[key] !== undefined) {
      return this.memoryStorage[key];
    }
    if (!this.isAvailable) {
      return null;
    }
    try {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        this.memoryStorage[key] = val;
      }
      return val;
    } catch (e) {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    // Dual write: memory map and localStorage
    this.memoryStorage[key] = value;
    if (!this.isAvailable) return;
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed writing to localstorage, keeping in-memory only:', e);
    }
  }

  removeItem(key: string): void {
    delete this.memoryStorage[key];
    if (!this.isAvailable) return;
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed removing from localstorage, keeping in-memory only:', e);
    }
  }

  clear(): void {
    this.memoryStorage = {};
    if (!this.isAvailable) return;
    try {
      window.localStorage.clear();
    } catch (e) {
      console.warn('Failed clearing localstorage, keeping in-memory only:', e);
    }
  }
}

class SessionStorageService {
  private isAvailable: boolean;
  private memoryStorage: Record<string, string> = {};

  constructor() {
    this.isAvailable = this.checkAvailability();
    if (this.isAvailable) {
      try {
        for (let i = 0; i < window.sessionStorage.length; i++) {
          const key = window.sessionStorage.key(i);
          if (key) {
            this.memoryStorage[key] = window.sessionStorage.getItem(key) || '';
          }
        }
      } catch (e) {
        console.warn('Silent sessionStorage prepopulation warning:', e);
      }
    }
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__session_storage_test__';
      const storageSession = window.sessionStorage;
      if (!storageSession) return false;
      
      storageSession.setItem(testKey, testKey);
      storageSession.removeItem(testKey);
      return true;
    } catch (e) {
      console.warn('SessionStorage is not available. Using memory fallback.', e);
      return false;
    }
  }

  getItem(key: string): string | null {
    if (this.memoryStorage[key] !== undefined) {
      return this.memoryStorage[key];
    }
    if (!this.isAvailable) {
      return null;
    }
    try {
      const val = window.sessionStorage.getItem(key);
      if (val !== null) {
        this.memoryStorage[key] = val;
      }
      return val;
    } catch (e) {
      return null;
    }
  }

  setItem(key: string, value: string): void {
    this.memoryStorage[key] = value;
    if (!this.isAvailable) return;
    try {
      window.sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed writing to sessionStorage:', e);
    }
  }

  removeItem(key: string): void {
    delete this.memoryStorage[key];
    if (!this.isAvailable) return;
    try {
      window.sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed removing from sessionStorage:', e);
    }
  }
}

export const storage = new StorageService();
export const safeSessionStorage = new SessionStorageService();
