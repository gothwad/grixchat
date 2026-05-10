import { useState, useEffect } from 'react';
import { auth, db, rtdb } from '../../../services/firebase.ts';
import { ref as rtdbRef, onValue, update } from 'firebase/database';
import { 
  doc, 
  onSnapshot, 
  getDoc,
  serverTimestamp,
  updateDoc 
} from 'firebase/firestore';
import { CacheService } from '../../../services/CacheService.ts';

export function useChatSync(receiverId: string | undefined, chatId: string, convType: 'direct' | 'group') {
  const [receiver, setReceiver] = useState<any>(null);
  const [receiverStatus, setReceiverStatus] = useState<'online' | 'offline'>('offline');
  const [receiverActiveChatId, setReceiverActiveChatId] = useState<string | null>(null);
  const [receiverLastSeen, setReceiverLastSeen] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [watchData, setWatchData] = useState<any>(null);
  const [isWatchMode, setIsWatchMode] = useState(false);

  useEffect(() => {
    if (!receiverId || !auth.currentUser) return;

    if (convType === 'direct') {
      const cachedReceiver = CacheService.getUser(receiverId);
      if (cachedReceiver) setReceiver(cachedReceiver);

      const userDocRef = doc(db, "users", receiverId);
      const receiverUnsubscribe = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setReceiver(data);
          CacheService.saveUser(receiverId, data);
        }
      });

      const statusRef = rtdbRef(rtdb, `/status/${receiverId}`);
      const statusUnsubscribe = onValue(statusRef, (snapshot) => {
        const val = snapshot.val();
        if (val) {
          setReceiverStatus(val.state);
          setReceiverActiveChatId(val.activeChatId || null);
          setReceiverLastSeen(val.last_changed || null);
        } else {
          setReceiverStatus('offline');
          setReceiverActiveChatId(null);
          setReceiverLastSeen(null);
        }
      });
      return () => {
        receiverUnsubscribe();
        statusUnsubscribe();
      };
    } else {
      const groupDocRef = doc(db, "conversations", receiverId);
      const groupUnsubscribe = onSnapshot(groupDocRef, (snap) => {
        if (snap.exists()) {
          setReceiver(snap.data());
        }
      });
      return () => groupUnsubscribe();
    }
  }, [receiverId, convType]);

  useEffect(() => {
    if (!receiverId || !auth.currentUser) return;

    const chatSettingsRef = doc(db, "users", auth.currentUser.uid, "chatSettings", receiverId);
    const settingsUnsubscribe = onSnapshot(chatSettingsRef, (snap) => {
      if (snap.exists()) {
        setChatSettings(snap.data());
      } else {
        setChatSettings(null);
      }
    });

    const userUnsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setCurrentUserData(snap.data());
      }
    });

    if (auth.currentUser) {
      const myStatusRef = rtdbRef(rtdb, `/status/${auth.currentUser.uid}`);
      update(myStatusRef, { activeChatId: receiverId });
    }

    return () => {
      settingsUnsubscribe();
      userUnsubscribe();
      if (auth.currentUser) {
        const myStatusRef = rtdbRef(rtdb, `/status/${auth.currentUser.uid}`);
        update(myStatusRef, { activeChatId: null });
      }
    };
  }, [receiverId]);

  useEffect(() => {
    if (!chatId || chatId.trim() === "") return;
    const chatRef = doc(db, "conversations", chatId);
    const unsub = onSnapshot(chatRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWatchData(data);
        if (data.watchState?.isWatchActive !== undefined) {
          setIsWatchMode(data.watchState.isWatchActive);
        }
      }
    }, (err) => console.error("Sync error:", err));
    return () => unsub();
  }, [chatId]);

  const updateWatchState = async (updates: any) => {
    if (!auth.currentUser || !chatId) return;
    try {
      const chatRef = doc(db, "conversations", chatId);
      const newState: any = {
        "watchState.updatedBy": auth.currentUser.uid,
        "watchState.timestamp": serverTimestamp()
      };
      
      if (updates.isPlaying !== undefined) newState["watchState.isPlaying"] = updates.isPlaying;
      if (updates.currentTime !== undefined) newState["watchState.currentTime"] = updates.currentTime;
      
      await updateDoc(chatRef, newState);
    } catch (err) {
      console.error("Error updating watch state:", err);
    }
  };

  const toggleWatchMode = async () => {
    if (!chatId) return;
    const newMode = !isWatchMode;
    setIsWatchMode(newMode);
    try {
      await updateDoc(doc(db, "conversations", chatId), {
        "watchState.isWatchActive": newMode,
        "watchState.updatedBy": auth.currentUser?.uid,
        "watchState.timestamp": serverTimestamp(),
        "watchState.isPlaying": true,
        "watchState.currentTime": 0
      });
    } catch (err) {
      console.error("Error toggling watch mode:", err);
    }
  };

  return {
    receiver,
    receiverStatus,
    receiverActiveChatId,
    receiverLastSeen,
    chatSettings,
    currentUserData,
    watchData,
    isWatchMode,
    updateWatchState,
    toggleWatchMode
  };
}
