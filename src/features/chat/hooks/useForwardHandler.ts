import { useState } from 'react';
import { chatService } from '../../../services/ChatService';
import { LocalDataCache } from '../../../services/LocalDataCache';

export function useForwardHandler(user: any | null) {
  const [forwardTargetMsg, setForwardTargetMsg] = useState<any | null>(null);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);

  const handleForwardComplete = async (selectedIds: string[]) => {
    if (!user || !forwardTargetMsg) return;

    for (const id of selectedIds) {
      let targetConversationId = id;
      const isConvo = id.length > 20;

      if (!isConvo) {
        try {
          const matchedId = await chatService.getOrCreateDirectConversation(user.id, id);
          if (matchedId) {
            targetConversationId = matchedId;
          } else {
            continue;
          }
        } catch (err) {
          console.error("Error matching direct call destination:", err);
          continue;
        }
      }

      const rawOriginalText = forwardTargetMsg.content || forwardTargetMsg.text || '';
      
      let forwardPrefix = '\u200B[FWD]\u200B';
      let cleanContent = rawOriginalText;

      if (rawOriginalText.includes('\u200B[FWD_MANY]\u200B')) {
        forwardPrefix = '\u200B[FWD_MANY]\u200B';
        cleanContent = rawOriginalText.replace(/\u200B\[FWD_MANY\]\u200B/g, '');
      } else if (rawOriginalText.includes('\u200B[FWD]\u200B')) {
        forwardPrefix = '\u200B[FWD_MANY]\u200B';
        cleanContent = rawOriginalText.replace(/\u200B\[FWD\]\u200B/g, '');
      }

      const textToSend = forwardPrefix + cleanContent;

      let mediaData = undefined;
      const mediaUrl = forwardTargetMsg.media_url || forwardTargetMsg.imageUrl || forwardTargetMsg.fileUrl;
      const mediaType = forwardTargetMsg.media_type || forwardTargetMsg.type;

      if (mediaUrl) {
        mediaData = { url: mediaUrl, type: mediaType || 'image' };
      }

      try {
        await chatService.sendMessage(targetConversationId, user.id, textToSend, mediaData);
        const displayContent = forwardTargetMsg.text || (mediaData ? `Sent a ${mediaData.type}` : 'Sent a file');
        LocalDataCache.updateLastMessage(user.id, targetConversationId, displayContent);
      } catch (err) {
        console.error("Error sending forwarded message row:", err);
      }
    }
    setForwardTargetMsg(null);
  };

  return {
    forwardTargetMsg,
    setForwardTargetMsg,
    selectedMsgIds,
    setSelectedMsgIds,
    handleForwardComplete
  };
}
