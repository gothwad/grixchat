import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  writeBatch, 
  doc, 
  Timestamp,
  getDocs,
  orderBy,
  limit,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from '../../../services/firebase.ts';
import { toDate } from '../../../utils/dateUtils.ts';

export const useChatMessages = (chatId: string, initialLimit: number = 20) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageLimit, setMessageLimit] = useState(initialLimit);
  const [loadingMore, setLoadingMore] = useState(false);
  const lastMessageCount = useRef(0);

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;

    setLoading(true);

    const q = query(
      collection(db, "messages"),
      where("chatId", "==", chatId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setLoading(false);
      setLoadingMore(false);
      
      // Sort and limit in-memory to avoid composite index requirement
      const allMsgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data({ serverTimestamps: 'estimate' })
      }));

      const firestoreMsgs = allMsgs
        .sort((a: any, b: any) => {
          const timeA = toDate(a.timestamp)?.getTime() || 0;
          const timeB = toDate(b.timestamp)?.getTime() || 0;
          return timeA - timeB; // Sort ascending for chat flow
        })
        .slice(-messageLimit); // Only take the latest based on limit
      
      setMessages(firestoreMsgs);

      // Mark as read and Reset Unread Count in Conversations
      const unreadMsgs = snapshot.docs.filter(doc => {
        const data = doc.data();
        return data.receiverId === auth.currentUser?.uid && !data.isRead;
      });

      if (unreadMsgs.length > 0) {
        const batch = writeBatch(db);
        unreadMsgs.forEach(msgDoc => {
          batch.update(msgDoc.ref, { isRead: true });
        });
        
        // Reset unread count for current user in this conversation
        const conversationRef = doc(db, "conversations", chatId);
        batch.update(conversationRef, {
          [`unreadCount_${auth.currentUser?.uid}`]: 0
        });

        batch.commit().catch(err => console.error("Error marking as read:", err));
      }
    });

    return () => unsubscribe();
  }, [chatId, messageLimit]);

  // Cleanup expired messages
  useEffect(() => {
    if (!chatId) return;
    const cleanupInterval = setInterval(async () => {
      try {
        const now = Timestamp.now();
        const q = query(
          collection(db, "messages"),
          where("chatId", "==", chatId)
        );
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const expiredMsgs = snapshot.docs.filter(doc => {
            const expiresAt = doc.data().expiresAt;
            return expiresAt && expiresAt.toMillis() <= now.toMillis();
          });

          if (expiredMsgs.length > 0) {
            const batch = writeBatch(db);
            expiredMsgs.forEach(msgDoc => batch.delete(msgDoc.ref));
            await batch.commit();
          }
        }
      } catch (err) {
        console.error("Cleanup error:", err);
      }
    }, 60000);
    return () => clearInterval(cleanupInterval);
  }, [chatId]);

  const loadMore = useCallback((currentHeight: number, scrollContainer: HTMLDivElement | null) => {
    if (!loadingMore && !loading && messages.length >= messageLimit) {
      setLoadingMore(true);
      setMessageLimit(prev => prev + 20);
      // Note: onSnapshot will trigger and update messages
    }
  }, [messages.length, messageLimit, loadingMore, loading]);

  return { 
    messages, 
    loading, 
    messageLimit, 
    loadingMore, 
    loadMore,
    lastMessageCount 
  };
};
