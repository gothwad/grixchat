import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { evaluateChatLockState, ChatTimeRestrictions } from '../utils/scheduleUtils';

export function useChatLock(chatId: string | null, currentRestrictions: ChatTimeRestrictions | undefined, showToast: (msg: string) => void) {
  const [lockState, setLockState] = useState({ isLocked: false, message: "" });
  const [isChatTimeModalOpen, setIsChatTimeModalOpen] = useState(false);

  useEffect(() => {
    const updateLock = () => {
      const state = evaluateChatLockState(currentRestrictions);
      setLockState(state);
    };

    updateLock();
    const interval = setInterval(updateLock, 10000);
    return () => clearInterval(interval);
  }, [currentRestrictions]);

  const handleSaveChatTimeRestrictions = async (restrictions: ChatTimeRestrictions) => {
    if (!chatId || !supabase) return;
    try {
      const { data: convData } = await supabase
        .from('conversations')
        .select('watch_state')
        .eq('id', chatId)
        .single();
      
      const currentWatchState = convData?.watch_state || {};
      const nextWatchState = {
        ...currentWatchState,
        chat_times: restrictions
      };

      const { error } = await supabase
        .from('conversations')
        .update({ watch_state: nextWatchState })
        .eq('id', chatId);

      if (error) throw error;
      showToast("Chat Time updated successfully!");
    } catch (err) {
      console.error("Error saving chat time restrictions:", err);
      showToast("Failed to save schedule settings");
    }
  };

  return {
    lockState,
    isChatTimeModalOpen,
    setIsChatTimeModalOpen,
    handleSaveChatTimeRestrictions
  };
}
