/**
 * StorageService provides a safe interface for localStorage and sessionStorage.
 * It checks for availability and handles security policy restrictions in iframes.
 */

class StorageService {
  private isAvailable: boolean;
  private memoryStorage: Record<string, string> = {};

  constructor() {
    this.isAvailable = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const testKey = '__storage_test__';
      // Accessing window.localStorage itself can throw in some iframe contexts
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
    if (!this.isAvailable) {
      return this.memoryStorage[key] || null;
    }
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return this.memoryStorage[key] || null;
    }
  }

  setItem(key: string, value: string): void {
    if (!this.isAvailable) {
      this.memoryStorage[key] = value;
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      this.memoryStorage[key] = value;
    }
  }

  removeItem(key: string): void {
    if (!this.isAvailable) {
      delete this.memoryStorage[key];
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch (e) {
      delete this.memoryStorage[key];
    }
  }

  clear(): void {
    if (!this.isAvailable) {
      this.memoryStorage = {};
      return;
    }
    try {
      window.localStorage.clear();
    } catch (e) {
      this.memoryStorage = {};
    }
  }
}

export const storage = new StorageService();
