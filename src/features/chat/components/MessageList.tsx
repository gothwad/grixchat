import React, { useState, useCallback } from 'react';
import { Loader2, MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageBubble } from './MessageBubble';
import { useAuth } from '../../../providers/AuthProvider.tsx';

interface MessageListProps {
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  chatBackground: string | undefined;
  loadingMore: boolean;
  loading: boolean;
  messages: any[];
  messageLimit: number;
  convType: 'direct' | 'group';
  receiver: any;
  activeMessageMenu: any;
  setActiveMessageMenu: (msg: any) => void;
  replyingTo: any;
  setReplyingTo: (msg: any) => void;
  showReactionPicker: any;
  setShowReactionPicker: (msg: any) => void;
  receiverStatus: string;
  handleMessageTap: (e: any, msg: any) => void;
  performReactToMessage: (id: string, emoji: string) => void;
  isOtherTyping: boolean;
  selectedMsgIds?: string[];
}

export const MessageList: React.FC<MessageListProps> = ({
  scrollContainerRef,
  messagesEndRef,
  handleScroll,
  chatBackground,
  loadingMore,
  loading,
  messages,
  messageLimit,
  convType,
  receiver,
  activeMessageMenu,
  setActiveMessageMenu,
  replyingTo,
  setReplyingTo,
  showReactionPicker,
  setShowReactionPicker,
  receiverStatus,
  handleMessageTap,
  performReactToMessage,
  isOtherTyping,
  selectedMsgIds = []
}) => {
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const { user } = useAuth();

  const onJumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element && scrollContainerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageId(messageId);
      
      // Vibrate on jump
      if (window.navigator.vibrate) try { window.navigator.vibrate(15); } catch(e){}

      // Clear highlight after animation
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
    } else {
      console.warn("Message element not found to jump to:", messageId);
    }
  }, [scrollContainerRef]);

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 relative no-scrollbar touch-pan-y w-full max-w-full ${chatBackground || 'bg-[var(--bg-main)]'}`} 
      onClick={() => { setActiveMessageMenu(null); }}
    >
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'url("https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png")', backgroundSize: '400px' }}></div>
      
      <div className="relative z-10 flex flex-col gap-1 w-full max-w-full overflow-hidden">
        {loadingMore && (
          <div className="flex flex-col items-center justify-center py-4 gap-2">
            <Loader2 size={20} className="text-[var(--primary)] animate-spin" />
            <p className="text-[9px] font-bold text-[var(--primary)] uppercase tracking-widest">Loading older messages...</p>
          </div>
        )}

        {loading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-10 h-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-[0.2em] animate-pulse">Loading Messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-10">
            <div className="w-16 h-16 bg-white/50 rounded-full flex items-center justify-center mb-4 shadow-sm">
              <MessageCircle size={32} className="text-[var(--primary)]/40" />
            </div>
            <p className="text-sm font-bold text-zinc-500">No messages yet</p>
            <p className="text-[11px] text-zinc-400 mt-1">Say hi to start the conversation!</p>
          </div>
        ) : (() => {
          // Use all messages or limit if specified
          const currentMessages = messageLimit > 0 ? messages.slice(-messageLimit) : messages;
          
          // Deduplicate messages on the fly to prevent any runtime dupe-key issues under high network concurrency
          const seenIds = new Set<string>();
          const uniqueMessages = currentMessages.filter(msg => {
            if (!msg || !msg.id) return false;
            if (seenIds.has(msg.id)) return false;
            seenIds.add(msg.id);
            return true;
          });

          return uniqueMessages.map((msg, index) => {
            const isMe = msg.sender_id === user?.id;
            const prevMsg = index > 0 ? uniqueMessages[index - 1] : null;
            const isSameSender = prevMsg?.sender_id === msg.sender_id;
            
            return (
              <MessageBubble 
                key={msg.id}
                msg={msg}
                isMe={isMe}
                isSameSender={isSameSender}
                convType={convType}
                receiver={receiver}
                activeMessageMenu={activeMessageMenu}
                setActiveMessageMenu={setActiveMessageMenu}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                showReactionPicker={showReactionPicker}
                setShowReactionPicker={setShowReactionPicker}
                receiverStatus={receiverStatus}
                handleMessageTap={handleMessageTap}
                performReactToMessage={performReactToMessage}
                onJumpToMessage={onJumpToMessage}
                isHighlighted={highlightedMessageId === msg.id}
                isLatestMessage={index === currentMessages.length - 1}
                isSelected={selectedMsgIds.includes(msg.id)}
                allMessages={uniqueMessages}
              />
            );
          });
        })()}
        
        <AnimatePresence>
          {isOtherTyping && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex justify-start mt-2 mb-4"
            >
              <div className="bg-white px-3 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2 border border-zinc-100">
                <div className="flex gap-1">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" />
                </div>
                <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider">Typing...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
