import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '../../providers/AuthProvider';
import { useConversations } from './hooks/useConversations';
import { ChatUserList } from './components/ChatUserList';
import { getAcceptedChats } from '../../utils/acceptedChats';

export default function MessageRequestsScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { conversations, loading } = useConversations('Chats');

  // Filter only message requests (direct conversations not in accepted list)
  const requestConversations = conversations.filter(c => 
    c.type === 'direct' && !getAcceptedChats().includes(c.id)
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--header-bg)] z-50 shadow-sm border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
            <ArrowLeft size={22} className="text-[var(--header-text)]" />
          </button>
          <h1 className="text-xl font-black text-[var(--header-text)] tracking-tight">
            Message Requests
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        <ChatUserList 
          conversations={requestConversations}
          loading={loading}
          emptyMessage="No message requests"
          emptySubMessage="You haven't received any new chat requests from anyone yet."
        />
      </div>
    </div>
  );
}
