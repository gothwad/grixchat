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

      console.log(`🔍 [CLEANUP CHECK] Chat: ${targetChatId} | Current total messages: ${count}`);

      // If more than 25 messages, delete the overflow back to 20
      if (count >= 25) {
        const deleteCount = count - 20;
        console.log(`⚠️ [OVERFLOW DETECTED] Attempting to remove ${deleteCount} oldest messages to keep last 20...`);
        
        // Fetch WITHOUT orderBy to avoid composite index requirement
        // We fetch up to 500 messages to clean up existing large chats efficiently
        const qFetch = query(
          messagesRef, 
          where("chatId", "==", targetChatId),
          limit(500) 
        );
        
        const msgSnapshot = await getDocs(qFetch);
        if (!msgSnapshot.empty) {
          // Sort in memory by timestamp to find oldest
          const sortedDocs = msgSnapshot.docs.sort((a, b) => {
            const dataA = a.data();
            const dataB = b.data();
            
            // Robust timestamp extraction
            const getTime = (data: any) => {
              if (!data.timestamp) return 0;
              if (typeof data.timestamp.toMillis === 'function') return data.timestamp.toMillis();
              if (data.timestamp.seconds) return data.timestamp.seconds * 1000;
              if (data.timestamp instanceof Date) return data.timestamp.getTime();
              return 0;
            };

            const timeA = getTime(dataA);
            const timeB = getTime(dataB);
            
            if (timeA === timeB) {
              // Tie-break with document ID to ensure stable sort
              return a.id.localeCompare(b.id);
            }
            return timeA - timeB; // Oldest first
          });

          const docsToDelete = sortedDocs.slice(0, Math.min(deleteCount, sortedDocs.length));
          const batch = writeBatch(db);
          
          docsToDelete.forEach(doc => {
            console.log(`🗑️ Deleting old message: ${doc.id}`);
            batch.delete(doc.ref);
          });
          
          await batch.commit();
          console.log(`✅ [CLEANUP COMPLETE] Successfully removed ${docsToDelete.length} messages. New count should be ~20.`);
        }
      } else {
        console.log(`✨ [CLEANUP SKIP] Chat has ${count} messages (under limit of 25).`);
      }
    } catch (error: any) {
      console.error("❌ [CLEANUP FAILED ERROR]");
      console.error("Message:", error?.message);
    }
  }, []);

  const sendMessage = useCallback(async ({
    text,
    file,
    localPreviewUrl,
    replyTo,
    onProgress
  }: {
    text: string;
    file?: File | Blob | null;
    localPreviewUrl?: string;
    replyTo?: any;
    onProgress?: (progress: number) => void;
  }) => {
    if (!auth.currentUser || !chatId) return;

    let fileType: 'text' | 'image' | 'video' | 'file' | 'audio' = 'text';
    let fileName = '';

    if (file) {
      fileName = (file as File).name || (file.type.startsWith('audio/') ? 'voice_message.webm' : 'file');
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';
      else if (file.type.startsWith('audio/')) fileType = 'audio';
      else fileType = 'file';
    }

    // 1. Create message metadata immediately
    const messageData: any = {
      chatId,
      senderId: auth.currentUser.uid,
      senderName: auth.currentUser.displayName || 'User',
      senderAvatar: auth.currentUser.photoURL || '',
      text: text || (fileType === 'file' ? `Sent a file: ${fileName}` : fileType === 'video' ? 'Sent a video' : fileType === 'audio' ? 'Voice message' : ''),
      imageUrl: fileType === 'image' ? (localPreviewUrl || null) : null,
      fileUrl: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (localPreviewUrl || null) : null,
      fileName: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? (fileName || null) : null,
      timestamp: serverTimestamp(),
      isRead: false,
      type: fileType,
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, senderId: replyTo.senderId } : null,
      isUploading: !!file,
      uploadProgress: file ? 0 : 100,
      localUrl: localPreviewUrl || null
    };

    if (receiverId && typeof receiverId === 'string' && !receiverId.includes('_')) {
      messageData.receiverId = receiverId;
    }

    try {
      const msgRef = await addDoc(collection(db, "messages"), messageData);
      const msgId = msgRef.id;

      if (!file) {
        updateConversation(chatId, messageData, fileType).catch(console.error);
        return;
      }

      const startUpload = async () => {
        try {
          let finalUrl = '';
          const updateProgress = async (p: number) => {
            if (onProgress) onProgress(p);
            if (p % 25 === 0 || p === 100) {
              await updateDoc(doc(db, "messages", msgId), { uploadProgress: p });
            }
          };

          if (file.type.startsWith('image/')) {
            finalUrl = await ImageService.uploadImage(file as File, updateProgress);
          } else if (file.type.startsWith('video/')) {
            finalUrl = await VideoService.uploadVideo(file as File, updateProgress);
          } else if (file.type.startsWith('audio/')) {
            finalUrl = await AudioService.uploadAudio(file, updateProgress);
          } else {
            finalUrl = await GofileService.uploadFile(file as File);
            await updateProgress(100);
          }

          await updateDoc(doc(db, "messages", msgId), {
            imageUrl: fileType === 'image' ? finalUrl : null,
            fileUrl: (fileType === 'file' || fileType === 'video' || fileType === 'audio') ? finalUrl : null,
            isUploading: false,
            uploadProgress: 100
          });

          const finalMsgData = { ...messageData, text: messageData.text || (fileType === 'image' ? 'Sent an image' : 'Sent a file') };
          updateConversation(chatId, finalMsgData, fileType).catch(console.error);
        } catch (error) {
          console.error("Background upload failed:", error);
          await updateDoc(doc(db, "messages", msgId), { 
            uploadError: true,
            isUploading: false 
          });
        }
      };

      startUpload();
      cleanupMessages(chatId).catch(console.error);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }, [chatId, receiverId, receiver, receiverActiveChatId, cleanupMessages]);

  const updateConversation = useCallback(async (targetChatId: string, messageData: any, fileType: string) => {
    if (targetChatId && typeof targetChatId === 'string' && targetChatId.trim() !== "" && (targetChatId.includes('_') || targetChatId.length > 5)) {
      const conversationRef = doc(db, "conversations", targetChatId);
      const conversationSnap = await getDoc(conversationRef);
      const convData = conversationSnap.exists() ? conversationSnap.data() : null;
      
      const updateData: any = {
        lastMessage: messageData.text || (fileType === 'image' ? 'Sent an image' : 'Sent a file'),
        lastMessageTimestamp: serverTimestamp(),
        lastSenderId: auth.currentUser?.uid,
      };

      // If it's a new conversation, we MUST add participants
      if (!convData) {
        if (targetChatId.includes('_')) {
          // Direct chat - extract participants from ID
          updateData.participants = targetChatId.split('_');
          updateData.type = 'direct';
        } else {
          // Fallback if it's a group, though group IDs shouldn't typically reach here without existing
          updateData.participants = [auth.currentUser?.uid];
          updateData.type = 'group';
        }
      }

      const participants = convData?.participants || updateData.participants || [];
      participants.forEach((pId: string) => {
        if (pId !== auth.currentUser?.uid) {
          updateData[`unreadCount_${pId}`] = increment(1);
        }
      });

      await setDoc(conversationRef, updateData, { merge: true });

      if (participants.length > 0) {
        const otherParticipants = participants.filter((p: string) => p !== auth.currentUser?.uid);
        otherParticipants.forEach(async (pId: string) => {
          if (otherParticipants.length === 1) {
            // For now only supports one-to-one push
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
                  body: messageData.text || (fileType === 'image' ? 'Sent an image' : 'Sent a file'),
                  data: { chatId: targetChatId, senderId: auth.currentUser?.uid, click_action: `/chat/${targetChatId}` }
                })
              }).catch(err => console.error('Notification error:', err));
            }
          }
        });
      }
    }
  }, [receiverId, receiver, receiverActiveChatId]);

  const editMessage = useCallback(async (msgId: string, newText: string) => {
    await updateDoc(doc(db, "messages", msgId), {
      text: newText,
      isEdited: true
    });
  }, []);

  const deleteMessage = useCallback(async (msgId: string) => {
    if (!chatId) return;
    
    try {
      const msgRef = doc(db, "messages", msgId);
      const msgSnap = await getDoc(msgRef);
      
      if (msgSnap.exists()) {
        const msgData = msgSnap.data();
        await deleteDoc(msgRef);
        
        // If this was the last message, we need to update the conversation document
        const convRef = doc(db, "conversations", chatId);
        const convSnap = await getDoc(convRef);
        
        if (convSnap.exists()) {
          const convData = convSnap.data();
          // We can't easily know if it's the last message without checking timestamp
          // but if the text matches convData.lastMessage, it's likely the one.
          if (convData.lastMessage === msgData.text) {
            // Find the new last message
            const q = query(
              collection(db, "messages"),
              where("chatId", "==", chatId),
              orderBy("timestamp", "desc"),
              limit(1)
            );
            const latestMsgs = await getDocs(q);
            
            if (!latestMsgs.empty) {
              const newLastMsg = latestMsgs.docs[0].data();
              await updateDoc(convRef, {
                lastMessage: newLastMsg.text,
                lastMessageTimestamp: newLastMsg.timestamp,
                lastSenderId: newLastMsg.senderId
              });
            } else {
              // No messages left
              await updateDoc(convRef, {
                lastMessage: "No messages yet",
                lastMessageTimestamp: serverTimestamp(),
                lastSenderId: null
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }, [chatId]);

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

  return { sendMessage, editMessage, deleteMessage, reactToMessage, clearChat, cleanupMessages };
};
