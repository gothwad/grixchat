import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../providers/AuthProvider';
import { CacheService } from '../../../services/CacheService';

export const useChatRooms = () => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in-memory to avoid index building delays
      docs.sort((a: any, b: any) => {
        const timeA = a.lastMessageTime?.seconds || 0;
        const timeB = b.lastMessageTime?.seconds || 0;
        return timeB - timeA;
      });

      const chatRooms = await Promise.all(docs.map(async (data: any) => {
        const otherUserId = data.participants.find((id: string) => id !== user.uid);
        
        // Try cache first
        let otherUser: any = CacheService.getUser(otherUserId);
        if (!otherUser) {
          const userDoc = await getDoc(doc(db, "users", otherUserId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            otherUser = { ...userData, uid: otherUserId, timestamp: Date.now() };
            CacheService.saveUser(otherUserId, userData);
          } else {
            otherUser = null;
          }
        }

        return {
          id: data.id,
          ...data,
          otherUserId,
          user: otherUser
        };
      }));
      
      setRooms(chatRooms);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { rooms, loading };
};
