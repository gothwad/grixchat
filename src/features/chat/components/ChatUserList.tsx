import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Lock, Archive, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { motion } from 'motion/react';
import { aiService } from '../../../services/AIService';
import { useLayout } from '../../../contexts/LayoutContext';
import Avatar from '../../../components/common/Avatar';

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
  lastMsgStatus?: 'Sent' | 'Received';
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
          className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all cursor-pointer border-b border-[var(--border-color)]/10 last:border-0 group select-none"
        >
          {/* Symmetrical blue/light-border circular checkbox */}
          <div className="shrink-0 flex items-center justify-center">
            <div className={`w-[20px] h-[20px] rounded-full border-2 flex items-center justify-center transition-all ${
              isSelected 
                ? 'bg-[#0494f4] border-[#0494f4]' 
                : 'border-[var(--text-secondary)]/30 hover:border-[#0494f4]'
            }`}>
              {isSelected && (
                <Check className="text-white animate-scaleIn" size={11} strokeWidth={3} />
              )}
            </div>
          </div>

          <Avatar url={chat.avatar} type={chat.type} name={chat.user} isOnline={chat.isOnline} />
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
                {chat.user}
              </h3>
              <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)] opacity-60">
                {chat.time}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <p className="text-[13px] truncate text-[var(--text-secondary)] opacity-75 flex-1">
                {chat.lastMsg}
              </p>
              {!chat.unread && chat.lastMsgStatus && (
                chat.lastMsgStatus === 'Sent' ? (
                  <ArrowUpRight size={15} strokeWidth={2.8} className="text-[#0494f4] shrink-0 opacity-70" />
                ) : (
                  <ArrowDownLeft size={15} strokeWidth={2.8} className="text-emerald-500 shrink-0 opacity-70" />
                )
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <Link 
        to={`/chat/${chat.otherUserId}`} 
        key={chat.id} 
        className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 last:border-0 group"
      >
        <Avatar url={chat.avatar} type={chat.type} name={chat.user} isOnline={chat.isOnline} />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className={`text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors ${chat.unread ? 'font-bold' : ''}`}>
              {chat.user}
            </h3>
            <span className={`text-[10.5px] whitespace-nowrap ${chat.unread ? 'text-[var(--primary)] font-semibold' : 'text-[var(--text-secondary)] opacity-60'}`}>
              {chat.time}
            </span>
          </div>
          <div className="flex justify-between items-center gap-2">
            <p className={`text-[13px] truncate flex-1 leading-snug ${chat.unread ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)] opacity-75'}`}>
              {chat.lastMsg}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              {chat.unread ? (
                <div className="min-w-[18px] h-[18px] px-1.5 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-[9.5px] text-white font-extrabold leading-none">
                    {chat.unreadCount && chat.unreadCount > 4 ? '4+' : chat.unreadCount}
                  </span>
                </div>
              ) : (
                chat.lastMsgStatus && (
                  chat.lastMsgStatus === 'Sent' ? (
                    <ArrowUpRight size={15} strokeWidth={2.8} className="text-[#0494f4] shrink-0 opacity-70" />
                  ) : (
                    <ArrowDownLeft size={15} strokeWidth={2.8} className="text-emerald-500 shrink-0 opacity-70" />
                  )
                )
              )}
            </div>
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
        className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 last:border-0 group"
      >
        <Avatar url={user.photoURL} type="direct" name={user.fullName || user.username} isOnline={user.isOnline} />
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <div className="flex justify-between items-baseline mb-0.5">
            <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
              {user.fullName || user.username}
            </h3>
            <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)] uppercase font-semibold tracking-tight opacity-40">
              Suggested
            </span>
          </div>
          <div className="flex justify-between items-center">
            <p className="text-[13px] truncate text-[var(--text-secondary)] opacity-70 italic">
              Say hi 👋
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
          className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 group cursor-pointer"
        >
          <div className="relative shrink-0 z-10">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 dark:bg-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-[1.02] transition-transform border border-[var(--border-color)]/10">
              <Lock size={19} className="text-indigo-500 animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
                Hidden Chats
              </h3>
              <span className="text-[9.5px] whitespace-nowrap text-indigo-500 font-semibold tracking-tight bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Unlocked
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[12px] truncate text-[var(--text-secondary)] font-medium opacity-75">
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
            className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 group cursor-pointer"
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
                className="w-12 h-12 rounded-full object-cover shadow-sm group-hover:scale-[1.02] transition-transform border border-[var(--border-color)]/15"
                referrerPolicy="no-referrer"
                alt="Grix AI"
              />
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bg-card)] rounded-full shadow-sm"></div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center">
              <div className="flex justify-between items-baseline mb-0.5">
                <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
                  Grix AI
                </h3>
                <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)] opacity-60">
                  {lastAiTime}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[13px] truncate text-[var(--text-secondary)] font-medium opacity-75">
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
          className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 group cursor-pointer"
        >
          <div className="relative shrink-0 z-10">
            <div className="w-12 h-12 rounded-full bg-[#0494f4]/10 dark:bg-zinc-800 flex items-center justify-center text-[var(--primary)] group-hover:scale-[1.02] transition-transform border border-[var(--border-color)]/15">
              <Archive size={19} className="text-[var(--primary)]" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
                Archived Chats
              </h3>
              <span className="text-[10px] whitespace-nowrap text-[#0494f4] font-semibold tracking-tight bg-[#0494f4]/10 px-2 py-0.5 rounded-full">
                {archivedCount > 0 ? archivedCount : 'View'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[12px] truncate text-[var(--text-secondary)] font-medium opacity-75">
                Saved and hidden from main mailbox
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Chats Pinned Shortcut */}
      {showGrixAI && showHiddenChatsEntry && !showSecretHeader && (
        <div 
          onClick={() => navigate('/chats/hidden')}
          className="flex items-center gap-3.5 px-4 py-2.5 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-all border-b border-[var(--border-color)]/5 group cursor-pointer"
        >
          <div className="relative shrink-0 z-10">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 dark:bg-zinc-800 flex items-center justify-center text-indigo-500 group-hover:scale-[1.02] transition-transform border border-[var(--border-color)]/15">
              <Lock size={19} className="text-indigo-500" />
            </div>
          </div>
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)]">
                Hidden Chats
              </h3>
              <span className="text-[10px] whitespace-nowrap text-indigo-500 font-semibold tracking-tight bg-indigo-500/10 px-2 py-0.5 rounded-full">
                Secret
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[12px] truncate text-[var(--text-secondary)] font-medium opacity-75">
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
