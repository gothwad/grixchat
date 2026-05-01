import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, getDocs, orderBy } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase.ts';
import { toDate } from '../../../utils/dateUtils.ts';
import { CacheService } from '../../../services/CacheService.ts';

export const useConversations = (activeFilter: string) => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;
    if (activeFilter === 'Calls') return;

    const q = query(
      collection(db, "conversations"),
      where("participants", "array-contains", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      // Sort docs in-memory to avoid composite index requirement while it's building
      const convDocs = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => {
          const timeA = toDate(a.lastMessageTimestamp)?.getTime() || 0;
          const timeB = toDate(b.lastMessageTimestamp)?.getTime() || 0;
          return timeB - timeA;
        });
      
      const otherUserIds = Array.from(new Set(convDocs.map((conv: any) => 
        conv.participants.find((p: string) => p !== auth.currentUser?.uid)
      ))).filter(Boolean) as string[];

      const userMap = new Map();
      const uncachedIds = otherUserIds.filter(id => !CacheService.getUser(id));

      otherUserIds.forEach(id => {
        const cached = CacheService.getUser(id);
        if (cached) userMap.set(id, cached);
      });

      if (uncachedIds.length > 0) {
        for (let i = 0; i < uncachedIds.length; i += 30) {
          const chunk = uncachedIds.slice(i, i + 30);
          const userSnap = await getDocs(query(collection(db, "users"), where("uid", "in", chunk)));
          userSnap.docs.forEach(d => {
            const data = d.data();
            userMap.set(d.id, data);
            CacheService.saveUser(d.id, data);
          });
        }
      }

      const chatList = convDocs.map((conv: any) => {
        const otherUserId = conv.participants.find((p: string) => p !== auth.currentUser?.uid);
        if (!otherUserId || otherUserId === 'gx-ai' || otherUserId === 'flow-ai' || otherUserId === 'grix-ai') return null;

        const userData = userMap.get(otherUserId);
        const unreadCount = conv[`unreadCount_${auth.currentUser?.uid}`] || 0;

        return {
          id: conv.id,
          otherUserId,
          user: userData?.fullName || userData?.username || 'Unknown User',
          username: userData?.username || '',
          fullName: userData?.fullName || '',
          lastMsg: conv.lastMessage,
          time: toDate(conv.lastMessageTimestamp) ? formatTime(toDate(conv.lastMessageTimestamp)) : 'Recently',
          avatar: userData?.photoURL || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
          unread: unreadCount > 0,
          unreadCount,
          isOnline: userData?.isOnline || false
        };
      }).filter(Boolean);

      setConversations(chatList);
      setLoading(false);
    });

    const formatTime = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (days === 1) return 'Yesterday';
      return date.toLocaleDateString();
    };

    return () => unsubscribe();
  }, [activeFilter]);

  return { conversations, loading };
};
