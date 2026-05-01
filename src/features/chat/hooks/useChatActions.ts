import { useCallback } from 'react';
import { 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  setDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  getDocs,
  orderBy,
  increment
} from 'firebase/firestore';
import { db, auth } from '../../../services/firebase.ts';
import { ImageService } from '../../../services/ImageService.ts';
import { VideoService } from '../../../services/VideoService.ts';
import { GofileService } from '../services/GofileService.ts';
import { AudioService } from '../../../services/AudioService.ts';
import { toDate } from '../../../utils/dateUtils.ts';

export const useChatActions = (chatId: string, receiverId: string, receiver: any, receiverActiveChatId: string | null) => {
  
  const sendMessage = useCallback(async ({
    text,
    file,
    replyTo,
    onProgress
  }: {
    text: string;
    file?: File | Blob | null;
    replyTo?: any;
    onProgress?: (progress: number) => void;
  }) => {
    if (!auth.currentUser) return;

    try {
      let fileUrl = '';
      let fileType: 'text' | 'image' | 'video' | 'file' | 'audio' = 'text';
      let fileName = '';

      if (file) {
        fileName = (file as File).name || (file.type.startsWith('audio/') ? 'voice_message.webm' : 'file');
        if (file.type.startsWith('image/')) {
          fileUrl = await ImageService.uploadImage(file as File, onProgress);
          fileType = 'image';
        } else if (file.type.startsWith('video/')) {
          fileUrl = await VideoService.uploadVideo(file as File, onProgress);
          fileType = 'video';
        } else if (file.type.startsWith('audio/')) {
          fileUrl = await AudioService.uploadAudio(file, onProgress);
          fileType = 'audio';
        } else {
          fileUrl = await GofileService.uploadFile(file as File);
          fileType = 'file';
        }
      }

      const messageData = {
        chatId,
        senderId: auth.currentUser.uid,
        receiverId,
        text: text || (fileType === 'file' ? `Sent a file: ${fileName}` : fileType === 'video' ? 'Sent a video' : fileType === 'audio' ? 'Voice message' : ''),
        imageUrl: fileType === 'image' ? (fileUrl || null) : null,
        fileUrl: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (fileUrl || null) : null,
        fileName: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (fileName || null) : null,
        timestamp: serverTimestamp(),
        isRead: false,
        type: fileType,
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null
      };

      await addDoc(collection(db, "messages"), messageData);

      // Update Conversations Collection (Optimized for Chat List)
      const conversationRef = doc(db, "conversations", chatId);
      await setDoc(conversationRef, {
        lastMessage: messageData.text || (fileType === 'image' ? 'Sent an image' : 'Sent a file'),
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: auth.currentUser.uid,
        participants: [auth.currentUser.uid, receiverId],
        [`unreadCount_${receiverId}`]: increment(1)
      }, { merge: true });

      // Cleanup logic...
      setTimeout(async () => {
        try {
          const messagesRef = collection(db, "messages");
          const q = query(
            messagesRef, 
            where("chatId", "==", chatId)
          );
          const snapshot = await getDocs(q);
          
          if (snapshot.size >= 50) {
            const docs = [...snapshot.docs].sort((a, b) => {
              const timeA = toDate(a.data().timestamp)?.getTime() || 0;
              const timeB = toDate(b.data().timestamp)?.getTime() || 0;
              return timeA - timeB;
            });

            const batch = writeBatch(db);
            const oldestMsgs = docs.slice(0, 25);
            oldestMsgs.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
          }
        } catch (err) {
          console.error('Cleanup error:', err);
        }
      }, 2000);

      // Send Notification ONLY if receiver is not in THIS chat
      // Check for receiver tokens and ensure receiver is either offline OR in a different chat
      const myId = auth.currentUser.uid;
      const shouldNotify = receiverId !== 'gx-ai' && 
                           receiver?.fcmTokens?.length > 0 && 
                           receiverActiveChatId !== myId; // receiverActiveChatId is the ID of the user the receiver is CURRENTLY chatting with

      if (shouldNotify) {
        const notificationData: any = {
          chatId,
          senderId: myId,
          click_action: `/chat/${myId}`
        };

        if (fileType === 'image' && fileUrl) {
          notificationData.imageUrl = fileUrl;
        }

        fetch('/api/send-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokens: receiver.fcmTokens,
            title: `${auth.currentUser?.displayName || 'GrixChat User'}`,
            body: text || (fileType === 'image' ? 'Sent an image' : fileType === 'video' ? 'Sent a video' : 'Sent a file'),
            data: notificationData
          })
        }).catch(err => console.error('Notification error:', err));
      }
    } catch (error) {
      console.error("Error sending message:", error);
      throw error;
    }
  }, [chatId, receiverId, receiver, receiverActiveChatId]);

  const editMessage = useCallback(async (msgId: string, newText: string) => {
    await updateDoc(doc(db, "messages", msgId), {
      text: newText,
      isEdited: true
    });
  }, []);

  const deleteMessage = useCallback(async (msgId: string) => {
    await deleteDoc(doc(db, "messages", msgId));
  }, []);

  const reactToMessage = useCallback(async (msgId: string, emoji: string) => {
    if (!auth.currentUser) return;
    const msgRef = doc(db, "messages", msgId);
    const msgDoc = await getDoc(msgRef);
    if (msgDoc.exists()) {
      const reactions = msgDoc.data().reactions || {};
      if (reactions[auth.currentUser.uid] === emoji) {
        delete reactions[auth.currentUser.uid];
      } else {
        reactions[auth.currentUser.uid] = emoji;
      }
      await updateDoc(msgRef, { reactions });
    }
  }, []);

  const clearChat = useCallback(async () => {
    const q = query(collection(db, "messages"), where("chatId", "==", chatId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }, [chatId]);

  return { sendMessage, editMessage, deleteMessage, reactToMessage, clearChat };
};
