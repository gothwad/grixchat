import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  Smile, 
  Check, 
  CheckCheck, 
  Clock, 
  Loader2,
  MessageSquareOff,
  MessageCircle,
  Reply,
  MoreVertical,
  Trash,
  X,
  FileIcon,
  Download,
  ShieldAlert,
  Mic
} from 'lucide-react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import { 
  ChatMessageReactions,
  ChatMessageMenu,
  ChatReplyPreview,
  ChatEditPreview,
  ChatPlusMenu,
  EmojiPickerMenu,
  VoiceMessage
} from '../../components/ChatUIComponents';
import { auth, db, rtdb } from '../../services/firebase.ts';
import { ref as rtdbRef, onValue, update } from 'firebase/database';
import { toDate, formatLastSeen } from '../../utils/dateUtils.ts';
import { 
  doc, 
  onSnapshot,
  updateDoc,
  arrayUnion 
} from 'firebase/firestore';

import { motion, AnimatePresence } from 'motion/react';
import { CacheService } from '../../services/CacheService.ts';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatActions } from './hooks/useChatActions';
import { useTypingStatus } from './hooks/useTypingStatus';

export default function ChatScreen() {
  const { id: receiverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [receiver, setReceiver] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<any | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [visibleButtonsId, setVisibleButtonsId] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState<{id: string, time: number}>({id: '', time: 0});
  const [receiverStatus, setReceiverStatus] = useState<'online' | 'offline'>('offline');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [receiverActiveChatId, setReceiverActiveChatId] = useState<string | null>(null);
  const [receiverLastSeen, setReceiverLastSeen] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState<any>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const chatId = [auth.currentUser?.uid, receiverId].sort().join('_');

  // Hooks
  const { 
    messages, 
    loading, 
    messageLimit, 
    loadingMore, 
    loadMore,
    lastMessageCount 
  } = useChatMessages(chatId);

  const { 
    sendMessage: performSendMessage, 
    editMessage: performEditMessage, 
    deleteMessage: performDeleteMessage, 
    reactToMessage: performReactToMessage, 
    clearChat: performClearChat 
  } = useChatActions(chatId, receiverId || '', receiver, receiverActiveChatId);

  const { isOtherTyping, handleTyping } = useTypingStatus(chatId, receiverId || '');

  // Handle captured image from camera
  useEffect(() => {
    if (location.state?.capturedImage) {
      const dataUrl = location.state.capturedImage;
      setFilePreviewUrl(dataUrl);
      
      fetch(dataUrl)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "camera_photo.jpg", { type: "image/jpeg" });
          setSelectedFile(file);
        });
      
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) setShowOptions(false);
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) setShowPlusMenu(false);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (receiverId === 'gx-ai' || receiverId === 'flow-ai' || receiverId === 'grix-ai') {
      navigate('/chat/grix-ai', { replace: true });
      return;
    }
    if (!receiverId || !auth.currentUser) return;

    const cachedReceiver = CacheService.getUser(receiverId);
    if (cachedReceiver) setReceiver(cachedReceiver);

    const receiverUnsubscribe = onSnapshot(doc(db, "users", receiverId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setReceiver(data);
        CacheService.saveUser(receiverId, data);
      }
    });

    const statusRef = rtdbRef(rtdb, `/status/${receiverId}`);
    const statusUnsubscribe = onValue(statusRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setReceiverStatus(val.state);
        setReceiverActiveChatId(val.activeChatId || null);
        setReceiverLastSeen(val.last_changed || null);
      } else {
        setReceiverStatus('offline');
        setReceiverActiveChatId(null);
        setReceiverLastSeen(null);
      }
    });

    // Fetch chat settings for current user's preferences for this receiver
    const settingsUnsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid, "chatSettings", receiverId), (snap) => {
      if (snap.exists()) {
        setChatSettings(snap.data());
      } else {
        setChatSettings(null);
      }
    });

    if (auth.currentUser) {
      const myStatusRef = rtdbRef(rtdb, `/status/${auth.currentUser.uid}`);
      update(myStatusRef, { activeChatId: receiverId });
    }

    return () => {
      receiverUnsubscribe();
      statusUnsubscribe();
      settingsUnsubscribe();
      if (auth.currentUser) {
        const myStatusRef = rtdbRef(rtdb, `/status/${auth.currentUser.uid}`);
        update(myStatusRef, { activeChatId: null });
      }
    };
  }, [receiverId, chatId, navigate]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollTop === 0) {
      loadMore(target.scrollHeight, scrollContainerRef.current);
    }
  };

  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      const isFromMe = lastMsg?.senderId === auth.currentUser?.uid;
      scrollToBottom(isFromMe ? 'smooth' : 'auto');
      lastMessageCount.current = messages.length;
    }
  }, [messages, scrollToBottom, lastMessageCount]);

  useEffect(() => {
    if (isOtherTyping) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  }, [isOtherTyping, scrollToBottom]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const reader = new FileReader();
      reader.onloadend = () => setFilePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
    setSelectedFile(file);
    if (e.target) e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !auth.currentUser || isSending || isUploading) return;

    const textToSend = newMessage;
    const replyContext = replyingTo;
    const editMsg = editingMessage;

    setNewMessage('');
    setReplyingTo(null);
    setEditingMessage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    setIsSending(true);
    try {
      if (editMsg) {
        await performEditMessage(editMsg.id, textToSend);
      } else {
        if (selectedFile) setIsUploading(true);
        await performSendMessage({
          text: textToSend,
          file: selectedFile,
          replyTo: replyContext,
          onProgress: (p) => setUploadProgress(p)
        });
        setSelectedFile(null);
        setFilePreviewUrl(null);
        setUploadProgress(0);
        setIsUploading(false);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message.");
    } finally {
      setIsSending(false);
      setIsUploading(false);
    }
  };

  const handleMessageTap = useCallback((e: React.MouseEvent | React.TouchEvent, msg: any) => {
    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
    e.stopPropagation();
    
    const now = Date.now();
    if (lastTap.id === msg.id && now - lastTap.time < 300) {
      setReplyingTo(msg);
      setVisibleButtonsId(null);
      setShowReactionPicker(null);
      setLastTap({id: '', time: 0});
      if (window.navigator.vibrate) window.navigator.vibrate(10);
    } else {
      setLastTap({id: msg.id, time: now});
      setVisibleButtonsId(visibleButtonsId === msg.id ? null : msg.id);
      setShowReactionPicker(showReactionPicker?.id === msg.id ? null : msg);
    }
  }, [lastTap, visibleButtonsId, showReactionPicker]);

  const startEdit = useCallback((msg: any) => {
    setEditingMessage(msg);
    setNewMessage(msg.text);
    setActiveMessageMenu(null);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
      }
    }, 100);
  }, []);

  const clearChat = async () => {
    if (!window.confirm("Are you sure you want to clear this chat? This will delete all messages for you.")) return;
    await performClearChat();
    setShowOptions(false);
  };

  const deleteChat = async () => {
    if (!window.confirm("Delete this chat? This action cannot be undone.")) return;
    await performClearChat();
    navigate('/');
  };

  const hideChat = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        hiddenChats: arrayUnion(chatId)
      });
      navigate('/chats');
    } catch (error) {
      console.error("Error hiding chat:", error);
    }
  };

  const archiveChat = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        archivedChats: arrayUnion(chatId)
      });
      navigate('/chats');
    } catch (error) {
      console.error("Error archiving chat:", error);
    }
  };

  const { theme, setTheme, chatBackground, resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[var(--bg-main)] overflow-hidden relative">
      {/* Header */}
      <ChatHeader 
        receiver={{
          ...receiver,
          fullName: chatSettings?.nickname || receiver?.fullName,
          photoURL: chatSettings?.customPhotoUrl || receiver?.photoURL
        }}
        receiverId={receiverId}
        formatLastSeen={() => formatLastSeen(receiverLastSeen || receiver?.lastSeen)}
        showOptions={showOptions}
        setShowOptions={setShowOptions}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
        deleteChat={deleteChat}
        hideChat={hideChat}
        archiveChat={archiveChat}
        optionsRef={optionsRef}
        isTyping={isOtherTyping}
        receiverStatus={receiverStatus}
        receiverActiveChatId={receiverActiveChatId}
        currentUserId={auth.currentUser?.uid}
      />

      {/* Messages */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-2 relative no-scrollbar touch-pan-y w-full max-w-full ${chatBackground || 'bg-[var(--bg-main)]'}`} 
        onClick={() => { setActiveMessageMenu(null); setVisibleButtonsId(null); }}
      >
        {/* WhatsApp-style pattern overlay */}
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
            const currentMessages = messages.slice(-messageLimit);
            return currentMessages.map((msg, index) => {
              const isMe = msg.senderId === auth.currentUser?.uid;
              const prevMsg = index > 0 ? currentMessages[index - 1] : null;
              const isSameSender = prevMsg?.senderId === msg.senderId;
              
              return (
                  <div 
                    key={msg.id} 
                    className={`flex w-full max-w-full ${isMe ? 'justify-end' : 'justify-start'} ${!isSameSender ? 'mt-2' : 'mt-0.5'}`}
                  >
                    <div className="relative group max-w-[75%] min-w-0">
                    {/* Tail for the first message in a sequence */}
                    {!isSameSender && (
                      <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2 bg-[var(--bubble-own)]' : '-left-2 bg-[var(--bubble-other)]'}`} 
                           style={{ clipPath: isMe ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}>
                      </div>
                    )}

                    <motion.div 
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.5}
                      dragSnapToOrigin
                      dragTransition={{ bounceStiffness: 1500, bounceDamping: 60 }}
                      onDragStart={(e) => e.stopPropagation()}
                      onDrag={(_, info) => {
                        // Received Message (Left side)
                        if (!isMe) {
                          // Left to Right (L->R) -> Reply
                          if (info.offset.x > 70 && replyingTo?.id !== msg.id) {
                            setReplyingTo(msg);
                            if (window.navigator.vibrate) window.navigator.vibrate(10);
                          }
                          // Right to Left (R->L) -> Options
                          if (info.offset.x < -70 && activeMessageMenu?.id !== msg.id) {
                            setActiveMessageMenu(msg);
                            if (window.navigator.vibrate) window.navigator.vibrate(10);
                          }
                        } 
                        // Sent Message (Right side)
                        else {
                          // Right to Left (R->L) -> Reply
                          if (info.offset.x < -70 && replyingTo?.id !== msg.id) {
                            setReplyingTo(msg);
                            if (window.navigator.vibrate) window.navigator.vibrate(10);
                          }
                          // Left to Right (L->R) -> Options
                          if (info.offset.x > 70 && activeMessageMenu?.id !== msg.id) {
                            setActiveMessageMenu(msg);
                            if (window.navigator.vibrate) window.navigator.vibrate(10);
                          }
                        }
                      }}
                      onClick={(e) => handleMessageTap(e, msg)}
                      className={`px-2.5 py-1.5 rounded-lg shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform select-none max-w-full ${
                        activeMessageMenu?.id === msg.id ? 'z-50' : 'z-10'
                      } ${
                        isMe 
                          ? 'bg-[var(--bubble-own)] text-[var(--bubble-text-own)]' 
                          : 'bg-[var(--bubble-other)] text-[var(--bubble-text-other)]'
                      }`}
                    >
                      {/* Reaction Picker on Click */}
                      {showReactionPicker?.id === msg.id && (
                        <ChatMessageReactions 
                          onReact={(emoji) => performReactToMessage(msg.id, emoji)}
                          onClose={() => setShowReactionPicker(null)}
                          position={isMe ? 'right' : 'left'}
                        />
                      )}

                      {/* Reply Context */}
                      {msg.replyTo && (
                        <div className="mb-1 p-1.5 rounded bg-black/5 border-l-4 border-[var(--primary)] text-[12px]">
                          <p className="font-bold text-[var(--primary)] text-[10px]">
                            {msg.replyTo.senderId === auth.currentUser?.uid ? 'You' : receiver?.fullName}
                          </p>
                          <p className="truncate text-zinc-600 italic">{msg.replyTo.text}</p>
                        </div>
                      )}

                      <div className="flex flex-col min-w-[60px] max-w-full">
                        {msg.imageUrl && msg.type !== 'video' && (
                          <div 
                            className="mb-1 rounded-lg overflow-hidden border border-black/5 cursor-pointer active:opacity-80 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/chat/preview', { 
                                state: { 
                                  imageUrl: msg.imageUrl, 
                                  senderName: isMe ? 'You' : receiver?.fullName 
                                } 
                              });
                            }}
                          >
                            <img 
                              src={msg.imageUrl} 
                              alt="Sent image" 
                              className="max-w-full h-auto max-h-64 object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {msg.expiresAt && (
                              <div className="bg-black/40 text-white text-[9px] px-2 py-1 flex items-center gap-1">
                                <Clock size={10} /> Expires in 24h
                              </div>
                            )}
                          </div>
                        )}
                        {(msg.type === 'video' || (msg.fileUrl && msg.type === 'video')) && (
                          <div className="mb-1 rounded-lg overflow-hidden border border-black/5">
                            <video 
                              src={msg.fileUrl || msg.imageUrl} 
                              controls 
                              className="max-w-full h-auto max-h-80 object-contain bg-black"
                              playsInline
                            />
                          </div>
                        )}
                        {msg.type === 'audio' && msg.fileUrl && (
                          <div className="mb-1 w-full flex justify-center">
                            <VoiceMessage 
                              fileUrl={msg.fileUrl}
                              isMe={isMe}
                            />
                          </div>
                        )}
                        {msg.fileUrl && msg.type !== 'video' && msg.type !== 'audio' && (
                          <div className="mb-1 p-2 rounded-lg bg-black/5 border border-black/10 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)]">
                              <FileIcon size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-bold truncate text-[var(--text-primary)]">{msg.fileName || 'File'}</p>
                              <p className="text-[10px] text-red-500 uppercase font-black tracking-tighter flex items-center gap-1">
                                <ShieldAlert size={10} /> One-Time Download
                              </p>
                            </div>
                            <a 
                              href={msg.fileUrl} 
                              download={msg.fileName}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="p-2 hover:bg-black/5 rounded-full text-[var(--primary)] transition-colors"
                            >
                              <Download size={18} />
                            </a>
                          </div>
                        )}
                        {msg.text && <p className="text-[14.5px] leading-snug break-all whitespace-pre-wrap overflow-hidden">{msg.text}</p>}
                        <div className="flex items-center justify-end gap-1 mt-0.5 -mr-1">
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {toDate(msg.timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) || ''}
                            {msg.isEdited && ' • edited'}
                          </span>
                          {isMe && (
                            <div className="flex ml-0.5">
                              {msg.isRead ? (
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

                      {/* Display Reactions */}
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

                    {/* Message Actions (Reply & Three Dots) - Visible on hover or when menu is active */}
                    <div className={`absolute top-1/2 -translate-y-1/2 transition-all duration-200 flex items-center gap-1 whitespace-nowrap z-20 ${isMe ? 'right-full mr-2' : 'left-full ml-2'} ${activeMessageMenu?.id === msg.id || visibleButtonsId === msg.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'}`}>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setReplyingTo(msg);
                          setVisibleButtonsId(null);
                        }} 
                        className="p-1.5 bg-white hover:bg-zinc-50 rounded-full text-[var(--primary)] shadow-md border border-zinc-100 transition-all active:scale-90"
                        title="Reply"
                      >
                        <Reply size={14} />
                      </button>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setActiveMessageMenu(activeMessageMenu?.id === msg.id ? null : msg); 
                          setVisibleButtonsId(null);
                        }} 
                        className="p-1.5 bg-white hover:bg-zinc-50 rounded-full text-[var(--primary)] shadow-md border border-zinc-100 transition-all active:scale-90"
                        title="More options"
                      >
                        <MoreVertical size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
          
          {/* Typing Indicator */}
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
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                      className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                      className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" 
                    />
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }} 
                      transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                      className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full" 
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--primary)] uppercase tracking-wider">Typing...</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <ChatBottom 
        activeMessageMenu={activeMessageMenu}
        setActiveMessageMenu={setActiveMessageMenu}
        setReplyingTo={setReplyingTo}
        startEdit={startEdit}
        deleteMessage={performDeleteMessage}
        currentUserUid={auth.currentUser?.uid}
        setShowReactionPicker={setShowReactionPicker}
        editingMessage={editingMessage}
        setEditingMessage={setEditingMessage}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        replyingTo={replyingTo}
        receiver={receiver}
        handleSendMessage={handleSendMessage}
        fileInputRef={fileInputRef}
        imageInputRef={imageInputRef}
        handleFileChange={handleFileChange}
        showPlusMenu={showPlusMenu}
        setShowPlusMenu={setShowPlusMenu}
        plusMenuRef={plusMenuRef}
        chatId={chatId}
        filePreviewUrl={filePreviewUrl}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        setSelectedFile={setSelectedFile}
        setFilePreviewUrl={setFilePreviewUrl}
        textareaRef={textareaRef}
        handleTyping={handleTyping}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiPickerRef={emojiPickerRef}
        isSending={isSending}
        selectedFile={selectedFile}
      />
    </div>
  );
}
