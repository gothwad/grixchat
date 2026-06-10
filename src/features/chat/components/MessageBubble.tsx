import React from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';
import { 
  FileIcon, 
  Download,
  CornerUpRight,
  ChevronsRight,
  CheckCheck,
  Clock,
  Check
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { toDate, formatTime } from '../../../utils/dateUtils.ts';
import { storage } from '../../../services/StorageService.ts';
import { isUserOnline } from '../../../utils/presence';
import { 
  ChatMessageReactions,
  VoiceMessage
} from '../../../components/ChatUIComponents';
import { getStatusString } from '../utils/messageListUtils';

interface MessageBubbleProps {
  msg: any;
  isMe: boolean;
  isSameSender: boolean;
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
  onJumpToMessage?: (messageId: string) => void;
  isHighlighted?: boolean;
  isLatestMessage?: boolean;
  isSelected?: boolean;
  allMessages?: any[];
}
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  msg,
  isMe,
  isSameSender,
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
  onJumpToMessage,
  isHighlighted,
  isLatestMessage,
  isSelected,
  allMessages
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const x = useMotionValue(0);
  const [tick, setTick] = React.useState(0);

  const bubbleStyleSetting = storage.getItem('app-chat-bubble-style') || 'whatsapp';
  const fontSizeSetting = storage.getItem('app-chat-font-size') || 'medium';

  const contentFontClass = 
    fontSizeSetting === 'small' ? 'text-[12px] leading-relaxed font-medium' :
    fontSizeSetting === 'large' ? 'text-[16px] leading-relaxed font-medium' :
    fontSizeSetting === 'extra-large' ? 'text-[18px] leading-relaxed font-bold' :
    'text-[14px] leading-snug font-medium'; // medium


  React.useEffect(() => {
    const timer = setInterval(() => {
      setTick(t => t + 1);
    }, 10000); // update every 10 seconds to auto-update relative status text
    return () => clearInterval(timer);
  }, []);

  let resolvedReplyTo = msg.reply_to;
  if (resolvedReplyTo) {
    if (typeof resolvedReplyTo === 'string' || typeof resolvedReplyTo === 'number') {
      const parentMsg = allMessages?.find((m: any) => m.id === resolvedReplyTo);
      if (parentMsg) {
        resolvedReplyTo = {
          id: parentMsg.id,
          sender_id: parentMsg.sender_id,
          content: parentMsg.content || parentMsg.text || '',
          text: parentMsg.text || parentMsg.content || '',
          sender: parentMsg.sender
        };
      }
    }
  }
  
  if (msg.type === 'system' || msg.media_type === 'system') {
    const systemText = msg.text || msg.content || '';
    return (
      <div className="flex justify-center my-3.5 w-full select-none animate-fadeIn">
        <div className="bg-zinc-150 dark:bg-zinc-800/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-zinc-200/50 dark:border-white/5 shadow-sm max-w-[90%]">
          <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 tracking-wide flex items-center justify-center text-center gap-1.5 uppercase">
            {systemText}
          </p>
        </div>
      </div>
    );
  }

  const rawTextContent = typeof msg.content === 'string' ? msg.content : (msg.text || '');
  const isMsgDeleted = msg.is_deleted === true || rawTextContent.includes('🚫 This message was deleted') || rawTextContent.includes('This message was deleted');

  const mediaUrl = isMsgDeleted ? null : (msg.media_url || msg.imageUrl || msg.fileUrl);
  const mediaType = msg.media_type || msg.type;

  const isForwardedMany = !isMsgDeleted && rawTextContent.startsWith('\u200B[FWD_MANY]\u200B');
  const isForwarded = !isMsgDeleted && (isForwardedMany || rawTextContent.startsWith('\u200B[FWD]\u200B'));
  const cleanRawText = isMsgDeleted 
    ? (isMe ? '🚫 You deleted this message' : '🚫 This message was deleted')
    : rawTextContent
        .replace('\u200B[FWD_MANY]\u200B', '')
        .substring(0) // Safe copy
        .replace('\u200B[FWD]\u200B', '');
  const isGrixAiMessage = !isMsgDeleted && cleanRawText.startsWith('🤖 Grix AI:');
  const actualIsMe = isGrixAiMessage ? false : isMe;

  // Dynamic grouping rounded corners for consecutive bubbles (Improvement 1)
  let bubbleShapeClass = 'rounded-2xl';
  if (bubbleStyleSetting === 'modern') {
    if (isSameSender) {
      bubbleShapeClass = actualIsMe ? 'rounded-[18px] rounded-tr-[5px] rounded-br-[5px]' : 'rounded-[18px] rounded-tl-[5px] rounded-bl-[5px]';
    } else {
      bubbleShapeClass = actualIsMe ? 'rounded-[18px] rounded-tr-[4px]' : 'rounded-[18px] rounded-tl-[4px]';
    }
  } else if (bubbleStyleSetting === 'ios') {
    if (isSameSender) {
      bubbleShapeClass = actualIsMe ? 'rounded-[20px] rounded-tr-[6px] rounded-br-[6px]' : 'rounded-[20px] rounded-tl-[6px] rounded-bl-[6px]';
    } else {
      bubbleShapeClass = actualIsMe ? 'rounded-[20px] rounded-tr-[5px]' : 'rounded-[20px] rounded-tl-[5px]';
    }
  } else if (bubbleStyleSetting === 'retro') {
    bubbleShapeClass = 'rounded-none border-2 border-[var(--border-color)]';
  } else { // default classic whatsapp-style with tail
    if (isSameSender) {
      bubbleShapeClass = actualIsMe ? 'rounded-xl rounded-tr-xs rounded-br-xs' : 'rounded-xl rounded-tl-xs rounded-bl-xs';
    } else {
      bubbleShapeClass = actualIsMe ? 'rounded-xl rounded-tr-none' : 'rounded-xl rounded-tl-none';
    }
  }

  let renderedContent = cleanRawText;
  if (isGrixAiMessage) {
    renderedContent = cleanRawText.replace(/^🤖 Grix AI:\s*/i, '');
  }

  const hasReactions = msg.reactions && Object.keys(msg.reactions).length > 0 && !isMsgDeleted;

  const isTextString = typeof renderedContent === 'string';
  const isLongOrMultiLine = isTextString && (renderedContent.length > 55 || renderedContent.includes('\n'));
  const hasReplyHeader = !!(resolvedReplyTo && resolvedReplyTo.id);
  const useBlockFormat = !!mediaUrl || !isTextString || isLongOrMultiLine || hasReplyHeader;

  return (
    <div id={`msg-${msg.id}`} className={`flex flex-col w-full max-w-full ${actualIsMe ? 'items-end' : 'items-start'} ${!isSameSender ? 'mt-4' : 'mt-1'} ${hasReactions ? 'mb-4' : 'mb-0.5'} relative transition-all duration-200`}>
      <AnimatePresence>
        {isHighlighted && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.15 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[var(--primary)] z-0 pointer-events-none"
            style={{ margin: '-2px -16px' }}
          />
        )}
      </AnimatePresence>
      
      <div className={`relative group max-w-[85%] min-w-0 flex items-center gap-2 ${isHighlighted ? 'z-10' : ''}`}>
        {!isSameSender && (
          <div className={`absolute top-0 w-3 h-3 ${actualIsMe ? '-right-2 bg-[var(--bubble-own)]' : '-left-2 bg-[var(--bubble-other)]'}`} 
               style={{ clipPath: actualIsMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}>
          </div>
        )}

        <motion.div 
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: 100 }}
          dragElastic={{ left: 0, right: 0.1 }}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
          dragSnapToOrigin
          onDragStart={(e) => e.stopPropagation()}
          onDragEnd={(_, info) => {
            if (info.offset.x > 50) {
              setReplyingTo(msg);
              if (window.navigator.vibrate) try { window.navigator.vibrate(10); } catch(e){}
            }
          }}
          onClick={(e) => {
            if (isMsgDeleted) return;
            handleMessageTap(e as any, msg);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (isMsgDeleted) return;
            handleMessageTap(e as any, msg);
          }}
          whileTap={{ scale: 0.98 }}
          animate={isHighlighted ? { 
            backgroundColor: actualIsMe ? 'var(--bubble-own)' : 'var(--bubble-other)',
            scale: [1, 1.03, 1],
            transition: { duration: 0.5, repeat: 1 }
          } : {}}
          className={`px-3.5 py-2.5 ${hasReactions ? 'pb-3.5' : ''} shadow-md border border-neutral-800/10 dark:border-white/5 relative cursor-pointer select-none max-w-full overflow-visible touch-none w-fit transition-all duration-200 ${bubbleShapeClass} ${
            activeMessageMenu?.id === msg.id ? 'z-50 ring-2.5 ring-[var(--primary)]/45 scale-[1.01] shadow-lg' : 'z-10'
          } ${
            actualIsMe 
              ? 'bg-gradient-to-b from-[var(--bubble-own)] to-[var(--bubble-own)]/95 text-[var(--bubble-text-own)] ml-auto border-r-0' 
              : 'bg-gradient-to-b from-[var(--bubble-other)] to-[var(--bubble-other)]/95 text-[var(--bubble-text-other)] mr-auto border-l-0'
          } ${isSelected ? 'ring-3 ring-[#0494f4]/80 bg-[#0494f4]/20 scale-[1.02] shadow-cyan-500/10' : ''} hover:brightness-[1.02]`}
        >
          {isForwardedMany ? (
            <p className="text-[9px] text-sky-400 font-extrabold italic mb-1.5 flex items-center gap-1 select-none tracking-wide">
              <ChevronsRight size={11} className="text-sky-400" />
              <span>Forwarded many times</span>
            </p>
          ) : isForwarded ? (
            <p className="text-[9px] text-zinc-400 font-bold italic mb-1 flex items-center gap-1 select-none tracking-wide">
              <CornerUpRight size={11} className="text-zinc-400" />
              <span>Forwarded</span>
            </p>
          ) : null}

          {isGrixAiMessage && (
            <div className="flex items-center gap-1 mb-1.5 py-0.5 px-2 bg-indigo-500/15 border border-indigo-500/25 rounded-md text-[8.5px] font-black text-indigo-405 uppercase tracking-widest leading-none w-fit select-none">
              <span className="relative flex h-1 w-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1 w-1 bg-indigo-500"></span>
              </span>
              🤖 Grix AI Verified
            </div>
          )}

          {convType === 'group' && !actualIsMe && !isSameSender && !isGrixAiMessage && (
            <p className="text-[10px] font-extrabold text-rose-500 mb-1 uppercase tracking-wider leading-none">
              {msg.sender?.full_name || msg.senderName || 'User'}
            </p>
          )}

          {showReactionPicker?.id === msg.id && (
            <ChatMessageReactions 
              onReact={(emoji) => performReactToMessage(msg.id, emoji)}
              onClose={() => setShowReactionPicker(null)}
              position={isMe ? 'right' : 'left'}
            />
          )}

          {resolvedReplyTo && typeof resolvedReplyTo === 'object' && !Array.isArray(resolvedReplyTo) && resolvedReplyTo.id && (
            <motion.div 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (resolvedReplyTo.id && onJumpToMessage) {
                  onJumpToMessage(resolvedReplyTo.id);
                }
              }}
              className={`mb-1.5 py-1 px-2.5 rounded-lg border-l-3 bg-black/10 text-[11px] cursor-pointer hover:bg-black/15 transition-all text-left flex flex-col gap-0.5 ${
                actualIsMe 
                  ? 'border-l-teal-400/90 dark:border-l-[var(--primary)] text-[var(--bubble-text-own)]/90' 
                  : 'border-l-[var(--primary)] text-[var(--bubble-text-other)]/90'
              }`}
            >
              <p className={`font-black text-[9px] tracking-wide uppercase ${actualIsMe ? 'text-teal-350 dark:text-cyan-400' : 'text-[var(--primary)]'}`}>
                {resolvedReplyTo.sender_id === user?.id ? 'You' : (receiver?.fullName || 'Contact')}
              </p>
              <p className="truncate opacity-75 font-medium leading-tight select-none">
                {resolvedReplyTo.content || resolvedReplyTo.text}
              </p>
            </motion.div>
          )}

          <div className="flex flex-col min-w-[60px] max-w-full">
            {mediaUrl && mediaType === 'image' && (
              <motion.div 
                className="mb-1 rounded-xl overflow-hidden border border-white/5 dark:border-white/10 shadow-md cursor-pointer relative group-hover:scale-[1.01] transition-transform duration-250"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/chat/preview', { 
                    state: { 
                      imageUrl: mediaUrl, 
                      senderName: isMe ? 'You' : receiver?.fullName 
                    } 
                  });
                }}
              >
                <img 
                  src={mediaUrl} 
                  alt="Sent image" 
                  className="max-w-full h-auto max-h-64 object-cover hover:opacity-95 transition-opacity"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent pointer-events-none" />
              </motion.div>
            )}
            {mediaUrl && mediaType === 'video' && (
              <div className="mb-1 rounded-xl overflow-hidden border border-white/5 dark:border-white/10 aspect-video w-64 bg-black group/video relative shadow-md">
                <video 
                  src={mediaUrl} 
                  className="w-full h-full object-cover opacity-90 group-hover/video:opacity-100 transition-opacity"
                  playsInline
                  controls
                />
              </div>
            )}
            {mediaUrl && mediaType === 'audio' && (
              <div className="mb-1.5 w-full flex justify-center relative">
                <VoiceMessage fileUrl={mediaUrl} isMe={isMe} />
              </div>
            )}
            {mediaUrl && mediaType === 'file' && (
              <div className="mb-2 p-3.5 rounded-xl bg-black/15 dark:bg-black/20 border border-white/10 flex items-center gap-3 relative overflow-hidden shadow-sm group/file w-full min-w-[200px] hover:bg-black/20 transition-all">
                <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/90 text-white flex items-center justify-center shadow-md shrink-0">
                  <FileIcon size={20} className="stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold truncate text-[var(--bubble-text-own)] leading-tight">
                    {msg.file_name || 'Document File'}
                  </p>
                  <p className="text-[9px] opacity-70 font-semibold tracking-wide uppercase mt-1">
                    {mediaUrl.split('.').pop()?.toUpperCase() || 'FILE'} • DOCUMENT
                  </p>
                </div>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 bg-white/10 hover:bg-white/20 dark:hover:bg-white/25 rounded-full text-white transition-all active:scale-90 flex items-center justify-center shadow whitespace-nowrap shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={14} className="stroke-[2.5]" />
                </a>
              </div>
            )}
            
            {renderedContent && (
              typeof renderedContent === 'string' ? (
                !useBlockFormat ? (
                  // Elegant inline WhatsApp/Telegram wrapping
                  <p className={`${isMsgDeleted ? 'italic text-zinc-400 dark:text-zinc-500 font-medium select-none text-[13px] opacity-80' : contentFontClass} break-words whitespace-pre-wrap overflow-visible [word-break:normal]`}>
                    {renderedContent}
                    {(() => {
                      const isReceiverOnlineNow = receiver && isUserOnline(
                        receiver.isOnline !== undefined ? receiver.isOnline : receiver.is_online,
                        receiver.lastSeen !== undefined ? receiver.lastSeen : receiver.last_seen
                      );
                      let wasReceiverOnlineAfterMessage = false;
                      if (receiver && (receiver.lastSeen || receiver.last_seen)) {
                        try {
                          const lastSeenTime = new Date(receiver.lastSeen || receiver.last_seen).getTime();
                          const msgTime = new Date(msg.created_at).getTime();
                          wasReceiverOnlineAfterMessage = lastSeenTime >= msgTime;
                        } catch (e) {}
                      }
                      const isMessageDelivered = isReceiverOnlineNow || wasReceiverOnlineAfterMessage;

                      return (
                        <span className="inline-flex items-center gap-1 ml-2.5 select-none pointer-events-none align-bottom h-3.5 translate-y-[2px] leading-none">
                          <span className={`text-[10px] font-bold tracking-tight whitespace-nowrap ${actualIsMe ? 'text-[var(--bubble-text-own)]/55' : 'text-[var(--bubble-text-other)]/55'}`}>
                            {formatTime(msg.created_at)}
                            {msg.is_edited && ' • Ed'}
                          </span>
                          {actualIsMe && (
                            <span className="shrink-0 flex items-center">
                              {msg.status === 'sending' ? (
                                <Clock size={11} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/55' : 'text-[var(--bubble-text-other)]/55'} animate-pulse`} />
                              ) : msg.is_read ? (
                                <CheckCheck size={14} className="text-[#34b7f1]" strokeWidth={2.8} />
                              ) : (convType === 'group' || isMessageDelivered) ? (
                                <CheckCheck size={14} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/40' : 'text-[var(--bubble-text-other)]/40'}`} strokeWidth={2.8} />
                              ) : (
                                <Check size={14} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/40' : 'text-[var(--bubble-text-other)]/40'}`} strokeWidth={2.8} />
                              )}
                            </span>
                          )}
                        </span>
                      );
                    })()}
                  </p>
                ) : (
                  // With media, show the content normally
                  <p className={`${isMsgDeleted ? 'italic text-zinc-400 dark:text-zinc-500 font-medium select-none text-[13px] opacity-80' : contentFontClass} break-words whitespace-pre-wrap overflow-visible [word-break:normal]`}>
                    {renderedContent}
                  </p>
                )
              ) : (
                renderedContent
              )
            )}
            
            {/* Show traditional block format metadata if we should use block layout */}
            {useBlockFormat && (
              <div className="flex items-center justify-end gap-1.5 mt-1 -mr-1 shadow-none">
                <span className={`text-[10px] font-medium ${actualIsMe ? 'text-[var(--bubble-text-own)]/60' : 'text-[var(--bubble-text-other)]/60'}`}>
                  {formatTime(msg.created_at)}
                  {msg.is_edited && ' • Edited'}
                </span>
                {actualIsMe && (() => {
                  const isReceiverOnlineNow = receiver && isUserOnline(
                    receiver.isOnline !== undefined ? receiver.isOnline : receiver.is_online,
                    receiver.lastSeen !== undefined ? receiver.lastSeen : receiver.last_seen
                  );
                  let wasReceiverOnlineAfterMessage = false;
                  if (receiver && (receiver.lastSeen || receiver.last_seen)) {
                    try {
                      const lastSeenTime = new Date(receiver.lastSeen || receiver.last_seen).getTime();
                      const msgTime = new Date(msg.created_at).getTime();
                      wasReceiverOnlineAfterMessage = lastSeenTime >= msgTime;
                    } catch (e) {}
                  }
                  const isMessageDelivered = isReceiverOnlineNow || wasReceiverOnlineAfterMessage;

                  return (
                    <span className="shrink-0 flex items-center">
                      {msg.status === 'sending' ? (
                        <Clock size={11} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/60' : 'text-[var(--bubble-text-other)]/60'} animate-pulse`} />
                      ) : msg.is_read ? (
                        <CheckCheck size={14} className="text-[#34b7f1]" strokeWidth={2.5} />
                      ) : (convType === 'group' || isMessageDelivered) ? (
                        <CheckCheck size={14} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/40' : 'text-[var(--bubble-text-other)]/40'}`} strokeWidth={2.5} />
                      ) : (
                        <Check size={14} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/40' : 'text-[var(--bubble-text-other)]/40'}`} strokeWidth={2.5} />
                      )}
                    </span>
                  );
                })()}
              </div>
            )}
          </div>

          {msg.reactions && Object.keys(msg.reactions).length > 0 && !isMsgDeleted && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              className={`absolute -bottom-2.5 ${actualIsMe ? 'right-3.5' : 'left-3.5'} flex items-center gap-1.5 bg-zinc-900/90 dark:bg-zinc-800/95 backdrop-blur-md rounded-full px-2.5 py-0.5 shadow-md border border-white/10 z-20 select-none`}
            >
              <div className="flex items-center -space-x-0.5">
                {Object.entries(msg.reactions).slice(0, 3).map(([uid, emoji]) => (
                  <span key={uid} className="text-[11px] filter drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)]">{emoji as string}</span>
                ))}
              </div>
              {Object.keys(msg.reactions).length > 1 && (
                <span className="text-[9.5px] font-black tracking-wide text-white opacity-90 pl-0.5">{Object.keys(msg.reactions).length}</span>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

    </div>
  );
};
