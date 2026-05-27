import { storage } from './StorageService';

export interface LocalCacheConfig {
  maxAge: number; // in milliseconds
}

const DEFAULT_CONFIG: LocalCacheConfig = {
  maxAge: 1000 * 60 * 15, // 15 minutes default TTL
};

class LocalDataCacheService {
  private memoryCache: Record<string, { value: any; timestamp: number }> = {};
  private listeners: Record<string, Set<(payload?: any) => void>> = {};

  /**
   * Safe helper to subscribe to cache-level updates or manual triggers.
   * Returns an unsubscribe function.
   */
  public subscribe(topic: string, callback: (payload?: any) => void): () => void {
    if (!this.listeners[topic]) {
      this.listeners[topic] = new Set();
    }
    this.listeners[topic].add(callback);
    return () => {
      this.listeners[topic]?.delete(callback);
      if (this.listeners[topic]?.size === 0) {
        delete this.listeners[topic];
      }
    };
  }

  /**
   * Safe helper to notify subscribers on a dynamic topic.
   */
  public notify(topic: string, payload?: any): void {
    if (this.listeners[topic]) {
      this.listeners[topic].forEach((callback) => {
        try {
          callback(payload);
        } catch (e) {
          console.error(`Error in subscriber notification for topic ${topic}:`, e);
        }
      });
    }
  }

  /**
   * Safe helper to write data to storage with a TTL timestamp.
   * Handles memory fallback automatically through StorageService.
   */
  public set(key: string, value: any): void {
    const item = {
      value,
      timestamp: Date.now(),
    };
    try {
      this.memoryCache[key] = item;
      storage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn(`LocalDataCache write failed for key ${key}. Memory backup used.`, e);
    }
  }

  /**
   * Safe helper to fetch cached data, respecting expiry.
   * Returns null if not exists or if expired.
   */
  public get<T>(key: string, maxAge = DEFAULT_CONFIG.maxAge): T | null {
    // Check memory cache first (instantly fast)
    const memItem = this.memoryCache[key];
    if (memItem) {
      if (Date.now() - memItem.timestamp < maxAge) {
        return memItem.value as T;
      }
    }

    // Try storage service
    const rawData = storage.getItem(key);
    if (!rawData) return null;

    try {
      const item = JSON.parse(rawData);
      if (item && typeof item === 'object' && 'timestamp' in item && 'value' in item) {
        // Save to memory cache for fast subsequent hits
        this.memoryCache[key] = item;

        if (Date.now() - item.timestamp < maxAge) {
          return item.value as T;
        }
      }
    } catch (e) {
      console.warn(`LocalDataCache parse failed for key ${key}`, e);
    }

    return null;
  }

  /**
   * Explicitly invalidate a cache key.
   */
  public remove(key: string): void {
    delete this.memoryCache[key];
    storage.removeItem(key);
  }

  // --- Specific Conveniences for Conversations ---
  
  public getConversations(myUserId: string): any[] | null {
    return this.get<any[]>(`gx_convs_${myUserId}`, 1000 * 60 * 60 * 24); // Keep cached convs valid for 24h to support fast offline launch
  }

  public saveConversations(myUserId: string, conversations: any[]): void {
    this.set(`gx_convs_${myUserId}`, conversations);
  }

  /**
   * Instantly updates the last message of a cached conversation and pushes it to the top.
   */
  public updateLastMessage(myUserId: string, conversationId: string, lastMessageText: string, timestamp: string = new Date().toISOString()): void {
    const list = this.getConversations(myUserId);
    if (list && Array.isArray(list)) {
      let found = false;
      const updated = list.map((conv: any) => {
        if (conv.id === conversationId) {
          found = true;
          return {
            ...conv,
            lastMsg: lastMessageText,
            lastMsgAt: timestamp,
            time: this.formatTimeForCache(new Date(timestamp)),
          };
        }
        return conv;
      }).sort((a: any, b: any) => {
        return new Date(b.lastMsgAt).getTime() - new Date(a.lastMsgAt).getTime();
      });
      
      this.saveConversations(myUserId, updated);
      this.notify('conversations', updated);

      if (!found) {
        // If conversation is new and not in cached conversations list, notify to trigger server fetch
        this.notify('conversations');
      }
    } else {
      this.notify('conversations');
    }
  }

  /**
   * Instantly marks a cached conversation's unread badge to 0.
   */
  public clearUnreadCount(myUserId: string, conversationId: string): void {
    const list = this.getConversations(myUserId);
    if (list && Array.isArray(list)) {
      let changed = false;
      const updated = list.map((conv: any) => {
        if (conv.id === conversationId && (conv.unread || conv.unreadCount > 0)) {
          changed = true;
          return {
            ...conv,
            unread: false,
            unreadCount: 0
          };
        }
        return conv;
      });
      if (changed) {
        this.saveConversations(myUserId, updated);
        this.notify('conversations', updated);
      }
    }
  }

  private formatTimeForCache(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    return date.toLocaleDateString();
  }

  // --- Specific Conveniences for Chat Messages ---

  public getMessages(conversationId: string): any[] | null {
    return this.get<any[]>(`gx_msgs_${conversationId}`, 1000 * 60 * 60 * 24); // Valid for 24 hours
  }

  public saveMessages(conversationId: string, messages: any[]): void {
    // Only cache last 50 messages to keep local footprint light & super fast
    const pruned = messages.slice(-50);
    this.set(`gx_msgs_${conversationId}`, pruned);
  }

  public addMessageToCache(conversationId: string, message: any): void {
    const list = this.getMessages(conversationId) || [];
    if (list.some((m: any) => m.id === message.id)) return;
    const updated = [...list, message].sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    this.saveMessages(conversationId, updated);
    this.notify(`messages:${conversationId}`, updated);
  }

  public updateMessageInCache(conversationId: string, messageId: string, fieldsToUpdate: any): void {
    const list = this.getMessages(conversationId);
    if (list && Array.isArray(list)) {
      const updated = list.map((m: any) => {
        if (m.id === messageId) {
          return { ...m, ...fieldsToUpdate };
        }
        return m;
      });
      this.saveMessages(conversationId, updated);
      this.notify(`messages:${conversationId}`, updated);
    }
  }

  // --- Specific Conveniences for Vibe Feeds ---

  public getVibeVideos(): any[] | null {
    return this.get<any[]>('gx_vibe_feed', 1000 * 60 * 30); // 30 minutes video feed cache
  }

  public saveVibeVideos(videos: any[]): void {
    this.set('gx_vibe_feed', videos);
  }

  // --- Specific Conveniences for Home Feed & Stories ---

  public getHomeFeed(myUserId: string): any[] | null {
    return this.get<any[]>(`gx_home_feed_${myUserId}`, 1000 * 60 * 15); // 15 mins cache
  }

  public saveHomeFeed(myUserId: string, posts: any[]): void {
    this.set(`gx_home_feed_${myUserId}`, posts);
  }

  public getHomeStories(myUserId: string): any[] | null {
    return this.get<any[]>(`gx_home_stories_${myUserId}`, 1000 * 60 * 30); // 30 mins cache
  }

  public saveHomeStories(myUserId: string, stories: any[]): void {
    this.set(`gx_home_stories_${myUserId}`, stories);
  }

  // --- Specific Conveniences for Reels Feed ---

  public getReelsFeed(): any[] | null {
    return this.get<any[]>('gx_reels_feed', 1000 * 60 * 15); // 15 mins cache
  }

  public saveReelsFeed(reels: any[]): void {
    this.set('gx_reels_feed', reels);
  }
}

export const LocalDataCache = new LocalDataCacheService();
