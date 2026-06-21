import { useState, useEffect } from 'react';
import { storage } from '../../../services/StorageService';
import { useTheme } from '../../../contexts/ThemeContext';

export function useCustomChatBg(receiverId: string | undefined) {
  const { chatBackground: globalChatBackground } = useTheme();
  const [customBg, setCustomBg] = useState<string | null>(null);

  useEffect(() => {
    if (!receiverId) return;
    const loadCustomBg = () => {
      setCustomBg(storage.getItem(`app-chat-background-${receiverId}`));
    };
    loadCustomBg();
    
    window.addEventListener(`chat-customization-changed-${receiverId}`, loadCustomBg);
    return () => {
      window.removeEventListener(`chat-customization-changed-${receiverId}`, loadCustomBg);
    };
  }, [receiverId]);

  const activeChatBackground = customBg || globalChatBackground;

  return {
    customBg,
    setCustomBg,
    activeChatBackground
  };
}
