import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Archive, MessageCircle } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useConversations } from './hooks/useConversations';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function ArchivedChatScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { conversations, loading } = useConversations('Chats');

  // Filter only archived chats
  const archivedConversations = conversations.filter(c => 
    userData?.archivedChats?.includes(c.id)
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--header-bg)] z-50 shadow-sm border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-[var(--header-text)]" />
          </button>
          <h1 className="text-xl font-black text-[var(--header-text)] tracking-tight">
            Archived chats
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
          </div>
        ) : archivedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
            <div className="p-4 bg-[var(--bg-card)] rounded-full text-[var(--text-secondary)] shadow-sm">
              <Archive size={40} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No archived chats</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Archived chats will stay hidden until you unarchive them.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)] bg-[var(--bg-card)]">
            {archivedConversations.map((chat) => (
              <Link 
                to={`/chat/${chat.otherUserId}`} 
                key={chat.id} 
                className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
              >
                <div className="relative shrink-0">
                  <img 
                    src={chat.avatar} 
                    className="w-[52px] h-[52px] rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-[15px] truncate font-bold text-[var(--text-primary)]">
                      {chat.user}
                    </h3>
                    <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)]">
                      {chat.time}
                    </span>
                  </div>
                  <p className="text-xs truncate text-[var(--text-secondary)]">
                    {chat.lastMsg}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
