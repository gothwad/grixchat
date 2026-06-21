import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { ChatForwardOverlay } from '../../components/chat-ui/ChatForwardOverlay';
import { LocalDataCache } from '../../services/LocalDataCache';

import { useChatMessages } from './hooks/useChatMessages';
import { useChatActions } from './hooks/useChatActions';
import { useTypingStatus } from './hooks/useTypingStatus';
import { useChatId } from './hooks/useChatId';
import { useChatSync } from './hooks/useChatSync';
import { useChatFormHandler } from './hooks/useChatFormHandler';
import { useChatScroll } from './hooks/useChatScroll';
import { formatLastSeen } from '../../utils/dateUtils.ts';

import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import { MessageList } from './components/MessageList';
import { ChatOptionsSheet } from './components/ChatOptionsSheet';
import ChatTimeModal from '../../components/chat-ui/ChatTimeModal';

// Modularity Split Components
import { ChatCustomizerModal } from './components/ChatCustomizerModal';
import { PinnedMessageBanner } from './components/PinnedMessageBanner';
import { ToastIndicator } from './components/ToastIndicator';

// Modularity Split Hooks
import { useScrollLock } from './hooks/useScrollLock';
import { useCustomChatBg } from './hooks/useCustomChatBg';
import { useMessageSearch } from './hooks/useMessageSearch';
import { useForwardHandler } from './hooks/useForwardHandler';
import { useChatLock } from './hooks/useChatLock';

