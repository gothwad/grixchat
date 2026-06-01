import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Lock, Archive } from 'lucide-react';
import { motion } from 'motion/react';
import { aiService } from '../../../services/AIService';
import { useLayout } from '../../../contexts/LayoutContext';

interface ChatItem {
  id: string;
  user: string;
  username: string;
  fullName: string;
  lastMsg: string;
  time: string;
  avatar: string;
  unread: boolean;
  unreadCount?: number;
  isOnline: boolean;
  otherUserId: string;
  type?: 'direct' | 'group';
}

interface OtherUser {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline: boolean;
}

interface ChatUserListProps {
  conversations: ChatItem[];
  otherUsers?: OtherUser[];
  showGrixAI?: boolean;
  archivedCount?: number;
  showSecretHeader?: boolean;
  onSecretHeaderClick?: () => void;
  secretCount?: number;
  emptyMessage?: string;
  emptySubMessage?: string;
  loading?: boolean;
  usersWithStories?: string[];
  showHiddenChatsEntry?: boolean;
}

export const ChatUserList: React.FC<ChatUserListProps> = ({
  conversations,
  otherUsers = [],
  showGrixAI = false,
  archivedCount = 0,
  showSecretHeader = false,
  onSecretHeaderClick,
  secretCount = 0,
  emptyMessage = "No messages yet",
  emptySubMessage = "Start a conversation with your friends.",
  loading = false,
  usersWithStories = [],
  showHiddenChatsEntry = true
}) => {
  const navigate = useNavigate();
  const { isChatSelectMode, selectedChatIds, setSelectedChatIds } = useLayout();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Chats...</p>
      </div>
    );
  }

  const handleToggleSelect = (chatId: string) => {
    setSelectedChatIds(prev => 
      prev.includes(chatId) 
        ? prev.filter(id => id !== chatId) 
        : [...prev, chatId]
    );
  };

  const renderChatItem = (chat: ChatItem) => {
    const isSelected = selectedChatIds.includes(chat.id);

    if (isChatSelectMode) {
      return (
        <div 
          key={chat.id} 
          onClick={() => handleToggleSelect(chat.id)}
          className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all cursor-pointer group select-none"
        >
          {/* Symmetrical blue/light-border circular checkbox */}
          <div className="shrink-0 flex items-center justify-center">
            <div className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-[#0494f4] border-[#0494f4] scale-110 shadow-sm' 
                : 'border-[var(--text-secondary)]/30 hover:border-[#0494f4]'
            }`}>
              {isSelected && (
                <div className="w-[8px] h-[8px] bg-white rounded-full" />
              )}
            </div>
          </div>

          <div className="relative shrink-0 select-none">
            <img 
              src={chat.avatar || `https://cdn-icons-png.flaticon.com/512/149/149071.png`} 
              className="w-[52px] h-[52px] object-cover rounded-full border border-[var(--border-color)]/30 shadow-sm transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
              alt={chat.user}
            />
            {chat.isOnline && (
              <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full shadow-sm"></div>
            )}
          </div>
          <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 group-last:border-0 relative">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[15px] truncate font-bold text-[var(--text-primary)]">
                {chat.user}
              </h3>
              <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)]">
                {chat.time}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs truncate font-medium text-[var(--text-secondary)]">
                {chat.lastMsg}
              </p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link 
        to={`/chat/${chat.otherUserId}`} 
        key={chat.id} 
        className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
      >
        <div className="relative shrink-0 select-none">
          <img 
            src={chat.avatar || `https://cdn-icons-png.flaticon.com/512/149/149071.png`} 
            className="w-[52px] h-[52px] object-cover rounded-full border border-[var(--border-color)]/30 shadow-sm group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
            alt={chat.user}
          />
          {chat.isOnline && (
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full shadow-sm"></div>
          )}
        </div>
        <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 group-last:border-0 relative">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className={`text-[15px] truncate font-bold text-[var(--text-primary)] ${chat.unread ? 'font-black' : ''}`}>
              {chat.user}
            </h3>
            <span className={`text-[10px] whitespace-nowrap ${chat.unread ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
              {chat.time}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <p className={`text-xs truncate font-medium ${chat.unread ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
              {chat.lastMsg}
            </p>
            {chat.unread && (
              <div className="min-w-[18px] h-[18px] px-1.5 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary-shadow)]/20 ml-2">
                <span className="text-[10.5px] text-white font-black leading-none">
                  {chat.unreadCount && chat.unreadCount > 4 ? '4+' : chat.unreadCount}
                </span>
              </div>
            )}
  
          </div>
        </div>
      </Link>
    );
  };

  const renderOtherUser = (user: OtherUser) => {
    return (
      <Link 
        to={`/chat/${user.uid}`} 
        key={user.uid} 
        className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
      >
        <div className="relative shrink-0 select-none">
          <img 
            src={user.photoURL || `https://cdn-icons-png.flaticon.com/512/149/149071.png`} 
            className="w-[52px] h-[52px] object-cover shadow-sm group-hover:scale-105 transition-transform rounded-full border border-[var(--border-color)]/30"
            referrerPolicy="no-referrer"
            alt={user.fullName || user.username}
          />
          {user.isOnline && (
            <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full shadow-sm"></div>
          )}
        </div>
        <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 group-last:border-0 relative">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="text-[15px] truncate font-bold text-[var(--text-primary)]">
              {user.fullName || user.username}
            </h3>
            <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)] uppercase font-bold tracking-tight opacity-40">
              Suggested
            </span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-xs truncate font-medium text-[var(--text-secondary)] italic">
              Say hi! 👋
            </p>
          </div>
        </div>
      </Link>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Secret Code Header */}
      {showSecretHeader && (
        <div 
          onClick={onSecretHeaderClick}
          className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer border-b border-[var(--border-color)]/30"
        >
          <div className="relative shrink-0 z-10 animate-pulse">
            <div className="w-[52px] h-[52px] rounded-full bg-indigo-500/10 dark:bg-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform border border-[var(--border-color)]/30">
              <Lock size={21} className="text-indigo-500 animate-bounce" />
            </div>
          </div>
          <div className="flex-1 min-w-0 relative">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                Hidden Chats
              </h3>
              <span className="text-[11px] whitespace-nowrap text-indigo-500 font-bold tracking-tight bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                {secretCount > 0 ? `${secretCount} hidden conversations available` : 'Private conversations space'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Grix AI */}
      {showGrixAI && (() => {
        const aiMessages = aiService.getMessages();
        const lastAiMsg = aiMessages[aiMessages.length - 1];
        const lastAiText = lastAiMsg ? lastAiMsg.text : "Ask me anything! I'm here to help.";
        
        let lastAiTime = "Online";
        if (lastAiMsg) {
          const msgDate = new Date(lastAiMsg.timestamp);
          const now = new Date();
          if (msgDate.toDateString() === now.toDateString()) {
            lastAiTime = msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          } else {
            lastAiTime = msgDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
          }
        }

        return (
          <div 
            onClick={() => navigate('/chat/grix-ai')}
            className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer"
          >
            <div 
              className="relative shrink-0 z-10"
              onClick={(e) => {
                e.stopPropagation();
                navigate('/profile/grix-ai');
              }}
            >
              <img 
                src="/assets/favicon.png" 
                className="w-[52px] h-[52px] rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform border border-[var(--border-color)]/30"
                referrerPolicy="no-referrer"
                alt="Grix AI"
              />
              <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 group-last:border-0 relative">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                  Grix AI
                </h3>
                <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)] font-bold">
                  {lastAiTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                  {lastAiText}
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Archived Chats Pinned Shortcut */}
      {showGrixAI && (
        <div 
          onClick={() => navigate('/chats/archived')}
          className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="relative shrink-0 z-10">
            <div className="w-[52px] h-[52px] rounded-full bg-[#0494f4]/10 dark:bg-zinc-800 flex items-center justify-center text-[var(--primary)] group-hover:scale-105 transition-transform border border-[var(--border-color)]/30">
              <Archive size={21} className="text-[var(--primary)]" />
            </div>
          </div>
          <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 relative">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                Archived Chats
              </h3>
              <span className="text-[11px] whitespace-nowrap text-[#0494f4] font-bold tracking-tight">
                View
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                Some of your conversion can be in archived
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Chats Pinned Shortcut */}
      {showGrixAI && showHiddenChatsEntry && !showSecretHeader && (
        <div 
          onClick={() => navigate('/chats/hidden')}
          className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group cursor-pointer"
        >
          <div className="relative shrink-0 z-10">
            <div className="w-[52px] h-[52px] rounded-full bg-indigo-500/10 dark:bg-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-105 transition-transform border border-[var(--border-color)]/30">
              <Lock size={21} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/30 pb-3 relative">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[15px] truncate font-black text-[var(--text-primary)]">
                Hidden Chats
              </h3>
              <span className="text-[11px] whitespace-nowrap text-indigo-500 font-bold tracking-tight">
                Secret
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                Private conversations protected with secret code
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length > 0 && (
        <div className="flex flex-col">
          {conversations.map(renderChatItem)}
        </div>
      )}

      {/* Empty State when no chats are loaded */}
      {conversations.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
          <div className="p-4 bg-[var(--bg-main)] rounded-xl text-[var(--text-secondary)] shadow-sm border border-[var(--border-color)]/10">
            <MessageCircle size={40} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">{emptyMessage}</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed opacity-70">
              {emptySubMessage}
            </p>
          </div>
          <button 
            onClick={() => navigate('/search')}
            className="mt-2 bg-[var(--primary)] text-white px-8 py-3 rounded-xl text-xs font-bold shadow-lg shadow-[var(--primary-shadow)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
          >
            Find Friends
          </button>
        </div>
      )}

    </div>
  );
};
