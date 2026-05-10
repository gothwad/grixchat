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
  const [visibleButtonsId, setVisibleButtonsId] = useState<string | null>(null);
  const [lastTap, setLastTap] = useState<{id: string, time: number}>({id: '', time: 0});
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | Blob | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
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
    clearChat: performClearChat 
  } = useChatActions(chatId, receiverId || '', receiver, receiverActiveChatId);

  const { isOtherTyping, handleTyping } = useTypingStatus(chatId, receiverId || '');

  useEffect(() => {
    if (location.state?.capturedImage) {
      const dataUrl = location.state.capturedImage;
      setFilePreviewUrl(dataUrl);
      fetch(dataUrl).then(res => res.blob()).then(blob => {
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
      }
    } catch (error) {
      console.error("Error sendMessage:", error);
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

  const deleteChat = async () => {
    if (!window.confirm("Delete this chat?")) return;
    await performClearChat();
    navigate('/');
  };

  const hideChat = async () => {
    if (!auth.currentUser) return;
    const isHidden = currentUserData?.hiddenChats?.includes(chatId);
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
    const isArchived = currentUserData?.archivedChats?.includes(chatId);
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
  const isHidden = currentUserData?.hiddenChats?.includes(chatId);
  const isArchived = currentUserData?.archivedChats?.includes(chatId);

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
        visibleButtonsId={visibleButtonsId}
        setVisibleButtonsId={setVisibleButtonsId}
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
        filePreviewUrl={filePreviewUrl}
        isUploading={isUploading}
        uploadProgress={uploadProgress}
        setSelectedFile={(file: any) => setSelectedFile(file)}
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
