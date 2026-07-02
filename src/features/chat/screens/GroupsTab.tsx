import React, { useCallback } from 'react';
import { useSearch } from '../../../contexts/SearchContext.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Plus, Loader2, ArrowRight } from 'lucide-react';
import { useLayout } from '../../../contexts/LayoutContext.tsx';
import { motion } from 'motion/react';
import { useConversations } from '../hooks/useConversations.ts';
import { ChatUserList } from '../components/ChatUserList.tsx';
import { CommonSearchBar } from '../../../components/common/CommonSearchBar';

export default function GroupsTab() {
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm } = useSearch();
  const { isChatSelectMode } = useLayout();
  
  // Load conversation lists
  const { 
    conversations, 
    loading, 
    loadingMore, 
    hasMore, 
    loadMore 
  } = useConversations('Chats');

  // Filter conversations for both Group Chats and Channels (all conversations of type 'group')
  const filteredGroups = conversations.filter(c => {
    if (c.type !== 'group') return false;

    if (!searchTerm) return true;
    return (c.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.username || "").toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const isScrollable = target.scrollHeight > target.clientHeight;
    const closeToBottom = target.scrollHeight - target.scrollTop - target.clientHeight <= 100;
    if (isScrollable && target.scrollTop > 5 && closeToBottom) {
      if (hasMore && !loadingMore) {
        loadMore();
      }
    }
  }, [hasMore, loadingMore, loadMore]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y">
      <div onScroll={handleScroll} className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        {/* Scrollable Search Bar */}
        <CommonSearchBar 
          placeholder="Search active groups or channels..."
          value={searchTerm}
          onChange={setSearchTerm}
          onClear={() => setSearchTerm('')}
        />

        {/* Groups & Channels List */}
        <div className="flex flex-col mt-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="animate-spin text-[#0494f4]" size={24} />
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Groups & Channels...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
              <div className="p-4 bg-[var(--bg-main)] rounded-2xl text-[var(--text-secondary)] shadow-sm border border-[var(--border-color)]/10">
                <Users size={36} className="opacity-80" />
              </div>
              <div className="max-w-xs">
                <h3 className="text-xs font-black text-[var(--text-primary)] mb-1 uppercase tracking-wider">No Groups or Channels Joined</h3>
                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                  Start or coordinate a new group or channel with your contact list to see active rooms here.
                </p>
                <button 
                  onClick={() => navigate('/new-group?type=group')}
                  className="mt-4 px-4 py-2 bg-[#0494f4]/10 hover:bg-[#0494f4]/20 text-[#0494f4] font-extrabold text-[10px] uppercase tracking-wider rounded-xl inline-flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <span>Build Group or Channel</span>
                  <ArrowRight size={10} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <ChatUserList 
                conversations={filteredGroups}
                otherUsers={[]}
                showGrixAI={false}
                archivedCount={0}
                showSecretHeader={false}
                emptyMessage="No active groups or channels"
                emptySubMessage="Coordinate a group chat or broadcast channel."
                loading={loading}
                usersWithStories={[]}
                showHiddenChatsEntry={false}
              />
              {loadingMore && (
                <div className="flex items-center justify-center py-4 gap-2 bg-[var(--bg-card)]">
                  <Loader2 size={16} className="text-[#0494f4] animate-spin" />
                  <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Loading more groups...</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
