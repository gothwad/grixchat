import React from 'react';
import { auth } from '../../services/firebase.ts';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Video, ArrowUpRight, ArrowDownLeft, PhoneMissed, Info, Lock } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { motion } from 'motion/react';
import { useConversations } from './hooks/useConversations.ts';
import { useCalls } from './hooks/useCalls.ts';
import { useAuth } from '../../providers/AuthProvider.tsx';

export default function ChatsTab() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { searchTerm } = useSearch();
  const { activeFilters } = useLayout();
  const activeFilter = activeFilters['chats'] || 'Chats';
  
  const { conversations, loading: conversationsLoading } = useConversations(activeFilter);
  const { calls, loading: callsLoading } = useCalls(activeFilter);
  const loading = activeFilter === 'Calls' ? callsLoading : conversationsLoading;

  const isSecretCodeEntered = searchTerm && userData?.hiddenChatSettings?.secretCode && searchTerm === userData.hiddenChatSettings.secretCode;

  const filteredConversations = conversations.filter(c => {
    const isHidden = userData?.hiddenChats?.includes(c.id);
    const isArchived = userData?.archivedChats?.includes(c.id);
    
    // Only show hidden chats if the secret code is entered
    if (isHidden && !isSecretCodeEntered) return false;
    if (isArchived) return false;

    const matchesSearch = c.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.username.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* User List (Chats or Calls) */}
        <div className="flex flex-col h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading {activeFilter === 'Calls' ? 'Calls' : 'Chats'}...</p>
            </div>
          ) : activeFilter === 'Calls' ? (
            calls.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
                <div className="p-4 bg-[var(--bg-main)] rounded-full text-[var(--text-secondary)]">
                  <Phone size={40} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No calls yet</h3>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    Your recent calls will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {calls.map((call) => (
                  <motion.div 
                    key={call.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={call.avatar} 
                        alt={call.user} 
                        className="w-[52px] h-[52px] rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/50 pb-3 group-last:border-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className={`text-[15px] truncate font-bold ${call.isMissed ? 'text-rose-500' : 'text-[var(--text-primary)]'}`}>
                          {call.user}
                        </h3>
                        <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)]">
                          {call.time}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[var(--text-secondary)] text-[11px]">
                        {call.isMissed ? (
                          <PhoneMissed size={12} className="text-rose-500" />
                        ) : call.isIncoming ? (
                          <ArrowDownLeft size={12} className="text-emerald-500" />
                        ) : (
                          <ArrowUpRight size={12} className="text-[var(--primary)]" />
                        )}
                        <span>{call.isMissed ? 'Missed' : call.isIncoming ? 'Incoming' : 'Outgoing'}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[var(--primary)]">
                      <Link to={`/call/${call.otherUserId}?type=${call.type}`}>
                        {call.type === 'video' ? <Video size={20} /> : <Phone size={20} />}
                      </Link>
                      <button className="text-[var(--text-secondary)]">
                        <Info size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          ) : (
            <>
              {/* Secret Code Header - Shortcut to Hidden Chats */}
              {isSecretCodeEntered && (
                <div 
                  onClick={() => navigate('/chats/hidden')}
                  className="flex items-center gap-[15px] px-4 py-4 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition-all cursor-pointer border-b border-[var(--primary)]/10"
                >
                  <div className="w-[52px] h-[52px] rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] shrink-0">
                    <Lock size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] font-black text-[var(--primary)] uppercase tracking-widest">
                      Hidden chats
                    </h3>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-tight">
                      {userData?.hiddenChats?.length || 0} locked conversations
                    </p>
                  </div>
                </div>
              )}

              {/* Grix AI - Always at top */}
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
                    className="w-[52px] h-[52px] rounded-full object-cover shadow-sm group-hover:scale-105 transition-transform"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/50 pb-3">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className="text-[15px] truncate font-bold text-[var(--text-primary)]">
                    Grix AI
                    </h3>
                    <span className="text-[10px] whitespace-nowrap text-[var(--text-secondary)]">
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

              {filteredConversations.length > 0 ? (
                filteredConversations.map(chat => (
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
                      {chat.isOnline && (
                        <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-[var(--bg-card)] rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 border-b border-[var(--border-color)]/50 pb-3 group-last:border-0 relative">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h3 className={`text-[15px] truncate ${chat.unread ? 'font-black text-[var(--text-primary)]' : 'font-bold text-[var(--text-primary)]'}`}>
                          {chat.user}
                        </h3>
                        <span className={`text-[10px] whitespace-nowrap ${chat.unread ? 'text-[var(--primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {chat.time}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-xs truncate ${chat.unread ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-secondary)]'}`}>
                          {chat.lastMsg}
                        </p>
                        {chat.unread && (
                          <div className="min-w-[18px] h-[18px] px-1 bg-[var(--primary)] rounded-full flex items-center justify-center shadow-lg shadow-[var(--primary-shadow)] ml-2">
                            <span className="text-[10px] text-white font-bold">{chat.unreadCount}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
                  <div className="p-4 bg-[var(--bg-main)] rounded-full text-[var(--text-secondary)]">
                    <MessageCircle size={40} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">No messages yet</h3>
                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      Start a conversation with your friends in GrixChat.
                    </p>
                  </div>
                  <button 
                    onClick={() => navigate('/search-user')}
                    className="mt-2 bg-[var(--primary)] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-[var(--primary-shadow)] hover:opacity-90 transition-all"
                  >
                    Find Friends
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