export default function ChatScreen() {
  const { id: receiverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData: currentUserData, refreshUserData } = useAuth();
  
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
    watchData
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

  const [showCustomizerModal, setShowCustomizerModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2200);
  };

  // Split-up State & Hook Coordinators
  useScrollLock();
  const { customBg, setCustomBg, activeChatBackground } = useCustomChatBg(receiverId);
  const { searchQuery, setSearchQuery, selectedDate, setSelectedDate, showSearch, setShowSearch, filteredMessages } = useMessageSearch(messages);
  const { forwardTargetMsg, setForwardTargetMsg, selectedMsgIds, setSelectedMsgIds, handleForwardComplete } = useForwardHandler(user);
  const { lockState, isChatTimeModalOpen, setIsChatTimeModalOpen, handleSaveChatTimeRestrictions } = useChatLock(chatId, watchData?.watch_state?.chat_times, showToast);

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

  const [pinnedMsg, setPinnedMsg] = useState<any>(null);

  useEffect(() => {
    if (chatId) {
      const saved = LocalDataCache.get<any>(`gx_pinned_${chatId}`);
      setPinnedMsg(saved || null);
    } else {
      setPinnedMsg(null);
    }
    setSelectedMsgIds([]);
  }, [chatId, setSelectedMsgIds]);

  const handlePinClick = (msg: any) => {
    if (chatId) {
      LocalDataCache.set(`gx_pinned_${chatId}`, msg);
      setPinnedMsg(msg);
      setActiveMessageMenu(null);
    }
  };

  const handleUnpinClick = () => {
    if (chatId) {
      LocalDataCache.remove(`gx_pinned_${chatId}`);
      setPinnedMsg(null);
    }
  };

  const customHandleMessageTap = (e: any, msg: any) => {
    if (selectedMsgIds.length > 0) {
      if (e && e.stopPropagation) e.stopPropagation();
      setSelectedMsgIds(prev =>
        prev.includes(msg.id)
          ? prev.filter(id => id !== msg.id)
          : [...prev, msg.id]
      );
    } else {
      handleMessageTap(e, msg);
    }
  };

  const handleSendTask = async (task: { title: string; description: string; assignee: string; dueDate: string; status: 'pending' }) => {
    if (!user || !chatId) return;
    try {
      await performSendMessage({
        text: JSON.stringify(task),
        customMediaType: 'task'
      });
    } catch (err) {
      console.error('Error sending task:', err);
    }
  };

  const handleSendLocation = async (loc: { latitude: number; longitude: number; name: string }) => {
    if (!user || !chatId) return;
    try {
      await performSendMessage({
        text: JSON.stringify(loc),
        customMediaType: 'location'
      });
    } catch (err) {
      console.error('Error sending location:', err);
    }
  };

  const handleSendPoll = async (poll: { question: string; options: string[]; multiple: boolean }) => {
    if (!user || !chatId) return;
    try {
      const pollText = JSON.stringify({
        question: poll.question,
        options: poll.options.map((opt, i) => ({ id: String(i), text: opt, voters: [] })),
        multiple: poll.multiple
      });
      await performSendMessage({
        text: pollText,
        customMediaType: 'poll'
      });
    } catch (err) {
      console.error('Error sending poll:', err);
    }
  };

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
    if (isOtherTyping) {
      scrollToBottom('smooth');
      const t1 = setTimeout(() => scrollToBottom('smooth'), 80);
      const t2 = setTimeout(() => scrollToBottom('smooth'), 220);
      const t3 = setTimeout(() => scrollToBottom('smooth'), 450);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [isOtherTyping, scrollToBottom]);

  const deleteChat = async () => {
    if (window.confirm("Delete this chat?")) {
      await performClearChat();
      navigate('/chats');
    }
  };

  const hideChat = async () => {
    if (!user || !supabase) return;
    const isHidden = currentUserData?.hiddenChats?.includes(chatId);
    const newHidden = isHidden ? currentUserData.hiddenChats.filter((id: any) => id !== chatId) : [...(currentUserData.hiddenChats || []), chatId];
    await supabase.from('users').update({ hidden_chats: newHidden }).eq('id', user.id);
    await refreshUserData();
    if (!isHidden) navigate('/chats');
  };

  const archiveChat = async () => {
    if (!user || !supabase) return;
    const isArchived = currentUserData?.archivedChats?.includes(chatId);
    const newArchived = isArchived ? currentUserData.archivedChats.filter((id: any) => id !== chatId) : [...(currentUserData.archivedChats || []), chatId];
    await supabase.from('users').update({ archived_chats: newArchived }).eq('id', user.id);
    await refreshUserData();
    if (!isArchived) navigate('/chats');
  };

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
        clearChat={performClearChat}
        isHidden={isHidden}
        isArchived={isArchived}
        optionsRef={optionsRef}
        isTyping={isOtherTyping}
        receiverStatus={receiverStatus}
        receiverActiveChatId={receiverActiveChatId}
        currentUserId={user?.id}
        type={convType}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedDate={selectedDate}
        setSelectedDate={setSelectedDate}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        selectedMsgCount={selectedMsgIds.length}
        onClearMsgSelection={() => setSelectedMsgIds([])}
        onForwardMsgSelection={() => {
          const combinedText = messages
            .filter(m => selectedMsgIds.includes(m.id))
            .map(m => m.content || m.text || '')
            .join('\n\n');
          
          setForwardTargetMsg({ id: 'bulk', content: combinedText });
          setSelectedMsgIds([]);
        }}
        onDeleteMsgSelection={async () => {
          if (window.confirm(`Delete ${selectedMsgIds.length} selected messages for me?`)) {
            for (const id of selectedMsgIds) {
              await performDeleteMessage(id);
            }
            setSelectedMsgIds([]);
            showToast('Messages deleted successfully');
          }
        }}
        onCopyMsgSelection={() => {
          const combinedText = messages
            .filter(m => selectedMsgIds.includes(m.id))
            .map(m => m.content || m.text || '')
            .filter(Boolean)
            .join('\n\n');
          
          if (combinedText) {
            navigator.clipboard.writeText(combinedText);
            showToast(`${selectedMsgIds.length} message${selectedMsgIds.length > 1 ? 's' : ''} copied`);
          } else {
            showToast('No copyable text content in selected messages');
          }
          setSelectedMsgIds([]);
        }}
        onSelectChatTime={() => setIsChatTimeModalOpen(true)}
      />

      {/* Pinned Message Bar Component */}
      <PinnedMessageBanner 
        pinnedMsg={pinnedMsg}
        onUnpinClick={handleUnpinClick}
      />

      <MessageList 
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        handleScroll={handleScroll}
        chatBackground={activeChatBackground}
        loadingMore={loadingMore}
        loading={loading}
        messages={filteredMessages}
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
        handleMessageTap={customHandleMessageTap}
        performReactToMessage={performReactToMessage}
        isOtherTyping={isOtherTyping}
        selectedMsgIds={selectedMsgIds}
      />

      <ChatBottom 
        activeMessageMenu={activeMessageMenu}
        setActiveMessageMenu={setActiveMessageMenu}
        setReplyingTo={setReplyingTo}
        startEdit={startEdit}
        deleteMessage={performDeleteMessage}
        currentUserUid={user?.id}
        setShowReactionPicker={setShowReactionPicker}
        performReactToMessage={performReactToMessage}
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
        onForwardClick={(msg) => { setForwardTargetMsg(msg); setActiveMessageMenu(null); }}
        onSelectClick={(msg) => { setSelectedMsgIds([msg.id]); setActiveMessageMenu(null); }}
        onPinClick={handlePinClick}
        onSendLocation={handleSendLocation}
        onSendPoll={handleSendPoll}
        onSendTask={handleSendTask}
        isLocked={lockState.isLocked}
        lockMessage={lockState.message}
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
        onCustomizeClick={() => {
          setShowOptions(false);
          setShowCustomizerModal(true);
        }}
      />

      {/* Customizer modal component for Chat-Specific Wallpapers and Bubble Colors */}
      <ChatCustomizerModal 
        isOpen={showCustomizerModal}
        onClose={() => setShowCustomizerModal(false)}
        receiver={receiver}
        receiverId={receiverId}
        customBg={customBg}
        setCustomBg={setCustomBg}
      />

      {/* WhatsApp Full Screen Forward UI */}
      <ChatForwardOverlay 
        isOpen={!!forwardTargetMsg}
        onClose={() => setForwardTargetMsg(null)}
        messageToForward={forwardTargetMsg}
        currentUserId={user?.id || ''}
        onForwardComplete={handleForwardComplete}
      />

      {/* Toast Alert Indicator */}
      <ToastIndicator toastMessage={toastMessage} />

      {/* Chat Time modal */}
      <ChatTimeModal 
        isOpen={isChatTimeModalOpen}
        onClose={() => setIsChatTimeModalOpen(false)}
        currentRestrictions={watchData?.watch_state?.chat_times}
        onSave={handleSaveChatTimeRestrictions}
        title="Chat Time Scheduler"
      />
    </div>
  );
}
