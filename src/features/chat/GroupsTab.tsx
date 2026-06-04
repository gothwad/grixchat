import React, { useState } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { useNavigate, Link } from 'react-router-dom';
import { Users, Plus, Search, X, Loader2, ArrowRight } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { motion } from 'motion/react';
import { useConversations } from './hooks/useConversations.ts';
import { ChatUserList } from './components/ChatUserList.tsx';

export default function GroupsTab() {
  const navigate = useNavigate();
  const { searchTerm, setSearchTerm } = useSearch();
  const { isChatSelectMode } = useLayout();
  
  // Load conversation lists
  const { conversations, loading } = useConversations('Chats');

  // Filter conversations for both Group Chats and Channels (all conversations of type 'group')
  const filteredGroups = conversations.filter(c => {
    if (c.type !== 'group') return false;

    if (!searchTerm) return true;
    return (c.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
           (c.username || "").toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        {/* Quick Create Group Action Card */}
        <div className="px-4 pt-4 pb-2">
          <div 
            onClick={() => navigate('/new-group?type=group')}
            className="flex items-center justify-between p-3.5 bg-[#0494f4]/5 border border-[#0494f4]/20 rounded-2xl cursor-pointer hover:bg-[#0494f4]/10 transition-all group shadow-sm select-none"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0494f4]/10 text-[#0494f4] flex items-center justify-center shadow-inner">
                <Users size={18} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-xs font-black text-[var(--text-primary)]">Coordinate Group</h4>
                <p className="text-[10px] text-[var(--text-secondary)]">Create a secure chat room with multiple friends</p>
              </div>
            </div>
            <span className="w-7 h-7 rounded-lg bg-[#0494f4]/15 text-[#0494f4] flex items-center justify-center group-hover:translate-x-1 duration-200">
              <Plus size={14} strokeWidth={3} />
            </span>
          </div>
        </div>

        {/* WhatsApp-style Search Bar */}
        <div className="px-4 py-2">
          <div className="flex items-center bg-[var(--bg-main)] rounded-2xl px-4 h-11 border border-[var(--border-color)]/25 transition-all focus-within:border-[#0494f4]/40">
            <Search size={15} className="text-[var(--text-secondary)] mr-2.5 opacity-60 shrink-0" />
            <input 
              type="text" 
              placeholder="Search active groups or channels..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-xs font-bold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/45"
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

        {/* Groups & Channels List */}
        <div className="flex flex-col h-full mt-1">
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
          )}
        </div>
      </div>
    </div>
  );
}
