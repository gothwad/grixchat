import { useState, useEffect } from 'react';
import { auth, db } from '../../../services/firebase.ts';
import { doc, getDoc } from 'firebase/firestore';

export function useChatId(receiverId: string | undefined) {
  const [chatId, setChatId] = useState<string>('');
  const [convType, setConvType] = useState<'direct' | 'group'>('direct');

  useEffect(() => {
    if (!receiverId || !auth.currentUser) {
      setChatId('');
      return;
    }
    
    const checkId = async () => {
      if (!receiverId || !auth.currentUser) return;
      
      const rId = receiverId;
      if (rId === 'gx-ai' || rId === 'grix-ai') {
        const id = [auth.currentUser?.uid, 'gx-ai'].sort().join('_');
        setChatId(id);
        setConvType('direct');
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, "users", rId));
        if (userSnap.exists()) {
          const id = [auth.currentUser?.uid, rId].sort().join('_');
          setChatId(id);
          setConvType('direct');
        } else {
          setChatId(rId);
          setConvType('group');
        }
      } catch (err) {
        console.error("Error checking ID type:", err);
      }
    };
    checkId();
  }, [receiverId, auth.currentUser?.uid]);

  return { chatId, convType };
}
