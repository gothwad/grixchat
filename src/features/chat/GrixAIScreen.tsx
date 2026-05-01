import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MoreVertical, Send, Plus, Smile, Paperclip, Mic, X, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { aiService, AIMessage } from '../../services/AIService.ts';
import { useTheme } from '../../contexts/ThemeContext';

export default function GrixAIScreen() {
  const navigate = useNavigate();
  const { chatBackground } = useTheme();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(aiService.getMessages());
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      text: inputText,
      senderId: 'user',
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    aiService.saveMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    try {
      const responseText = await aiService.sendMessage(inputText);
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
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear all messages with Grix AI?')) {
      aiService.clearMessages();
      setMessages(aiService.getMessages());
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Header */}
      <div className="h-14 bg-[var(--header-bg)] flex items-center px-4 gap-3 z-50 shrink-0 border-b border-[var(--border-color)] shadow-sm rounded-b-2xl">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <div className="relative">
            <img 
              src="/assets/favicon.png" 
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20"
              alt="AI"
            />
            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--header-bg)] rounded-full"></div>
          </div>
          <div>
            <h2 className="text-[15px] font-black text-[var(--header-text)] leading-tight">Grix AI</h2>
            <p className="text-[10px] text-[var(--header-text)]/70 font-bold uppercase tracking-wider">Always Online</p>
          </div>
        </div>
        <button onClick={clearChat} className="p-2 hover:bg-white/10 rounded-full transition-colors">
          <Trash2 size={20} className="text-[var(--header-text)]" />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className={`flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 ${chatBackground || 'bg-[var(--bg-chat)]'}`}
      >
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex ${msg.senderId === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${
              msg.senderId === 'user' 
                ? 'bg-[var(--primary)] text-white rounded-tr-none' 
                : 'bg-[var(--bg-card)] text-[var(--text-primary)] rounded-tl-none border border-[var(--border-color)]'
            }`}>
              {msg.text}
              <div className={`text-[9px] mt-1 text-right opacity-60 font-bold`}>
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-card)] text-[var(--text-primary)] px-4 py-2.5 rounded-2xl rounded-tl-none border border-[var(--border-color)] shadow-sm">
              <div className="flex gap-1">
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
                <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-[var(--text-secondary)] rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 bg-[var(--bg-main)] border-t border-[var(--border-color)] pb-safe">
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center bg-[var(--bg-card)] rounded-2xl px-3 py-1.5 border border-[var(--border-color)] shadow-sm">
            <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
              <Smile size={22} />
            </button>
            <input 
              type="text" 
              placeholder="Ask Grix AI..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 bg-transparent border-none outline-none px-2 py-1 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]"
            />
            <button className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors">
              <Paperclip size={20} />
            </button>
          </div>
          <button 
            onClick={handleSend}
            disabled={!inputText.trim()}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all shadow-lg ${
              inputText.trim() 
                ? 'bg-[var(--primary)] text-white shadow-[var(--primary-shadow)] scale-105 active:scale-95' 
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]'
            }`}
          >
            {inputText.trim() ? <Send size={20} /> : <Mic size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
}
