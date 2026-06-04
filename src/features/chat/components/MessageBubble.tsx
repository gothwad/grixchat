import React from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';
import { 
  FileIcon, 
  Download,
  CornerUpRight,
  ChevronsRight,
  CheckCheck,
  Clock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { toDate, formatTime } from '../../../utils/dateUtils.ts';
import { storage } from '../../../services/StorageService.ts';
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

  const bubbleShapeClass = 
    bubbleStyleSetting === 'modern' ? 'rounded-[18px]' :
    bubbleStyleSetting === 'ios' ? 'rounded-[22px]' :
    bubbleStyleSetting === 'retro' ? 'rounded-none border border-zinc-400 dark:border-zinc-700' : 
    'rounded-xl'; // default whatsapp classic

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
  
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-4 w-full">
        <div className="bg-black/5 backdrop-blur-sm px-4 py-1.5 rounded-full border border-black/5 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            {msg.content}
          </p>
        </div>
      </div>
    );
  }

  const mediaUrl = msg.media_url || msg.imageUrl || msg.fileUrl;
  const mediaType = msg.media_type || msg.type;

  const rawTextContent = typeof msg.content === 'string' ? msg.content : (msg.text || '');
  const isForwardedMany = rawTextContent.startsWith('\u200B[FWD_MANY]\u200B');
  const isForwarded = isForwardedMany || rawTextContent.startsWith('\u200B[FWD]\u200B');
  const cleanRawText = rawTextContent
    .replace('\u200B[FWD_MANY]\u200B', '')
    .substring(0) // Safe copy
    .replace('\u200B[FWD]\u200B', '');
  const isGrixAiMessage = cleanRawText.startsWith('🤖 Grix AI:');
  const actualIsMe = isGrixAiMessage ? false : isMe;

  let renderedContent = cleanRawText;
  if (isGrixAiMessage) {
    renderedContent = cleanRawText.replace(/^🤖 Grix AI:\s*/i, '');
  }

  return (
    <div id={`msg-${msg.id}`} className={`flex flex-col w-full max-w-full ${actualIsMe ? 'items-end' : 'items-start'} ${!isSameSender ? 'mt-3' : 'mt-0.5'} relative`}>
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
          onClick={(e) => handleMessageTap(e as any, msg)}
          onContextMenu={(e) => {
            e.preventDefault();
            handleMessageTap(e as any, msg);
          }}
          whileTap={{ scale: 0.98 }}
          animate={isHighlighted ? { 
            backgroundColor: actualIsMe ? 'var(--bubble-own)' : 'var(--bubble-other)',
            scale: [1, 1.03, 1],
            transition: { duration: 0.5, repeat: 1 }
          } : {}}
          className={`px-3 py-2 shadow-sm relative cursor-pointer select-none max-w-full overflow-visible touch-none w-fit transition-all duration-150 ${bubbleShapeClass} ${
            activeMessageMenu?.id === msg.id ? 'z-50 ring-2 ring-[var(--primary)]/30' : 'z-10'
          } ${
            actualIsMe 
              ? 'bg-[var(--bubble-own)] text-[var(--bubble-text-own)] ml-auto' 
              : 'bg-[var(--bubble-other)] text-[var(--bubble-text-other)] mr-auto'
          } ${isSelected ? 'ring-3 ring-[#0494f4]/70 bg-[#0494f4]/15 animate-pulse' : ''}`}
        >
          {isForwardedMany ? (
            <p className="text-[10px] text-sky-400 font-extrabold italic mb-1 flex items-center gap-1 select-none">
              <ChevronsRight size={11} className="text-sky-400" />
              <span>Forwarded many times</span>
            </p>
          ) : isForwarded ? (
            <p className="text-[10px] text-zinc-400 font-bold italic mb-0.5 flex items-center gap-1 select-none">
              <CornerUpRight size={11} className="text-zinc-400" />
              <span>Forwarded</span>
            </p>
          ) : null}

          {isGrixAiMessage && (
            <p className="text-[10px] font-black text-indigo-400 dark:text-indigo-650 mb-1 uppercase tracking-widest leading-none flex items-center gap-1">
              🤖 Grix AI Verified
            </p>
          )}

          {convType === 'group' && !actualIsMe && !isSameSender && !isGrixAiMessage && (
            <p className="text-[10px] font-black text-rose-500 mb-0.5 uppercase tracking-widest leading-none">
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
              className="mb-1 p-1.5 rounded bg-black/5 border-l-4 border-[var(--primary)] text-[12px] cursor-pointer hover:bg-black/10 transition-colors"
            >
              <p className="font-bold text-[var(--primary)] text-[10px]">
                {resolvedReplyTo.sender_id === user?.id ? 'You' : receiver?.fullName}
              </p>
              <p className="truncate text-zinc-600 italic">{resolvedReplyTo.content || resolvedReplyTo.text}</p>
            </motion.div>
          )}

          <div className="flex flex-col min-w-[60px] max-w-full">
            {mediaUrl && mediaType === 'image' && (
              <motion.div 
                className="mb-1 rounded-lg overflow-hidden border border-black/5 cursor-pointer active:opacity-80 transition-opacity relative"
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
                  className={`max-w-full h-auto max-h-64 object-cover`}
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            )}
            {mediaUrl && mediaType === 'video' && (
              <div className="mb-1 rounded-lg overflow-hidden border border-black/10 aspect-video w-64 bg-black group/video relative">
                <video 
                  src={mediaUrl} 
                  className="w-full h-full object-cover opacity-90 group-hover/video:opacity-100"
                  playsInline
                  controls
                />
              </div>
            )}
            {mediaUrl && mediaType === 'audio' && (
              <div className="mb-1 w-full flex justify-center relative">
                <VoiceMessage fileUrl={mediaUrl} isMe={isMe} />
              </div>
            )}
            {mediaUrl && mediaType === 'file' && (
              <div className="mb-2 p-3 rounded-2xl bg-black/10 backdrop-blur-sm border border-white/10 flex items-center gap-4 relative overflow-hidden group/file">
                <div className="w-12 h-12 rounded-xl bg-[var(--primary)] flex items-center justify-center text-white shadow-lg">
                  <FileIcon size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold truncate text-white leading-tight">
                    {msg.file_name || 'Document File'}
                  </p>
                  <p className="text-[10px] text-white/60 font-medium tracking-wide uppercase mt-0.5">
                    {mediaUrl.split('.').pop()?.toUpperCase() || 'FILE'}
                  </p>
                </div>
                <a 
                  href={mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition-all backdrop-blur-md active:scale-90"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Download size={20} />
                </a>
              </div>
            )}
            
            {renderedContent && (
              typeof renderedContent === 'string' ? (
                <p className={`${contentFontClass} break-words whitespace-pre-wrap overflow-visible [word-break:normal]`}>
                  {renderedContent}
                </p>
              ) : (
                renderedContent
              )
            )}
            
            <div className="flex items-center justify-end gap-1.5 mt-0.5 -mr-1">
              <span className={`text-[10px] font-medium ${actualIsMe ? 'text-[var(--bubble-text-own)]/60' : 'text-[var(--bubble-text-other)]/60'}`}>
                {formatTime(msg.created_at)}
                {msg.is_edited && ' • Edited'}
              </span>
              {actualIsMe && (
                <span className="shrink-0 flex items-center">
                  {msg.status === 'sending' ? (
                    <Clock size={11} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/60' : 'text-[var(--bubble-text-other)]/60'} animate-pulse`} />
                  ) : msg.is_read ? (
                    <CheckCheck size={14} className="text-[#34b7f1]" strokeWidth={2.5} />
                  ) : (
                    <CheckCheck size={14} className={`${actualIsMe ? 'text-[var(--bubble-text-own)]/40' : 'text-[var(--bubble-text-other)]/40'}`} strokeWidth={2.5} />
                  )}
                </span>
              )}
            </div>
          </div>

          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
            <div className={`absolute -bottom-3 ${isMe ? 'right-2' : 'left-2'} flex items-center gap-0.5 bg-[var(--bg-main)] rounded-full px-1.5 py-0.5 shadow-sm border border-[var(--border-color)] z-20`}>
              {Object.entries(msg.reactions).slice(0, 3).map(([uid, emoji]) => (
                <span key={uid} className="text-[13px]">{emoji as string}</span>
              ))}
              {Object.keys(msg.reactions).length > 1 && (
                <span className="text-[9px] font-bold text-[var(--primary)] ml-0.5">{Object.keys(msg.reactions).length}</span>
              )}
            </div>
          )}
        </motion.div>
      </div>

    </div>
  );
};
