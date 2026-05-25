import React, { useState } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { Users, Plus, MessageCircle, Search, X, Radio } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { motion } from 'motion/react';
import { useConversations } from './hooks/useConversations.ts';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { ChatUserList } from './components/ChatUserList.tsx';

export default function GroupsTab() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { searchTerm, setSearchTerm } = useSearch();
  const { activeFilters } = useLayout();
  const activeFilter = activeFilters['chats'] || 'Chats';
  
  const { conversations, loading } = useConversations(activeFilter);
  const [subTab, setSubTab] = useState<'groups' | 'channels'>('groups');

  // Filter conversations: Keep only those that match selected sub-tab and search
  const filteredItems = conversations.filter(c => {
    if (c.type !== 'group') return false;
    
    const isHidden = Array.isArray(userData?.hiddenChats) && userData.hiddenChats.includes(c.id);
    const isArchived = Array.isArray(userData?.archivedChats) && userData.archivedChats.includes(c.id);
    
    if (isHidden || isArchived) return false;

    // Smart categorization: If name has 'channel' or 'broadcast', sort as channel, else group
    const isChannel = (c.user || '').toLowerCase().includes('channel') || 
                      (c.user || '').toLowerCase().includes('broadcast');
                      
    if (subTab === 'groups' && isChannel) return false;
    if (subTab === 'channels' && !isChannel) return false;

    const matchesSearch = (c.user || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (c.username || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
        
        {/* Toggle Selector Segment ABOVE Search Bar */}
        <div className="px-4 pt-3 pb-1.5 shrink-0">
          <div className="flex bg-[var(--bg-main)] rounded-xl p-1 border border-[var(--border-color)]/25">
            <button
              onClick={() => {
                setSubTab('groups');
                setSearchTerm('');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                subTab === 'groups'
                  ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Groups
            </button>
            <button
              onClick={() => {
                setSubTab('channels');
                setSearchTerm('');
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                subTab === 'channels'
                  ? 'bg-[var(--bg-card)] text-[var(--primary)] shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Channels
            </button>
          </div>
        </div>

        {/* WhatsApp-style Scrollable Search Bar */}
        <div className="px-4 py-1.5">
          <div className="flex items-center bg-[var(--bg-main)] rounded-xl px-3.5 h-10 border border-[var(--border-color)]/25 transition-all">
            <Search size={15} className="text-[var(--text-secondary)] mr-2.5 opacity-60 shrink-0" />
            <input 
              type="text" 
              placeholder={subTab === 'groups' ? "Search groups..." : "Search channels..."} 
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

        <div className="flex flex-col h-full mt-1.5">
          {/* Top Option: Create New Group / Channel */}
          <Link 
            to="/new-group"
            className="flex items-center gap-[15px] px-4 py-3.5 hover:bg-[var(--bg-main)] transition-all active:scale-[0.98] border-b border-[var(--border-color)]/30 group cursor-pointer shrink-0"
          >
            <div className={`w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform ${
              subTab === 'groups' 
                ? 'bg-blue-500/10 text-blue-500' 
                : 'bg-purple-500/10 text-purple-500'
            }`}>
              {subTab === 'groups' ? <Users size={24} /> : <Radio size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-[15px] font-bold transition-colors ${
                subTab === 'groups' 
                  ? 'text-[var(--text-primary)] group-hover:text-blue-500' 
                  : 'text-[var(--text-primary)] group-hover:text-purple-500'
              }`}>
                {subTab === 'groups' ? 'New Group' : 'New Broadcast Channel'}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] truncate">
                {subTab === 'groups' 
                  ? 'Start a conversation with multiple followers' 
                  : 'Broadcast updates to unlimited subscribers instantly'
                }
              </p>
            </div>
            <div className={`mr-2 ${subTab === 'groups' ? 'text-blue-500' : 'text-purple-500'}`}>
              <Plus size={20} />
            </div>
          </Link>

          {/* Group / Channel Chats List */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
              <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                {subTab === 'groups' ? 'Loading Groups...' : 'Loading Channels...'}
              </p>
            </div>
          ) : (
            <ChatUserList 
              conversations={filteredItems}
              otherUsers={[]} 
              showGrixAI={false} 
              showSecretHeader={false}
              emptyMessage={subTab === 'groups' ? "No groups yet" : "No channels yet"}
              emptySubMessage={
                subTab === 'groups' 
                  ? "Tap New Group above to create a group chat with your circle."
                  : "Tap New Broadcast Channel to start sharing updates with your followers."
              }
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
