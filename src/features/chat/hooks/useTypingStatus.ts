import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { rtdb, auth } from '../../../services/firebase.ts';

export const useTypingStatus = (chatId: string, receiverId: string) => {
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);
  const lastTypingUpdateRef = useRef<number>(0);

  useEffect(() => {
    if (!chatId || !receiverId) return;

    const typingRef = ref(rtdb, `typing/${chatId}/${receiverId}`);
    const unsubscribe = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lastTyped = data.timestamp || 0;
        const now = Date.now();
        // In RTDB, if we use serverTimestamp, it might be a bit different to compare locally 
        // but usually it's fine for a 3s window
        if (data.isTyping && now - lastTyped < 3000) {
          setIsOtherTyping(true);
        } else {
          setIsOtherTyping(false);
        }
      } else {
        setIsOtherTyping(false);
      }
    });

    return () => unsubscribe();
  }, [chatId, receiverId]);

  const updateTypingStatus = async (typing: boolean) => {
    if (!auth.currentUser || !chatId) return;
    const myTypingRef = ref(rtdb, `typing/${chatId}/${auth.currentUser.uid}`);
    try {
      await set(myTypingRef, {
        isTyping: typing,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.error("Error updating typing status in RTDB:", err);
    }
  };

  const handleTyping = () => {
    const now = Date.now();
    if (now - lastTypingUpdateRef.current > 2000) {
      updateTypingStatus(true);
      lastTypingUpdateRef.current = now;
    }
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
      lastTypingUpdateRef.current = 0;
    }, 3000);
  };

  return { isOtherTyping, handleTyping };
};
