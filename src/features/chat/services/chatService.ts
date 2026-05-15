import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  serverTimestamp,
  getDocs,
  limit,
  writeBatch,
  getCountFromServer,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../../../services/firebase';

export const chatService = {
  async sendMessage(chatId: string, messageData: any) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const result = await addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp()
    });

    // Run cleanup in background to save quota and keep database lean
    this.cleanupOldMessages(chatId).catch(console.error);

    return result;
  },

  async cleanupOldMessages(chatId: string) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    
    // Check count using efficient getCountFromServer (1 read cost)
    const snapshot = await getCountFromServer(messagesRef);
    const count = snapshot.data().count;

    if (count > 50) {
      // Fetch the oldest 25 messages to delete
      const q = query(messagesRef, orderBy("timestamp", "asc"), limit(25));
      const oldMsgs = await getDocs(q);
      
      if (!oldMsgs.empty) {
        const batch = writeBatch(db);
        oldMsgs.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${oldMsgs.size} old messages in chat ${chatId}`);
      }
    }
  },

  async getChatRoom(chatId: string) {
    const docSnap = await getDoc(doc(db, "chats", chatId));
    return docSnap.exists() ? docSnap.data() : null;
  },

  async updateChatRoom(chatId: string, data: any) {
    return updateDoc(doc(db, "chats", chatId), data);
  },

  async getMessages(chatId: string, limitCount = 50) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "desc"), limit(limitCount));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },

  subscribeToMessages(chatId: string, callback: (messages: any[]) => void) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      callback(messages);
    });
  }
};
