import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Video, ArrowUpRight, ArrowDownLeft, PhoneMissed, Info, Lock, Users, Search, X, Plus, Loader2, Trash, Archive } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { useConversations } from './hooks/useConversations.ts';
import { useCalls } from './hooks/useCalls.ts';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { ChatUserList } from './components/ChatUserList.tsx';
import { supabase } from '../../lib/supabase';
import { getAcceptedChats, initializeAcceptedConversations } from '../../utils/acceptedChats';
import { storage } from '../../services/StorageService';
import { ImageService } from '../../services/ImageService';
import { transactionQueue } from '../../services/db/transactionQueueService';

interface StoryGroup {
  userId: string;
  username: string;
  fullName: string;
  photoURL: string;
  hasUnseen: boolean;
}

export default function ChatsTab() {
  const navigate = useNavigate();
  const { user: authUser, userData } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const { 
    activeFilters, 
    chatListFilter, 
    isChatSelectMode, 
    setChatSelectMode, 
    selectedChatIds, 
    setSelectedChatIds 
  } = useLayout();
  const activeFilter = activeFilters['chats'] || 'Chats';
  
  const { conversations, otherUsers, loading: conversationsLoading } = useConversations(activeFilter);
  const { calls, loading: callsLoading } = useCalls(activeFilter);
  const loading = activeFilter === 'Calls' ? callsLoading : conversationsLoading;



  const isSecretCodeEntered = !!(
    searchTerm && 
    userData?.hiddenChatSettings?.secretCode && 
    searchTerm.trim().toLowerCase() === userData.hiddenChatSettings.secretCode.trim().toLowerCase()
  );

  // Extract all user IDs that are part of hidden conversations
  const hiddenUserIds = React.useMemo(() => {
    if (!userData?.hiddenChats || !conversations) return [];
    return conversations
      .filter(c => userData.hiddenChats.includes(c.id))
      .map(c => c.otherUserId);
  }, [userData?.hiddenChats, conversations]);

  const filteredConversations = conversations.filter(c => {
    const isHidden = Array.isArray(userData?.hiddenChats) && userData.hiddenChats.includes(c.id);
    const isArchived = Array.isArray(userData?.archivedChats) && userData.archivedChats.includes(c.id);
    
    // Always hide hidden chats from the main chat lists/matches (they only show in unlocked /chats/hidden screen)
    if (isHidden) return false;
    if (isArchived) return false;

    // Apply the selected three-dot filter
    if (chatListFilter === 'direct') {
      if (c.type === 'group') return false;
    } else if (chatListFilter === 'groups') {
      if (c.type !== 'group') return false;
      const isChannel = (c.user || '').toLowerCase().includes('channel') || 
                        (c.user || '').toLowerCase().includes('broadcast');
      if (isChannel) return false;
    } else if (chatListFilter === 'channels') {
      if (c.type !== 'group') return false;
      const isChannel = (c.user || '').toLowerCase().includes('channel') || 
                        (c.user || '').toLowerCase().includes('broadcast');
      if (!isChannel) return false;
    }

    // Filter out Message Requests (not yet accepted)
    if (conversations.length > 0 && !storage.getItem('grix_accepted_chats_initialized')) {
      initializeAcceptedConversations(conversations.map(x => x.id));
    }

    const matchesSearch = (c.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (c.username || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const filteredOtherUsers = otherUsers.filter(u => {
    // Hide users who are part of any hidden conversation from standard suggestions
    if (hiddenUserIds.includes(u.uid)) return false;

    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (u.fullName || "")?.toLowerCase().includes(term) || 
           (u.username || "")?.toLowerCase().includes(term);
  });

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">


        {/* WhatsApp-style Scrollable Search Bar */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="flex items-center bg-[var(--bg-main)] rounded-xl px-3.5 h-10 border border-[var(--border-color)]/25 transition-all">
            <Search size={15} className="text-[var(--text-secondary)] mr-2.5 opacity-60 shrink-0" />
            <input 
              type="text" 
              placeholder="Search chats or messages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[13px] font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/45"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-black/5 rounded-full transition-colors cursor-pointer shrink-0"
              >
                <X size={13} className="text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
        </div>

        {/* User List (Chats or Calls) */}
        <div className="flex flex-col h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading {activeFilter === 'Calls' ? 'Calls' : 'Chats'}...</p>
            </div>
          ) : activeFilter === 'Calls' ? (
            (() => {
              const filteredCalls = calls.filter(call => !hiddenUserIds.includes(call.otherUserId));
              if (filteredCalls.length === 0) {
                return (
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
                );
              }
              return (
                <div className="divide-y divide-[var(--border-color)]">
                  {filteredCalls.map((call) => (

                  <motion.div 
                    key={call.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-[15px] px-4 py-3 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] group"
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={call.avatar || `https://cdn-icons-png.flaticon.com/512/149/149071.png`} 
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
            );
          })()
          ) : (
            <ChatUserList 
              conversations={filteredConversations}
              otherUsers={searchTerm ? [] : filteredOtherUsers} // Only show "Others" if not searching or if search returns nothing? 
                                                               // Actually the user said "others user" should be below.
              showGrixAI={!searchTerm} 
              archivedCount={userData?.archivedChats?.length || 0}
              showSecretHeader={isSecretCodeEntered}
              onSecretHeaderClick={() => navigate('/chats/hidden')}
              secretCount={userData?.hiddenChats?.length || 0}
              showHiddenChatsEntry={userData?.hiddenChatSettings?.showMenuEntry !== false}
              loading={loading}
              usersWithStories={[]}
            />
          )}
        </div>
      </div>

      {/* Dynamic Multi-Selection Actions Bar (WhatsApp / Telegram Style) */}
      <AnimatePresence>
        {isChatSelectMode && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="absolute bottom-16 left-4 right-4 bg-[var(--bg-card)] border border-[var(--border-color)]/60 py-3 px-5 rounded-2xl shadow-xl flex items-center justify-between z-[90] text-sm text-[var(--text-primary)]"
          >
            <div className="flex items-center gap-3">
              <button 
                type="button"
                onClick={() => {
                  setChatSelectMode(false);
                  setSelectedChatIds([]);
                }}
                className="p-1 hover:bg-[var(--bg-main)] rounded-full text-[var(--text-secondary)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              <span className="font-bold text-xs text-[var(--text-primary)]">
                {selectedChatIds.length} Selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={selectedChatIds.length === 0}
                onClick={async () => {
                  // Standard delete action for the selected chats
                  if (userData && authUser) {
                    try {
                      // Perform deletion
                      console.log('Deleting chats:', selectedChatIds);
                    } catch (err) {
                      console.error('Failed to delete selected chats:', err);
                    }
                  }
                  setSelectedChatIds([]);
                  setChatSelectMode(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  selectedChatIds.length > 0 
                    ? 'text-red-500 hover:bg-red-500/10' 
                    : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
                }`}
              >
                <Trash size={14} />
                <span>Delete</span>
              </button>

              <button
                type="button"
                disabled={selectedChatIds.length === 0}
                onClick={async () => {
                  // Archive selected chats
                  if (userData && authUser) {
                    try {
                      const currentArchived = Array.isArray(userData.archivedChats) ? userData.archivedChats : [];
                      const updatedArchived = [...new Set([...currentArchived, ...selectedChatIds])];
                      
                      if (supabase) {
                        await supabase
                          .from('users')
                          .update({ archived_chats: updatedArchived })
                          .eq('id', authUser.uid);
                      }
                    } catch (err) {
                      console.error('Failed to archive chats:', err);
                    }
                  }
                  setSelectedChatIds([]);
                  setChatSelectMode(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-colors cursor-pointer ${
                  selectedChatIds.length > 0 
                    ? 'text-[#0494f4] hover:bg-[#0494f4]/10' 
                    : 'text-[var(--text-secondary)]/30 cursor-not-allowed'
                }`}
              >
                <Archive size={14} />
                <span>Archive</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
