import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Sparkles, Zap, Cpu, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService, AIMessage, AIModelType } from '../../services/AIService.ts';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../providers/AuthProvider.tsx';

import ChatHeader from '../../components/layout/ChatHeader.tsx';
import ChatBottom from '../../components/layout/ChatBottom.tsx';
import { MessageList } from './components/MessageList';
import { ChatOptionsSheet } from './components/ChatOptionsSheet';

export default function GrixAIScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { chatBackground } = useTheme();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [currentModel, setCurrentModel] = useState<AIModelType>(aiService.getCurrentModel());
  const [isSending, setIsSending] = useState(false);
  const [activeMessageMenu, setActiveMessageMenu] = useState<any | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<any | null>(null);
  const [replyingTo, setReplyingTo] = useState<any>(null);
  const [editingMessage, setEditingMessage] = useState<any | null>(null);

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
    senderId: m.senderId === 'user' ? (user?.id || 'user') : 'grix-ai',
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
        currentUserId={user?.id}
        onWatchTogether={() => {}}
        type="direct"
      />

      <ChatOptionsSheet
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
        receiver={aiReceiver}
        receiverId="grix-ai"
        isArchived={false}
        isHidden={false}
        isMuted={false}
        archiveChat={() => {}}
        hideChat={() => {}}
        setIsMuted={() => {}}
        deleteChat={clearChat}
        onWatchTogether={() => {}}
      >
        <div className="py-1">
          <div className="px-5 py-2 border-b border-[var(--border-color)]/30 mb-2">
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Select AI Model</p>
          </div>
          <button 
            onClick={() => toggleModel('grix-ai')}
            className={`w-full flex items-center justify-between px-5 py-4 text-sm font-bold transition-colors ${currentModel === 'grix-ai' ? 'text-[var(--primary)] bg-[var(--primary)]/5' : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${currentModel === 'grix-ai' ? 'bg-[var(--primary)]/10' : 'bg-[var(--bg-main)]'}`}>
                <Zap size={20} className={currentModel === 'grix-ai' ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'} />
              </div>
              <span>Grix AI (Llama 3.1)</span>
            </div>
            {currentModel === 'grix-ai' && <div className="w-2 h-2 rounded-full bg-[var(--primary)]" />}
          </button>
          <button 
            onClick={() => toggleModel('grix-ai-pro')}
            className={`w-full flex items-center justify-between px-5 py-4 text-sm font-bold transition-colors ${currentModel === 'grix-ai-pro' ? 'text-indigo-500 bg-indigo-500/5' : 'text-[var(--text-primary)] hover:bg-[var(--bg-main)]'}`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center ${currentModel === 'grix-ai-pro' ? 'bg-indigo-500/10' : 'bg-[var(--bg-main)]'}`}>
                <Cpu size={20} className={currentModel === 'grix-ai-pro' ? 'text-indigo-500' : 'text-[var(--text-secondary)]'} />
              </div>
              <span>Grix AI Pro (Llama 3.3)</span>
            </div>
            {currentModel === 'grix-ai-pro' && <div className="w-2 h-2 rounded-full bg-indigo-500" />}
          </button>
          
          <div className="h-px bg-[var(--border-color)]/20 mx-5 my-2" />
          
          <button 
            onClick={clearChat}
            className="w-full flex items-center gap-4 px-5 py-4 text-sm font-bold text-rose-500 hover:bg-rose-500/5 transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-rose-500/10 flex items-center justify-center">
              <Trash2 size={20} />
            </div>
            <span>Clear History</span>
          </button>
        </div>
      </ChatOptionsSheet>

      <MessageList 
        scrollContainerRef={scrollContainerRef}
        messagesEndRef={messagesEndRef}
        handleScroll={() => {}}
        chatBackground={chatBackground}
        loadingMore={false}
        loading={false}
        messages={chatMessages}
        messageLimit={999}
        convType="direct"
        receiver={aiReceiver}
        activeMessageMenu={activeMessageMenu}
        setActiveMessageMenu={setActiveMessageMenu}
        replyingTo={replyingTo}
        setReplyingTo={setReplyingTo}
        showReactionPicker={showReactionPicker}
        setShowReactionPicker={setShowReactionPicker}
        receiverStatus="online"
        handleMessageTap={(e, msg) => {
          e.stopPropagation();
          setActiveMessageMenu(activeMessageMenu?.id === msg.id ? null : msg);
        }}
        performReactToMessage={() => {}}
        isOtherTyping={isTyping}
      />

      <ChatBottom 
        activeMessageMenu={activeMessageMenu}
        setActiveMessageMenu={setActiveMessageMenu}
        setReplyingTo={setReplyingTo}
        startEdit={() => {}}
        deleteMessage={() => {}}
        currentUserUid={user?.id}
        setShowReactionPicker={setShowReactionPicker}
        editingMessage={null}
        setEditingMessage={() => {}}
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        replyingTo={replyingTo}
        receiver={aiReceiver}
        handleSendMessage={handleSendMessage}
        fileInputRef={{ current: null } as any}
        imageInputRef={{ current: null } as any}
        handleFileChange={() => {}}
        showPlusMenu={false}
        setShowPlusMenu={() => {}}
        plusMenuRef={{ current: null } as any}
        chatId="grix-ai"
        filePreviewUrls={[]}
        isUploading={false}
        uploadProgress={0}
        setSelectedFiles={() => {}}
        setFilePreviewUrls={() => {}}
        textareaRef={textareaRef}
        handleTyping={() => {}}
        showEmojiPicker={false}
        setShowEmojiPicker={() => {}}
        emojiPickerRef={{ current: null } as any}
        isSending={isSending}
        selectedFiles={[]}
        placeholder={`Ask ${currentModel === 'grix-ai-pro' ? 'Grix AI Pro' : 'Grix AI'}...`}
      />
    </div>
  );
}
