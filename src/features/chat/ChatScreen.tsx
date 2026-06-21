import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { X, Forward, Trash, Palette, Check } from 'lucide-react';
import { ChatForwardOverlay } from '../../components/chat-ui/ChatForwardOverlay';
import { chatService } from './services/chatService';
import { LocalDataCache } from '../../services/LocalDataCache';

import { motion, AnimatePresence } from 'motion/react';
import { useChatMessages } from './hooks/useChatMessages';
import { useChatActions } from './hooks/useChatActions';
import { useTypingStatus } from './hooks/useTypingStatus';
import { useChatId } from './hooks/useChatId';
import { useChatSync } from './hooks/useChatSync';
import { useChatFormHandler } from './hooks/useChatFormHandler';
import { useChatScroll } from './hooks/useChatScroll';
import { formatLastSeen, toDate } from '../../utils/dateUtils.ts';
import { useTheme } from '../../contexts/ThemeContext';
import { storage } from '../../services/StorageService';

import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import { MessageList } from './components/MessageList';
import { ChatOptionsSheet } from './components/ChatOptionsSheet';

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

  const [showCustomizerModal, setShowCustomizerModal] = useState(false);

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
  const [forwardTargetMsg, setForwardTargetMsg] = useState<any>(null);
  const [selectedMsgIds, setSelectedMsgIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => prev === msg ? null : prev);
    }, 2200);
  };

  // Search and date selection filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Dynamic Telegram/WhatsApp message search filtering by keyword and native calendar date
  const filteredMessages = messages.filter(msg => {
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const text = (msg.content || msg.text || '').toLowerCase();
      if (!text.includes(q)) return false;
    }
    if (selectedDate !== '') {
      const msgDate = toDate(msg.created_at || msg.timestamp);
      if (!msgDate) return false;
      
      const year = msgDate.getFullYear();
      const month = String(msgDate.getMonth() + 1).padStart(2, '0');
      const day = String(msgDate.getDate()).padStart(2, '0');
      const msgDateStr = `${year}-${month}-${day}`;
      
      if (msgDateStr !== selectedDate) return false;
    }
    return true;
  });

  useEffect(() => {
    if (chatId) {
      const saved = LocalDataCache.get<any>(`gx_pinned_${chatId}`);
      setPinnedMsg(saved || null);
    } else {
      setPinnedMsg(null);
    }
    setSelectedMsgIds([]);
  }, [chatId]);

  // Lock browser window and body scroll to (0,0) when typing to keep ChatHeader pinned
  useEffect(() => {
    const lockScroll = () => {
      if (window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.body.scrollTop !== 0) {
        document.body.scrollTop = 0;
      }
    };

    window.addEventListener('scroll', lockScroll, { passive: true });
    
    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        setTimeout(lockScroll, 30);
        setTimeout(lockScroll, 100);
        setTimeout(lockScroll, 250);
      }
    };
    
    document.addEventListener('focusin', handleFocusIn);

    return () => {
      window.removeEventListener('scroll', lockScroll);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, []);

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

  const handleForwardComplete = async (selectedIds: string[]) => {
    if (!user || !forwardTargetMsg) return;

    for (const id of selectedIds) {
      let targetConversationId = id;
      const isConvo = id.length > 20;

      if (!isConvo) {
        try {
          const matchedId = await chatService.getOrCreateDirectConversation(user.id, id);
          if (matchedId) {
            targetConversationId = matchedId;
          } else {
            continue;
          }
        } catch (err) {
          console.error(err);
          continue;
        }
      }

      const rawOriginalText = forwardTargetMsg.content || forwardTargetMsg.text || '';
      
      let forwardPrefix = '\u200B[FWD]\u200B';
      let cleanContent = rawOriginalText;

      if (rawOriginalText.includes('\u200B[FWD_MANY]\u200B')) {
        forwardPrefix = '\u200B[FWD_MANY]\u200B';
        cleanContent = rawOriginalText.replace(/\u200B\[FWD_MANY\]\u200B/g, '');
      } else if (rawOriginalText.includes('\u200B[FWD]\u200B')) {
        forwardPrefix = '\u200B[FWD_MANY]\u200B';
        cleanContent = rawOriginalText.replace(/\u200B\[FWD\]\u200B/g, '');
      }

      const textToSend = forwardPrefix + cleanContent;

      let mediaData = undefined;
      const mediaUrl = forwardTargetMsg.media_url || forwardTargetMsg.imageUrl || forwardTargetMsg.fileUrl;
      const mediaType = forwardTargetMsg.media_type || forwardTargetMsg.type;

      if (mediaUrl) {
        mediaData = { url: mediaUrl, type: mediaType || 'image' };
      }

      try {
        await chatService.sendMessage(targetConversationId, user.id, textToSend, mediaData);
        const displayContent = forwardTargetMsg.text || (mediaData ? `Sent a ${mediaData.type}` : 'Sent a file');
        LocalDataCache.updateLastMessage(user.id, targetConversationId, displayContent);
      } catch (err) {
        console.error(err);
      }
    }
    setForwardTargetMsg(null);
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
      // Multiple scroll attempts to align with animate-in height transitions perfectly
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
    if (!user) return;
    const isHidden = currentUserData?.hiddenChats?.includes(chatId);
    const newHidden = isHidden ? currentUserData.hiddenChats.filter((id: any) => id !== chatId) : [...(currentUserData.hiddenChats || []), chatId];
    await supabase.from('users').update({ hidden_chats: newHidden }).eq('id', user.id);
    await refreshUserData();
    if (!isHidden) navigate('/chats');
  };

  const archiveChat = async () => {
    if (!user) return;
    const isArchived = currentUserData?.archivedChats?.includes(chatId);
    const newArchived = isArchived ? currentUserData.archivedChats.filter((id: any) => id !== chatId) : [...(currentUserData.archivedChats || []), chatId];
    await supabase.from('users').update({ archived_chats: newArchived }).eq('id', user.id);
    await refreshUserData();
    if (!isArchived) navigate('/chats');
  };

  const { chatBackground: globalChatBackground } = useTheme();
  const [customBg, setCustomBg] = useState<string | null>(null);

  useEffect(() => {
    if (!receiverId) return;
    const loadCustomBg = () => {
      setCustomBg(storage.getItem(`app-chat-background-${receiverId}`));
    };
    loadCustomBg();
    
    window.addEventListener(`chat-customization-changed-${receiverId}`, loadCustomBg);
    return () => {
      window.removeEventListener(`chat-customization-changed-${receiverId}`, loadCustomBg);
    };
  }, [receiverId]);

  const activeChatBackground = customBg || globalChatBackground;
  
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
      />

      {/* Telegram native Android Style Pinned Message Banner */}
      {pinnedMsg && (
        <div 
          onClick={() => {
            const element = document.getElementById(`msg-${pinnedMsg.id}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="shrink-0 h-11 bg-[#17212b] border-b border-zinc-800 flex items-center px-4 justify-between gap-3 cursor-pointer hover:bg-zinc-850/60 transition-colors z-[45]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-1 h-7 bg-[#5085b4] rounded" />
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-[#5288c1] uppercase tracking-wider leading-none">Pinned Message</span>
              <p className="text-xs text-zinc-300 truncate font-semibold leading-normal mt-0.5 max-w-xs sm:max-w-md">
                {pinnedMsg.content || pinnedMsg.text || 'Media attachment'}
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleUnpinClick();
            }}
            className="p-1 rounded-full text-zinc-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={14} />
          </button>
        </div>
      )}



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
      <AnimatePresence>
        {showCustomizerModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/75 backdrop-blur-[2px]">
            {/* Backdrop to cancel */}
            <div className="absolute inset-0" onClick={() => setShowCustomizerModal(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-[90%] max-w-[340px] bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.45)] p-5 z-[100001] flex flex-col gap-4 text-left select-none"
            >
              <div className="flex items-center gap-2 text-[#0494f4] font-black">
                <Palette size={20} className="stroke-[2.5]" />
                <h3 className="text-[16px] font-black text-[var(--text-primary)] leading-none">
                  Customize Chat Room
                </h3>
              </div>

              <p className="text-[12px] font-semibold text-[var(--text-secondary)] opacity-85 leading-normal -mt-1">
                Personalize background style and chat bubble gradients specifically for {receiver?.full_name || 'this friend'}.
              </p>

              {/* SECTION: BACKGROUND WALLPAPER */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-[10px] font-black uppercase text-[#0494f4] tracking-wider">Background Wallpaper</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '', label: 'Default Solid' },
                    { id: 'bg-gradient-to-br from-[#121214] via-[#1a1226] to-[#0d0912]', label: 'Cosmic Dusk', preview: 'bg-gradient-to-br from-[#121214] via-[#1a1226] to-[#0d0912]' },
                    { id: 'bg-gradient-to-br from-[#0c1612] via-[#092218] to-[#04100c]', label: 'Minty Herb', preview: 'bg-gradient-to-br from-[#0c1612] via-[#092218] to-[#04100c]' },
                    { id: 'bg-gradient-to-br from-[#091522] via-[#040e1a] to-[#02060c]', label: 'Deep Ocean', preview: 'bg-gradient-to-br from-[#091522] via-[#040e1a] to-[#02060c]' },
                    { id: 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0d0d0d]', label: 'Charcoal Night', preview: 'bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0d0d0d]' },
                  ].map((bgItem) => {
                    const isSelected = (customBg || '') === bgItem.id;
                    return (
                      <button
                        key={bgItem.label}
                        type="button"
                        onClick={() => {
                          if (bgItem.id === '') {
                            storage.removeItem(`app-chat-background-${receiverId}`);
                          } else {
                            storage.setItem(`app-chat-background-${receiverId}`, bgItem.id);
                          }
                          setCustomBg(bgItem.id || null);
                          window.dispatchEvent(new Event(`chat-customization-changed-${receiverId}`));
                        }}
                        className={`p-1.5 rounded-xl text-left border cursor-pointer select-none transition-all flex flex-col gap-1 w-full bg-transparent ${
                          isSelected ? 'border-[#0494f4] bg-[#0494f4]/5' : 'border-[var(--border-color)]/20 hover:bg-white/5'
                        }`}
                      >
                        <div className={`h-5 w-full rounded-md border border-white/5 ${bgItem.preview || 'bg-[var(--bg-main)]'}`} />
                        <span className={`text-[9.5px] font-bold leading-normal truncate ${isSelected ? 'text-[#0494f4]' : 'text-[var(--text-primary)]'}`}>
                          {bgItem.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* SECTION: BUBBLE GRADIENT */}
              <div className="flex flex-col gap-1.5 mt-0.5">
                <h4 className="text-[10px] font-black uppercase text-[#0494f4] tracking-wider">Self Bubble Gradient</h4>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: '', label: 'Default Glow', preview: 'bg-indigo-600' },
                    { id: 'ocean-indigo', label: 'Ocean Indigo', preview: 'bg-gradient-to-br from-teal-400 to-indigo-600' },
                    { id: 'forest-magic', label: 'Forest Magic', preview: 'bg-gradient-to-br from-emerald-400 to-teal-600' },
                    { id: 'crimson-fire', label: 'Crimson Fire', preview: 'bg-gradient-to-br from-rose-400 to-orange-600' },
                    { id: 'sunset-violet', label: 'Sunset Violet', preview: 'bg-gradient-to-br from-violet-600 to-purple-800' },
                  ].map((bubItem) => {
                    const localBub = storage.getItem(`app-chat-bubble-${receiverId}`) || '';
                    const isSelected = localBub === bubItem.id;
                    return (
                      <button
                        key={bubItem.label}
                        type="button"
                        onClick={() => {
                          if (bubItem.id === '') {
                            storage.removeItem(`app-chat-bubble-${receiverId}`);
                          } else {
                            storage.setItem(`app-chat-bubble-${receiverId}`, bubItem.id);
                          }
                          window.dispatchEvent(new Event(`chat-customization-changed-${receiverId}`));
                        }}
                        className={`p-1.5 rounded-xl text-left border cursor-pointer select-none transition-all flex flex-col gap-1 w-full bg-transparent ${
                          isSelected ? 'border-[#0494f4] bg-[#0494f4]/5' : 'border-[var(--border-color)]/20 hover:bg-white/5'
                        }`}
                      >
                        <div className={`h-5 w-full rounded-md border border-white/5 ${bubItem.preview}`} />
                        <span className={`text-[9.5px] font-bold leading-normal truncate ${isSelected ? 'text-[#0494f4]' : 'text-[var(--text-primary)]'}`}>
                          {bubItem.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowCustomizerModal(false)}
                className="w-full text-center py-2.5 text-[13px] font-black text-white bg-[#0494f4] hover:bg-[#0382d6] active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none shadow-sm mt-1"
              >
                Apply Customs
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* WhatsApp Full Screen Forward UI */}
      <ChatForwardOverlay 
        isOpen={!!forwardTargetMsg}
        onClose={() => setForwardTargetMsg(null)}
        messageToForward={forwardTargetMsg}
        currentUserId={user?.id || ''}
        onForwardComplete={handleForwardComplete}
      />

      {/* Toast Alert Indicator */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-zinc-900/95 dark:bg-zinc-800/95 text-white text-xs font-semibold px-4.5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/5 backdrop-blur-md"
          >
            <Check size={14} className="text-[var(--primary)]" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
