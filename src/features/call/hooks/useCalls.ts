import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { useAuth } from '../../../providers/AuthProvider';
import { CacheService } from '../../../services/CacheService';

export const useCalls = () => {
  const { user } = useAuth();
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "calls"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in-memory to avoid index building delays
      docs.sort((a: any, b: any) => {
        const timeA = a.timestamp?.seconds || 0;
        const timeB = b.timestamp?.seconds || 0;
        return timeB - timeA;
      });

      const callHistory = await Promise.all(docs.map(async (data: any) => {
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
      setCalls(callHistory);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { calls, loading };
};
