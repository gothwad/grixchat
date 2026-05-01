import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, getDoc, doc } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase.ts';
import { toDate } from '../../../utils/dateUtils.ts';

export const useCalls = (activeFilter: string) => {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;
    if (activeFilter !== 'Calls') return;

    setLoading(true);
    const q = query(collection(db, "calls"));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const allCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) }));
      
      const relevantCalls = allCalls.filter((data: any) => {
        const isCaller = data.callerId === auth.currentUser?.uid;
        const isReceiver = data.receiverId === auth.currentUser?.uid;
        return (isCaller || isReceiver) && data.status === 'ended';
      }).sort((a: any, b: any) => {
        const timeA = toDate(a.timestamp)?.getTime() || Date.now();
        const timeB = toDate(b.timestamp)?.getTime() || Date.now();
        return timeB - timeA;
      });

      const callList = await Promise.all(relevantCalls.map(async (data: any) => {
        const isCaller = data.callerId === auth.currentUser?.uid;
        const otherUserId = isCaller ? data.receiverId : data.callerId;
        
        const userDoc = await getDoc(doc(db, "users", otherUserId || 'unknown'));
        const userData = userDoc.data();

        return {
          id: data.id,
          otherUserId,
          user: userData?.fullName || userData?.username || 'Unknown User',
          avatar: userData?.photoURL || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
          type: data.type,
          isIncoming: !isCaller,
          isMissed: data.isMissed || false,
          time: toDate(data.timestamp) ? new Date(toDate(data.timestamp)!).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'
        };
      }));

      setCalls(callList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeFilter]);

  return { calls, loading };
};
