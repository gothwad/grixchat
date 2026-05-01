import { useState, useEffect, useRef } from 'react';
import { ref, onValue, set, serverTimestamp } from 'firebase/database';
import { rtdb } from '../../../services/firebase';

export const useTyping = (chatId: string, userId: string, receiverId: string) => {
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
    if (!userId) return;
    const myTypingRef = ref(rtdb, `typing/${chatId}/${userId}`);
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
