import { useState, useEffect } from 'react';
import { chatService } from '../services/chatService';
import { useAuth } from '../../../providers/AuthProvider';

export const useChat = (chatId: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chatId) return;

    setLoading(true);
    const unsubscribe = chatService.subscribeToMessages(chatId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  const sendMessage = async (text: string, options: any = {}) => {
    if (!user || !text.trim()) return;

    try {
      await chatService.sendMessage(chatId, {
        text,
        senderId: user.uid,
        ...options
      });
      
      // Update last message in chat room
      await chatService.updateChatRoom(chatId, {
        lastMessage: text,
        lastMessageTime: new Date(),
        [`unreadCount.${user.uid === 'user1' ? 'user2' : 'user1'}`]: 1 // Simplified unread logic
      });
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  return { messages, loading, error, sendMessage };
};
