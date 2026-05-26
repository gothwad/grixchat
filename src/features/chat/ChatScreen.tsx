import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';

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
import { getAcceptedChats, acceptChat, declineChat } from '../../utils/acceptedChats';

export default function ChatScreen() {
  const { id: receiverId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userData: currentUserData } = useAuth();
  
  const { chatId, convType } = useChatId(receiverId);

  // Tracks if the direct conversation is accepted or if it is a pending Message Request
  const [isAccepted, setIsAccepted] = useState(true);

  useEffect(() => {
    if (chatId) {
      const accepted = convType !== 'direct' || getAcceptedChats().includes(chatId);
      setIsAccepted(accepted);
    }
  }, [chatId, convType]);

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
    lastMessageCount 
  } = useChatMessages(chatId);

  const { 
    sendMessage: performSendMessage, 
    editMessage: performEditMessage, 
    deleteMessage: performDeleteMessage, 
    reactToMessage: performReactToMessage, 
    clearChat: performClearChat
  } = useChatActions(chatId, receiverId || '');

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
      loadMore();
    }
  };

  useEffect(() => {
    if (messages.length > lastMessageCount.current) {
      const lastMsg = messages[messages.length - 1];
      const isFromMe = lastMsg?.sender_id === user?.id;
      scrollToBottom(isFromMe ? 'smooth' : 'auto');
      lastMessageCount.current = messages.length;
    }
  }, [messages, scrollToBottom, user?.id]);

  useEffect(() => {
    if (isOtherTyping) setTimeout(() => scrollToBottom('smooth'), 100);
  }, [isOtherTyping, scrollToBottom]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;
    
    const newFiles = [...selectedFiles, ...files];
    setSelectedFiles(newFiles);

    const newPreviewUrls = [...filePreviewUrls];
    for (const file of files) {
      // Create a local URL for all file types for instant preview
      try {
        const url = URL.createObjectURL(file);
        newPreviewUrls.push(url);
      } catch (err) {
        console.warn("Could not create local URL for file:", file.name, err);
        newPreviewUrls.push('');
      }
    }
    setFilePreviewUrls(newPreviewUrls);
    if (e.target) e.target.value = '';
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedFiles.length === 0) || !user || isSending) return;
    
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
        // Optimistic UI for text
        if (textToSend) {
          addOptimisticMessage({
            content: textToSend,
            type: 'text'
          });
          
          performSendMessage({
            text: textToSend,
            replyTo: filesToSend.length === 0 ? replyContext : null
          }).catch(err => {
            console.error("Error sending text:", err);
            // Optionally handle error by showing a "Retry" or "Failed" state
          });
        }
        
        // Optimistic UI for files
        for (let i = 0; i < filesToSend.length; i++) {
          const file = filesToSend[i];
          const localUrl = filePreviewUrls[i];
          const fileType = file.type.startsWith('image/') ? 'image' : 
                           file.type.startsWith('video/') ? 'video' : 
                           file.type.startsWith('audio/') ? 'audio' : 'file';

          addOptimisticMessage({
            content: '',
            media_url: localUrl,
            media_type: fileType,
            type: fileType
          });
          
          performSendMessage({
            text: '',
            file,
            localPreviewUrl: localUrl,
            replyTo: i === 0 && !textToSend ? replyContext : null
          }).catch(err => console.error("Error sending file:", err));
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
    
    try {
      if (window.navigator?.vibrate) window.navigator.vibrate(5);
    } catch (e) {
      // Ignore vibration errors
    }
  }, []);

  const startEdit = useCallback((msg: any) => {
    setEditingMessage(msg);
    setNewMessage(msg.content || msg.text || '');
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
    navigate('/chats');
  };

  const hideChat = async () => {
    if (!user) return;
    const isHidden = Array.isArray(currentUserData?.hiddenChats) && currentUserData.hiddenChats.includes(chatId);
    try {
      const newHidden = isHidden 
        ? currentUserData.hiddenChats.filter((id: string) => id !== chatId)
        : [...(currentUserData.hiddenChats || []), chatId];
        
      await (supabase as any).from('users').update({ hidden_chats: newHidden }).eq('id', user.id);
      if (!isHidden) navigate('/chats');
    } catch (error) {
      console.error("Error hideChat:", error);
    }
  };

  const archiveChat = async () => {
    if (!user) return;
    const isArchived = Array.isArray(currentUserData?.archivedChats) && currentUserData.archivedChats.includes(chatId);
    try {
      const newArchived = isArchived 
        ? currentUserData.archivedChats.filter((id: string) => id !== chatId)
        : [...(currentUserData.archivedChats || []), chatId];

      await (supabase as any).from('users').update({ archived_chats: newArchived }).eq('id', user.id);
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

      {!isAccepted ? (
        <div className="p-5 bg-[var(--bg-card)] border-t border-[var(--border-color)]/25 flex flex-col items-center text-center gap-3.5 shrink-0 z-40 select-none">
          <p className="text-xs text-[var(--text-secondary)] font-semibold leading-relaxed max-w-[280px]">
            The sender is not in your chat list. Do you want to accept this message request and start chatting?
          </p>
          <div className="flex gap-3.5 w-full max-w-[280px]">
            <button
              onClick={() => {
                declineChat(chatId);
                navigate(-1);
              }}
              className="flex-1 py-3 border border-red-500/20 text-red-500 font-black text-[11px] uppercase tracking-wider rounded-2xl hover:bg-red-500/[0.04] transition-all cursor-pointer active:scale-95"
            >
              Block & Delete
            </button>
            <button
              onClick={() => {
                acceptChat(chatId);
                setIsAccepted(true);
              }}
              className="flex-1 py-3 bg-indigo-650 text-white font-black text-[11px] uppercase tracking-wider rounded-2xl hover:bg-indigo-550 transition-all cursor-pointer active:scale-95 shadow-md"
            >
              Accept Chat
            </button>
          </div>
        </div>
      ) : (
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
      )}

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
