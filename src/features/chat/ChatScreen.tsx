import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { 
  doc, 
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

import { AnimatePresence } from 'motion/react';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatActions } from './hooks/useChatActions';
import { useTypingStatus } from './hooks/useTypingStatus';
import { useChatId } from './hooks/useChatId';
import { useChatSync } from './hooks/useChatSync';
import { formatLastSeen } from '../../utils/dateUtils.ts';
import { useTheme } from '../../contexts/ThemeContext';

import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import WatchTogether from './components/WatchTogether.tsx';
import { MessageList } from './components/MessageList';
import { ChatOptionsSheet } from './components/ChatOptionsSheet';

export default function ChatScreen() {
  const { id: receiverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { chatId, convType } = useChatId(receiverId);

  const [showOptions, setShowOptions] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);
  const [activeMessageMenu, setActiveMessageMenu] = useState<any | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<any | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [newMessage, setNewMessage] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { 
    receiver,
    receiverStatus,
    receiverActiveChatId,
    receiverLastSeen,
    chatSettings,
    currentUserData,
    watchData,
    isWatchMode,
    updateWatchState,
    toggleWatchMode
  } = useChatSync(receiverId, chatId, convType);

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
    clearChat: performClearChat,
    cleanupMessages
  } = useChatActions(chatId, receiverId || '', receiver, receiverActiveChatId);

  // Trigger cleanup when first opening the chat
  useEffect(() => {
    if (chatId) {
      console.log(`🔥 [AUTO-CLEANUP] Initializing cleanup for chat: ${chatId}`);
      cleanupMessages(chatId).catch(err => console.error("Auto-cleanup on mount failed:", err));
    }
  }, [chatId, cleanupMessages]);

  const { isOtherTyping, handleTyping } = useTypingStatus(chatId, receiverId || '');

  useEffect(() => {
    if (location.state?.capturedImage) {
      const dataUrl = location.state.capturedImage;
      setFilePreviewUrls([dataUrl]);
      fetch(dataUrl).then(res => res.blob()).then(blob => {
        const file = new File([blob], "camera_photo.jpg", { type: "image/jpeg" });
        setSelectedFiles([file]);
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
    if (isOtherTyping) setTimeout(() => scrollToBottom('smooth'), 100);
  }, [isOtherTyping, scrollToBottom]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !auth.currentUser) return;
    
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviewUrls = [...filePreviewUrls];
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      } else {
        newPreviewUrls.push('');
      }
    }
    setFilePreviewUrls(newPreviewUrls);
    if (e.target) e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !auth.currentUser || isSending) return;
    
    const textToSend = newMessage;
    const replyContext = replyingTo;
    const editMsg = editingMessage;
    const filesToSend = [...selectedFiles];
    
    setNewMessage('');
    setReplyingTo(null);
    setEditingMessage(null);
    setSelectedFiles([]);
    setFilePreviewUrls([]);
    
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsSending(true);

    try {
      if (editMsg) {
        await performEditMessage(editMsg.id, textToSend);
      } else {
        // If there's text, send it first
        if (textToSend) {
          await performSendMessage({
            text: textToSend,
            replyTo: filesToSend.length === 0 ? replyContext : null // Only apply reply to text if no files
          });
        }
        
        // Send files in background
        for (let i = 0; i < filesToSend.length; i++) {
          const file = filesToSend[i];
          const localUrl = filePreviewUrls[i];
          
          performSendMessage({
            text: '', // Files sent individually
            file,
            localPreviewUrl: localUrl,
            replyTo: i === 0 && !textToSend ? replyContext : null // Only apply reply to first file if no text
          }).catch(err => console.error("Error sending file message:", err));
        }
      }
    } catch (error) {
      console.error("Error sendMessage:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleMessageTap = useCallback((e: React.MouseEvent | React.TouchEvent, msg: any) => {
    if (e.type === 'touchstart' && e.cancelable) e.preventDefault();
    e.stopPropagation();
    
    // Open message options sheet on single tap
    setActiveMessageMenu(msg);
    setShowReactionPicker(null);
    
    if (window.navigator.vibrate) window.navigator.vibrate(5);
  }, []);

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

  const deleteChat = async () => {
    if (!window.confirm("Delete this chat?")) return;
    await performClearChat();
    navigate('/');
  };

  const hideChat = async () => {
    if (!auth.currentUser) return;
    const isHidden = Array.isArray(currentUserData?.hiddenChats) && currentUserData.hiddenChats.includes(chatId);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        hiddenChats: isHidden ? arrayRemove(chatId) : arrayUnion(chatId)
      });
      if (!isHidden) navigate('/chats');
    } catch (error) {
      console.error("Error hideChat:", error);
    }
  };

  const archiveChat = async () => {
    if (!auth.currentUser) return;
    const isArchived = Array.isArray(currentUserData?.archivedChats) && currentUserData.archivedChats.includes(chatId);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        archivedChats: isArchived ? arrayRemove(chatId) : arrayUnion(chatId)
      });
      if (!isArchived) navigate('/chats');
    } catch (error) {
      console.error("Error archiveChat:", error);
    }
  };

  const { chatBackground } = useTheme();
  const isHidden = Array.isArray(currentUserData?.hiddenChats) && currentUserData.hiddenChats.includes(chatId);
  const isArchived = Array.isArray(currentUserData?.archivedChats) && currentUserData.archivedChats.includes(chatId);

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[var(--bg-main)] overflow-hidden relative">
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
        isHidden={isHidden}
        isArchived={isArchived}
        optionsRef={optionsRef}
        isTyping={isOtherTyping}
        receiverStatus={receiverStatus}
        receiverActiveChatId={receiverActiveChatId}
        currentUserId={auth.currentUser?.uid}
        onWatchTogether={toggleWatchMode}
        type={convType}
      />

      <AnimatePresence>
        {isWatchMode && watchData?.watchTogetherUrl && (
          <WatchTogether 
            url={watchData.watchTogetherUrl}
            chatId={chatId}
            currentUserId={auth.currentUser?.uid || ''}
            watchState={watchData.watchState}
            updateWatchState={updateWatchState}
            onClose={toggleWatchMode}
          />
        )}
      </AnimatePresence>

      <MessageList 
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        handleScroll={handleScroll}
        chatBackground={chatBackground}
        loadingMore={loadingMore}
        loading={loading}
        messages={messages}
        messageLimit={messageLimit}
        auth={auth}
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
        isOtherTyping={isOtherTyping}
      />

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
        filePreviewUrls={filePreviewUrls}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        setSelectedFiles={setSelectedFiles}
        setFilePreviewUrls={setFilePreviewUrls}
        textareaRef={textareaRef}
        handleTyping={handleTyping}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiPickerRef={emojiPickerRef}
        isSending={isSending}
        selectedFiles={selectedFiles}
      />

      <ChatOptionsSheet 
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        receiver={receiver}
        receiverId={receiverId}
        isArchived={isArchived}
        isHidden={isHidden}
        isMuted={isMuted}
        archiveChat={archiveChat}
        hideChat={hideChat}
        setIsMuted={setIsMuted}
        deleteChat={deleteChat}
        onWatchTogether={toggleWatchMode}
      />
    </div>
  );
}
