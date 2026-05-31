import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';

import { AnimatePresence } from 'motion/react';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatActions } from './hooks/useChatActions';
import { useTypingStatus } from './hooks/useTypingStatus';
import { useChatId } from './hooks/useChatId';
import { useChatSync } from './hooks/useChatSync';
import { useChatFormHandler } from './hooks/useChatFormHandler';
import { useChatScroll } from './hooks/useChatScroll';
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
  const { user, userData: currentUserData } = useAuth();
  
  const { chatId, convType } = useChatId(receiverId);

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
    addOptimisticMessage,
    confirmOptimisticMessage
  } = useChatMessages(chatId);

  const { 
    sendMessage: performSendMessage, 
    editMessage: performEditMessage, 
    deleteMessage: performDeleteMessage, 
    reactToMessage: performReactToMessage, 
    clearChat: performClearChat
  } = useChatActions(chatId, receiverId || '');

  const { isOtherTyping, handleTyping } = useTypingStatus(chatId, receiverId || '');

  const {
    scrollContainerRef,
    messagesEndRef,
    handleScroll,
    scrollToBottom
  } = useChatScroll(messages, loading, user?.id, loadingMore, loadMore);

  const {
    showOptions,
    setShowOptions,
    showPlusMenu,
    setShowPlusMenu,
    isMuted,
    setIsMuted,
    replyingTo,
    setReplyingTo,
    editingMessage,
    setEditingMessage,
    activeMessageMenu,
    setActiveMessageMenu,
    showReactionPicker,
    setShowReactionPicker,
    showEmojiPicker,
    setShowEmojiPicker,
    isSending,
    selectedFiles,
    setSelectedFiles,
    filePreviewUrls,
    setFilePreviewUrls,
    uploadProgress,
    isUploading,
    newMessage,
    setNewMessage,
    handleFileChange,
    handleSendMessage,
    handleMessageTap,
    startEdit
  } = useChatFormHandler({
    chatId,
    receiverId: receiverId || '',
    user,
    addOptimisticMessage,
    confirmOptimisticMessage,
    performSendMessage,
    performEditMessage,
    textareaRef,
    scrollToBottom
  });

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
  }, [location, navigate, setFilePreviewUrls, setSelectedFiles]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsRef.current && !optionsRef.current.contains(event.target as Node)) setShowOptions(false);
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) setShowPlusMenu(false);
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) setShowEmojiPicker(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setShowOptions, setShowPlusMenu, setShowEmojiPicker]);

  useEffect(() => {
    if (isOtherTyping) setTimeout(() => scrollToBottom('smooth'), 100);
  }, [isOtherTyping, scrollToBottom]);

  const deleteChat = async () => {
    if (window.confirm("Delete this chat?")) {
      await performClearChat();
      navigate('/chats');
    }
  };

  const hideChat = async () => {
    if (!user) return;
    const isHidden = currentUserData?.hiddenChats?.includes(chatId);
    const newHidden = isHidden ? currentUserData.hiddenChats.filter((id: any) => id !== chatId) : [...(currentUserData.hiddenChats || []), chatId];
    await supabase.from('users').update({ hidden_chats: newHidden }).eq('id', user.id);
    if (!isHidden) navigate('/chats');
  };

  const archiveChat = async () => {
    if (!user) return;
    const isArchived = currentUserData?.archivedChats?.includes(chatId);
    const newArchived = isArchived ? currentUserData.archivedChats.filter((id: any) => id !== chatId) : [...(currentUserData.archivedChats || []), chatId];
    await supabase.from('users').update({ archived_chats: newArchived }).eq('id', user.id);
    if (!isArchived) navigate('/chats');
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
        currentUserId={user?.id}
        onWatchTogether={toggleWatchMode}
        type={convType}
      />

      <AnimatePresence>
        {isWatchMode && watchData?.watch_together_url && (
          <WatchTogether 
            url={watchData.watch_together_url}
            chatId={chatId}
            currentUserId={user?.id || ''}
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
        currentUserUid={user?.id}
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
