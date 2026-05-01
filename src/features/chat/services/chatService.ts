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
  limit
} from 'firebase/firestore';
import { db } from '../../../services/firebase';

export const chatService = {
  async sendMessage(chatId: string, messageData: any) {
    const messagesRef = collection(db, "chats", chatId, "messages");
    return addDoc(messagesRef, {
      ...messageData,
      timestamp: serverTimestamp()
    });
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
