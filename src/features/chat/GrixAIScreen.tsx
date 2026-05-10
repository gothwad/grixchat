import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Sparkles, Zap, Cpu, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService, AIMessage, AIModelType } from '../../services/AIService.ts';
import { useTheme } from '../../contexts/ThemeContext';
import { auth } from '../../services/firebase.ts';

import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import { MessageList } from './components/MessageList';

export default function GrixAIScreen() {
  const navigate = useNavigate();
  const { chatBackground } = useTheme();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModelType>(aiService.getCurrentModel());
  const [isSending, setIsSending] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setMessages(aiService.getMessages());
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom('auto');
  }, [messages, isTyping, scrollToBottom]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    const textToSend = newMessage;
    setNewMessage('');
    setIsSending(true);

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      text: textToSend,
      senderId: 'user',
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    aiService.saveMessages(newMessages);
    
    setIsTyping(true);

    try {
      const responseText = await aiService.sendMessage(textToSend);
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        senderId: 'ai',
        timestamp: Date.now()
      };
      const finalMessages = [...newMessages, aiMsg];
      setMessages(finalMessages);
      aiService.saveMessages(finalMessages);
    } catch (error) {
      console.error(error);
    } finally {
      setIsTyping(false);
      setIsSending(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages with Grix AI?')) {
      aiService.clearMessages();
      setMessages(aiService.getMessages());
      setShowOptions(false);
    }
  };

  const toggleModel = (model: AIModelType) => {
    aiService.setModel(model);
    setCurrentModel(model);
    setShowOptions(false);
  };

  // Mock receiver for MessageList
  const aiReceiver = {
    uid: 'grix-ai',
    fullName: currentModel === 'grix-ai-pro' ? 'Grix AI Pro' : 'Grix AI',
    username: 'grixai',
    photoURL: '/assets/favicon.png',
    status: 'online'
  };

  // Transformed messages for MessageList
  const chatMessages = messages.map(m => ({
    id: m.id,
    text: m.text,
    senderId: m.senderId === 'user' ? (auth.currentUser?.uid || 'user') : 'grix-ai',
    timestamp: m.timestamp,
    type: 'text'
  }));

  return (
    <div className="flex flex-col h-full w-full max-w-full bg-[var(--bg-main)] overflow-hidden relative">
      <ChatHeader 
        receiver={aiReceiver}
        receiverId="grix-ai"
        formatLastSeen={() => "Always Online"}
        showOptions={showOptions}
        setShowOptions={setShowOptions}
        isMuted={false}
        setIsMuted={() => {}}
        deleteChat={clearChat}
        hideChat={() => {}}
        archiveChat={() => {}}
        isHidden={false}
        isArchived={false}
        optionsRef={optionsRef}
        isTyping={isTyping}
        receiverStatus="online"
        receiverActiveChatId={null}
        currentUserId={auth.currentUser?.uid}
        onWatchTogether={() => {}}
        type="direct"
        customMenu={
          <div className="py-1">
            <div className="px-4 py-2 border-b border-[var(--border-color)]/30 mb-1">
              <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Select AI Model</p>
            </div>
            <button 
              onClick={() => toggleModel('grix-ai')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${currentModel === 'grix-ai' ? 'text-primary bg-primary/5' : 'text-[var(--text-primary)] hover:bg-[var(--bg-card)]'}`}
            >
              <div className="flex items-center gap-3">
                <Zap size={18} />
                <span>Grix AI (Llama 3.1)</span>
              </div>
              {currentModel === 'grix-ai' && <div className="w-2 h-2 rounded-full bg-primary" />}
            </button>
            <button 
              onClick={() => toggleModel('grix-ai-pro')}
              className={`w-full flex items-center justify-between px-4 py-3 text-sm font-bold transition-colors ${currentModel === 'grix-ai-pro' ? 'text-indigo-500 bg-indigo-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--bg-card)]'}`}
            >
              <div className="flex items-center gap-3">
                <Cpu size={18} />
                <span>Grix AI Pro (Llama 3.3)</span>
              </div>
              {currentModel === 'grix-ai-pro' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
            </button>
            <div className="h-px bg-[var(--border-color)]/30 my-1" />
            <button 
              onClick={clearChat}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-rose-500 hover:bg-rose-500/5 transition-colors"
            >
              <Trash2 size={18} />
              <span>Clear History</span>
            </button>
          </div>
        }
      />

      <MessageList 
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        handleScroll={() => {}}
        chatBackground={chatBackground}
        loadingMore={false}
        loading={false}
        messages={chatMessages}
        messageLimit={999}
        auth={auth}
        convType="direct"
        receiver={aiReceiver}
        activeMessageMenu={null}
        setActiveMessageMenu={() => {}}
        replyingTo={null}
        setReplyingTo={() => {}}
        visibleButtonsId={null}
        setVisibleButtonsId={() => {}}
        showReactionPicker={null}
        setShowReactionPicker={() => {}}
        receiverStatus="online"
        handleMessageTap={() => {}}
        performReactToMessage={() => {}}
        isOtherTyping={isTyping}
      />

      <ChatBottom 
        activeMessageMenu={null}
        setActiveMessageMenu={() => {}}
        setReplyingTo={() => {}}
        startEdit={() => {}}
        deleteMessage={() => {}}
        currentUserUid={auth.currentUser?.uid}
        setShowReactionPicker={() => {}}
        editingMessage={null}
        setEditingMessage={() => {}}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        replyingTo={null}
        receiver={aiReceiver}
        handleSendMessage={handleSendMessage}
        fileInputRef={null as any}
        imageInputRef={null as any}
        handleFileChange={() => {}}
        showPlusMenu={false}
        setShowPlusMenu={() => {}}
        plusMenuRef={null as any}
        chatId="grix-ai"
        filePreviewUrl={null}
        isUploading={false}
        uploadProgress={0}
        setSelectedFile={() => {}}
        setFilePreviewUrl={() => {}}
        textareaRef={textareaRef}
        handleTyping={() => {}}
        showEmojiPicker={false}
        setShowEmojiPicker={() => {}}
        emojiPickerRef={null as any}
        isSending={isSending}
        selectedFile={null}
        placeholder={`Ask ${currentModel === 'grix-ai-pro' ? 'Grix AI Pro' : 'Grix AI'}...`}
      />
    </div>
  );
}
