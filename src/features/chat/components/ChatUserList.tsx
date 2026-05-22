import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Lock } from 'lucide-react';
import { motion } from 'motion/react';

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
  showSecretHeader?: boolean;
  onSecretHeaderClick?: () => void;
  secretCount?: number;
  emptyMessage?: string;
  emptySubMessage?: string;
  loading?: boolean;
}

export const ChatUserList: React.FC<ChatUserListProps> = ({
  conversations,
  otherUsers = [],
  showGrixAI = false,
  showSecretHeader = false,
  onSecretHeaderClick,
  secretCount = 0,
  emptyMessage = "No messages yet",
  emptySubMessage = "Start a conversation with your friends.",
  loading = false
}) => {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Chats...</p>
      </div>
    );
  }

  const renderChatItem = (chat: ChatItem) => (
    <Link 
      to={`/chat/${chat.otherUserId}`} 
      key={chat.id} 
      className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
    >
      <div className="relative shrink-0">
        <img 
          src={chat.avatar || `https://cdn-icons-png.flaticon.com/512/149/149071.png`} 
          className="w-[52px] h-[52px] object-cover shadow-sm group-hover:scale-105 transition-transform rounded-full border border-[var(--border-color)]/30"
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

  const renderOtherUser = (user: OtherUser) => (
    <Link 
      to={`/chat/${user.uid}`} 
      key={user.uid} 
      className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
    >
      <div className="relative shrink-0">
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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)]">
      {/* Secret Code Header */}
      {showSecretHeader && (
        <div 
          onClick={onSecretHeaderClick}
          className="flex items-center gap-[15px] px-4 py-4 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-all cursor-pointer border-b border-[var(--primary)]/10"
        >
          <div className="w-[52px] h-[52px] rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] shrink-0 shadow-inner">
            <Lock size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[15px] font-black text-[var(--primary)] uppercase tracking-widest leading-none mb-1">
              Hidden chats
            </h3>
            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tight">
              {secretCount} locked conversations
            </p>
          </div>
        </div>
      )}

      {/* Grix AI */}
      {showGrixAI && (
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
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-xs truncate text-[var(--text-secondary)] font-medium">
                Ask me anything! I'm here to help.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Conversations List */}
      {conversations.length > 0 ? (
        <div className="flex flex-col">
          {conversations.map(renderChatItem)}
        </div>
      ) : !showGrixAI && otherUsers.length === 0 && (
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
            onClick={() => navigate('/search-user')}
            className="mt-2 bg-[var(--primary)] text-white px-8 py-3 rounded-xl text-xs font-bold shadow-lg shadow-[var(--primary-shadow)]/30 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            Find Friends
          </button>
        </div>
      )}

      {/* Other Users / Suggested */}
      {otherUsers.length > 0 && (
        <div className="flex flex-col mt-4">
          <div className="px-4 py-2 border-y border-[var(--border-color)]/10 bg-[var(--bg-main)]/50">
            <h4 className="text-[10px] font-black text-[var(--text-secondary)]/50 uppercase tracking-[0.2em]">
              Others you may know
            </h4>
          </div>
          {otherUsers.map(renderOtherUser)}
        </div>
      )}
    </div>
  );
};
