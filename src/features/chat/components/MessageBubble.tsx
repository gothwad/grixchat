import React from 'react';
import { motion, useMotionValue, AnimatePresence } from 'motion/react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  FileIcon, 
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { toDate } from '../../../utils/dateUtils.ts';
import { 
  ChatMessageReactions,
  VoiceMessage
} from '../../../components/ChatUIComponents';

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
  isHighlighted
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const x = useMotionValue(0);
  
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

  return (
    <div id={`msg-${msg.id}`} className={`flex w-full max-w-full ${isMe ? 'justify-end' : 'justify-start'} ${!isSameSender ? 'mt-3' : 'mt-0.5'} relative`}>
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
          <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2 bg-[var(--bubble-own)]' : '-left-2 bg-[var(--bubble-other)]'}`} 
               style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}>
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
          whileTap={{ scale: 0.98 }}
          animate={isHighlighted ? { 
            backgroundColor: isMe ? 'var(--bubble-own)' : 'var(--bubble-other)',
            scale: [1, 1.03, 1],
            transition: { duration: 0.5, repeat: 1 }
          } : {}}
          className={`px-3 py-2 rounded-xl shadow-sm relative cursor-pointer select-none max-w-full overflow-visible touch-none w-fit transition-shadow ${
            activeMessageMenu?.id === msg.id ? 'z-50 ring-2 ring-[var(--primary)]/30' : 'z-10'
          } ${
            isMe 
              ? 'bg-[var(--bubble-own)] text-[var(--bubble-text-own)] ml-auto' 
              : 'bg-[var(--bubble-other)] text-[var(--bubble-text-other)] mr-auto'
          }`}
        >
          {convType === 'group' && !isMe && !isSameSender && (
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

          {msg.reply_to && (
            <motion.div 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (msg.reply_to.id && onJumpToMessage) {
                  onJumpToMessage(msg.reply_to.id);
                }
              }}
              className="mb-1 p-1.5 rounded bg-black/5 border-l-4 border-[var(--primary)] text-[12px] cursor-pointer hover:bg-black/10 transition-colors"
            >
              <p className="font-bold text-[var(--primary)] text-[10px]">
                {msg.reply_to.sender_id === user?.id ? 'You' : receiver?.fullName}
              </p>
              <p className="truncate text-zinc-600 italic">{msg.reply_to.content || msg.reply_to.text}</p>
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
            
            {msg.content && <p className="text-[14.5px] leading-snug break-all whitespace-pre-wrap overflow-hidden">{msg.content}</p>}
            
            <div className="flex items-center justify-end gap-1 mt-0.5 -mr-1">
              <span className="text-[10px] text-zinc-500 font-medium">
                {toDate(msg.created_at)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || ''}
                {msg.is_edited && ' • edited'}
              </span>
              {isMe && (
                <div className="flex ml-0.5 items-center">
                  {msg.status === 'sending' ? (
                    <Clock size={12} className="text-zinc-400 animate-pulse" />
                  ) : msg.is_read ? (
                    <CheckCheck size={14} className="text-blue-500" />
                  ) : receiverStatus === 'online' ? (
                    <CheckCheck size={14} className="text-zinc-400" />
                  ) : (
                    <Check size={14} className="text-zinc-400" />
                  )}
                </div>
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
