import React from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { 
  Check, 
  CheckCheck, 
  Clock, 
  Reply, 
  MoreVertical, 
  FileIcon, 
  Download, 
  ShieldAlert 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../../services/firebase.ts';
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
  const x = useMotionValue(0);
  
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-4 w-full">
        <div className="bg-black/5 backdrop-blur-sm px-4 py-1.5 rounded-full border border-black/5 shadow-sm">
          <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            {msg.text}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div id={`msg-${msg.id}`} className={`flex w-full max-w-full ${isMe ? 'justify-end' : 'justify-start'} ${!isSameSender ? 'mt-3' : 'mt-0.5'} relative`}>
      {/* WhatsApp-style full height highlight stripe */}
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

        {/* Swipe Reveal Icon (Left side) - REMOVED AS PER USER REQUEST */}

        <motion.div 
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: 100 }}
          dragElastic={{ left: 0, right: 0.1 }}
          dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
          dragSnapToOrigin
          onDragStart={(e) => e.stopPropagation()}
          onDragEnd={(_, info) => {
            // Left to right swipe (positive x) triggers reply
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
              {msg.senderName || 'User'}
            </p>
          )}

          {showReactionPicker?.id === msg.id && (
            <ChatMessageReactions 
              onReact={(emoji) => performReactToMessage(msg.id, emoji)}
              onClose={() => setShowReactionPicker(null)}
              position={isMe ? 'right' : 'left'}
            />
          )}

          {msg.replyTo && (
            <motion.div 
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (msg.replyTo.id && onJumpToMessage) {
                  onJumpToMessage(msg.replyTo.id);
                }
              }}
              className="mb-1 p-1.5 rounded bg-black/5 border-l-4 border-[var(--primary)] text-[12px] cursor-pointer hover:bg-black/10 transition-colors"
            >
              <p className="font-bold text-[var(--primary)] text-[10px]">
                {msg.replyTo.senderId === auth.currentUser?.uid ? 'You' : receiver?.fullName}
              </p>
              <p className="truncate text-zinc-600 italic">{msg.replyTo.text}</p>
            </motion.div>
          )}

          <div className="flex flex-col min-w-[60px] max-w-full">
            {(msg.imageUrl || msg.localUrl) && msg.type !== 'video' && (
              <motion.div 
                className="mb-1 rounded-lg overflow-hidden border border-black/5 cursor-pointer active:opacity-80 transition-opacity relative"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  if (msg.isUploading) return;
                  e.stopPropagation();
                  navigate('/chat/preview', { 
                    state: { 
                      imageUrl: msg.imageUrl || msg.localUrl, 
                      senderName: isMe ? 'You' : receiver?.fullName 
                    } 
                  });
                }}
              >
                <img 
                  src={msg.imageUrl || msg.localUrl || undefined} 
                  alt="Sent image" 
                  className={`max-w-full h-auto max-h-64 object-cover ${msg.isUploading ? 'blur-sm grayscale' : ''}`}
                  referrerPolicy="no-referrer"
                />
                {msg.isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-black/60 rounded-full p-2 flex flex-col items-center">
                      <div className="relative w-10 h-10 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="3"
                             className="text-white/20"
                          />
                          <circle
                            cx="20"
                            cy="20"
                            r="18"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="3"
                             className="text-white transition-all duration-300"
                            strokeDasharray={2 * Math.PI * 18}
                            strokeDashoffset={2 * Math.PI * 18 * (1 - (msg.uploadProgress || 0) / 100)}
                          />
                        </svg>
                        <span className="absolute text-[10px] text-white font-bold">{msg.uploadProgress || 0}%</span>
                      </div>
                    </div>
                  </div>
                )}
                {msg.expiresAt && !msg.isUploading && (
                  <div className="bg-black/40 text-white text-[9px] px-2 py-1 flex items-center gap-1">
                    <Clock size={10} /> Expires in 24h
                  </div>
                )}
              </motion.div>
            )}
            {(msg.type === 'video' || (msg.fileUrl && msg.type === 'video') || (msg.localUrl && msg.type === 'video')) && (
              <div className="mb-1 rounded-lg overflow-hidden border border-black/10 aspect-video w-64 bg-black group/video relative">
                <video 
                  src={msg.fileUrl || msg.imageUrl || msg.localUrl || undefined} 
                  className={`w-full h-full object-cover transition-opacity ${msg.isUploading ? 'opacity-40 blur-sm' : 'opacity-90 group-hover/video:opacity-100'}`}
                  playsInline
                  controls={!msg.isUploading}
                />
                {msg.isUploading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-12 h-12 relative flex items-center justify-center bg-black/40 rounded-full">
                       <svg className="w-full h-full -rotate-90">
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="3"
                             className="text-white/20"
                          />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="3"
                             className="text-white transition-all duration-300"
                            strokeDasharray={2 * Math.PI * 20}
                            strokeDashoffset={2 * Math.PI * 20 * (1 - (msg.uploadProgress || 0) / 100)}
                          />
                        </svg>
                        <span className="absolute text-[10px] text-white font-bold">{msg.uploadProgress || 0}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {msg.type === 'audio' && (msg.fileUrl || msg.localUrl) && (
              <div className="mb-1 w-full flex justify-center relative">
                <div className={msg.isUploading ? 'opacity-50 blur-[1px]' : ''}>
                  <VoiceMessage fileUrl={msg.fileUrl || msg.localUrl} isMe={isMe} />
                </div>
                {msg.isUploading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-black/60 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">Uploading {msg.uploadProgress}%</span>
                  </div>
                )}
              </div>
            )}
            {(msg.fileUrl || msg.localUrl) && msg.type !== 'video' && msg.type !== 'audio' && msg.type !== 'image' && (
              <div className="mb-1 p-2 rounded-lg bg-black/5 border border-black/10 flex items-center gap-3 relative">
                <div className={`w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] ${msg.isUploading ? 'animate-pulse' : ''}`}>
                  <FileIcon size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate text-[var(--text-primary)]">{msg.fileName || 'File'}</p>
                  <p className="text-[10px] text-red-500 uppercase font-black tracking-tighter flex items-center gap-1">
                    <ShieldAlert size={10} /> One-Time Download
                  </p>
                </div>
                {!msg.isUploading ? (
                  <a href={msg.fileUrl || msg.localUrl} download={msg.fileName} target="_blank" rel="noopener noreferrer" className="p-2 hover:bg-black/5 rounded-full text-[var(--primary)]">
                    <Download size={18} />
                  </a>
                ) : (
                  <div className="p-1 text-[10px] font-bold text-[var(--primary)]">{msg.uploadProgress}%</div>
                )}
              </div>
            )}
            {msg.type === 'share' && msg.sharedContent && (
              <motion.div 
                className="mb-1 rounded-xl overflow-hidden bg-zinc-900 border border-black/10 cursor-pointer active:scale-[0.98] transition-transform shadow-sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (msg.sharedContent.type === 'post') navigate(`/posts/${msg.sharedContent.id}`);
                  else if (msg.sharedContent.type === 'reel') navigate(`/reels/watch/${msg.sharedContent.id}`);
                  else if (msg.sharedContent.type === 'video') navigate(`/tube/watch/${msg.sharedContent.id}`);
                }}
              >
                <div className={`relative bg-zinc-800 ${
                  msg.sharedContent.type === 'reel' 
                    ? 'aspect-[9/16] w-48 mx-auto' 
                    : msg.sharedContent.type === 'video' 
                      ? 'aspect-video w-64' 
                      : 'aspect-square sm:aspect-video w-64'
                }`}>
                  <img 
                    src={msg.sharedContent.imageUrl || undefined} 
                    className="w-full h-full object-cover"
                    alt={msg.sharedContent.title}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <Reply size={10} className="text-white fill-current" />
                      </div>
                      <span className="text-[9px] font-black text-white uppercase tracking-[0.2em] drop-shadow-md">
                        {msg.sharedContent.type}
                      </span>
                    </div>
                    <p className="text-white text-[12px] font-black leading-tight line-clamp-2 drop-shadow-md">
                      {msg.sharedContent.title}
                    </p>
                  </div>
                </div>
                <div className="p-2.5 flex items-center justify-between bg-white dark:bg-zinc-800">
                  <span className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest">
                    Open in {msg.sharedContent.type === 'video' ? 'GrixTube' : msg.sharedContent.type === 'reel' ? 'Reels' : 'Feed'}
                  </span>
                </div>
              </motion.div>
            )}
            {msg.text && msg.type !== 'share' && <p className="text-[14.5px] leading-snug break-all whitespace-pre-wrap overflow-hidden">{msg.text}</p>}
            <div className="flex items-center justify-end gap-1 mt-0.5 -mr-1">
              <span className="text-[10px] text-zinc-500 font-medium">
                {toDate(msg.timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || ''}
                {msg.isEdited && ' • edited'}
              </span>
              {isMe && (
                <div className="flex ml-0.5 items-center">
                  {msg.isUploading ? (
                    <Clock size={12} className="text-zinc-400" />
                  ) : msg.isRead ? (
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
