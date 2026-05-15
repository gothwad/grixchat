import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, EyeOff, MessageCircle, Lock, Settings } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useConversations } from './hooks/useConversations';
import { ChatUserList } from './components/ChatUserList';

export default function HideChatScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { conversations, loading } = useConversations('Chats');

  // Filter only hidden chats
  const hiddenConversations = conversations.filter(c => 
    userData?.hiddenChats?.includes(c.id)
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--header-bg)] z-50 shadow-sm border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-[var(--header-text)]" />
          </button>
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-[var(--header-text)] opacity-60" />
            <h1 className="text-xl font-black text-[var(--header-text)] tracking-tight">
              Hidden chats
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button 
            onClick={() => {/* Lock logic */}}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Lock size={20} className="text-[var(--header-text)]" />
          </button>
          <button 
            onClick={() => navigate('/chats/hidden/settings')}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Settings size={20} className="text-[var(--header-text)]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <ChatUserList 
          conversations={hiddenConversations}
          loading={loading}
          emptyMessage="No hidden chats"
          emptySubMessage="Secret conversations can be tucked away here for maximum privacy."
        />
      </div>
    </div>
  );
}
