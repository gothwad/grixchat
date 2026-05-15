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
  increment,
  limit,
  getCountFromServer
} from 'firebase/firestore';
import { db, auth } from '../../../services/firebase.ts';
import { ImageService } from '../../../services/ImageService.ts';
import { VideoService } from '../../../services/VideoService.ts';
import { GofileService } from '../services/GofileService.ts';
import { AudioService } from '../../../services/AudioService.ts';
import { toDate } from '../../../utils/dateUtils.ts';

export const useChatActions = (chatId: string, receiverId: string, receiver: any, receiverActiveChatId: string | null) => {
  
  const cleanupMessages = useCallback(async (targetChatId: string) => {
    if (!targetChatId) return;
    
    try {
      const messagesRef = collection(db, "messages");
      const qCount = query(messagesRef, where("chatId", "==", targetChatId));
      
      const snapshot = await getCountFromServer(qCount);
      const count = snapshot.data().count;

      if (count > 50) {
        const qOldest = query(
          messagesRef, 
          where("chatId", "==", targetChatId),
          orderBy("timestamp", "asc"),
          limit(25)
        );
        
        const oldMsgs = await getDocs(qOldest);
        if (!oldMsgs.empty) {
          const batch = writeBatch(db);
          oldMsgs.docs.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
          console.log(`Auto-cleaned up ${oldMsgs.size} messages for chat ${targetChatId}`);
        }
      }
    } catch (error) {
      console.warn("Auto-cleanup failed:", error);
    }
  }, []);

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
      if (!chatId) {
        console.error("Cannot send message: chatId is empty");
        return;
      }
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

      const messageData: any = {
        chatId,
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'User',
        senderAvatar: auth.currentUser.photoURL || '',
        text: text || (fileType === 'file' ? `Sent a file: ${fileName}` : fileType === 'video' ? 'Sent a video' : fileType === 'audio' ? 'Voice message' : ''),
        imageUrl: fileType === 'image' ? (fileUrl || null) : null,
        fileUrl: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (fileUrl || null) : null,
        fileName: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (fileName || null) : null,
        timestamp: serverTimestamp(),
        isRead: false,
        type: fileType,
        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null
      };

      if (!receiverId.includes('_')) { // It's a direct message if receiverId is a UID
        messageData.receiverId = receiverId;
      }

      await addDoc(collection(db, "messages"), messageData);

      // Trigger automatic cleanup
      cleanupMessages(chatId).catch(console.error);

      // Update Conversations Collection
      if (chatId && chatId.trim() !== "" && (chatId.includes('_') || chatId.length > 5)) { 
        const conversationRef = doc(db, "conversations", chatId);
        const conversationSnap = await getDoc(conversationRef);
        const convData = conversationSnap.exists() ? conversationSnap.data() : null;
        
        const updateData: any = {
          lastMessage: messageData.text || (fileType === 'image' ? 'Sent an image' : 'Sent a file'),
          lastMessageTimestamp: serverTimestamp(),
          lastSenderId: auth.currentUser.uid,
        };

        if (convData) {
          // Increment unread count for everyone EXCEPT sender
          convData.participants.forEach((pId: string) => {
            if (pId !== auth.currentUser?.uid) {
              updateData[`unreadCount_${pId}`] = increment(1);
            }
          });
        }

        await setDoc(conversationRef, updateData, { merge: true });

        // Notifications logic
        if (convData) {
          const otherParticipants = convData.participants.filter((p: string) => p !== auth.currentUser?.uid);
          
          otherParticipants.forEach(async (pId: string) => {
            if (otherParticipants.length === 1) {
              const shouldNotify = receiverId !== 'gx-ai' && 
                                    receiver?.fcmTokens?.length > 0 && 
                                    receiverActiveChatId !== auth.currentUser?.uid;

              if (shouldNotify) {
                fetch('/api/send-notification', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tokens: receiver.fcmTokens,
                    title: auth.currentUser?.displayName || 'GrixChat User',
                    body: text || (fileType === 'image' ? 'Sent an image' : 'Sent a file'),
                    data: { chatId, senderId: auth.currentUser?.uid, click_action: `/chat/${chatId}` }
                  })
                }).catch(err => console.error('Notification error:', err));
              }
            }
          });
        }
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
