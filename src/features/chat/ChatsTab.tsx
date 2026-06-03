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

  // Stories integration
  const [stories, setStories] = useState<any[]>([]);
  const [storiesLoading, setStoriesLoading] = useState(false);

  const fetchStories = useCallback(async () => {
    if (!supabase || !authUser?.id) return;
    setStoriesLoading(true);
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*, users:user_id(username, full_name, photo_url)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setStories(data);
      }
    } catch (err) {
      console.error('Error fetching stories for tab:', err);
    } finally {
      setStoriesLoading(false);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

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

  const storiesGroupedByUser = React.useMemo(() => {
    const groups: { [key: string]: { userId: string; username: string; fullName: string; photoURL: string; stories: any[] } } = {};
    
    stories.forEach((story: any) => {
      if (hiddenUserIds.includes(story.user_id)) return;

      const uid = story.user_id;
      const userObj = story.users;
      const username = userObj?.username || 'User';
      const fullName = userObj?.full_name || username;
      const photoURL = userObj?.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      
      if (!groups[uid]) {
        groups[uid] = {
          userId: uid,
          username,
          fullName,
          photoURL,
          stories: []
        };
      }
      groups[uid].stories.push(story);
    });

    return Object.values(groups);
  }, [stories, hiddenUserIds]);

  const myStoriesGroup = storiesGroupedByUser.find(g => g.userId === authUser?.id);
  const otherStoriesGroups = storiesGroupedByUser.filter(g => g.userId !== authUser?.id);

  const filteredConversations = conversations.filter(c => {
    const isHidden = Array.isArray(userData?.hiddenChats) && userData.hiddenChats.includes(c.id);
    const isArchived = Array.isArray(userData?.archivedChats) && userData.archivedChats.includes(c.id);
    
    // Always hide hidden chats from the main chat lists/matches (they only show in unlocked /chats/hidden screen)
    if (isHidden) return false;
    if (isArchived) return false;

    // Apply strict direct-only filter
    if (c.type === 'group') return false;

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

        {/* Horizontal Stories - Embedded within scrollable view */}
        {activeFilter === 'Chats' && (
          <div className="px-4 pt-1 pb-1 bg-[var(--bg-card)] border-b border-[var(--border-color)]/10 z-10 shrink-0">
            <div className="flex items-center gap-3.5 overflow-x-auto no-scrollbar py-1">
              
              {/* My Story Item */}
              <div className="flex flex-col items-center shrink-0">
                <div className="relative">
                  <div 
                    onClick={() => {
                      if (myStoriesGroup) {
                        navigate(`/stories/view/${authUser?.id}`);
                      } else {
                        navigate('/stories/create');
                      }
                    }}
                    className={`w-14 h-14 rounded-full p-[2.5px] transition-all cursor-pointer active:scale-95 ${
                      myStoriesGroup 
                        ? 'border-2 border-[#0494f4]' 
                        : 'border border-[var(--border-color)]/30'
                    } bg-[var(--bg-card)] flex items-center justify-center`}
                  >
                    <img 
                      src={userData?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      alt="My Profile" 
                      className="w-full h-full rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <button 
                    onClick={() => navigate('/stories/create')}
                    className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#0494f4] text-white rounded-full flex items-center justify-center shadow-md hover:bg-[#037cc9] active:scale-90 transition-all cursor-pointer border-2 border-[var(--bg-card)]"
                  >
                    <Plus size={11} strokeWidth={3} />
                  </button>
                </div>
                <span className="text-[10px] font-extrabold text-[var(--text-secondary)] mt-1.5 max-w-[65px] truncate">
                  {myStoriesGroup ? 'My Story' : 'New Story'}
                </span>
              </div>

              {/* Friends' Stories */}
              {otherStoriesGroups.map(group => (
                <div 
                  key={group.userId} 
                  onClick={() => navigate(`/stories/view/${group.userId}`)}
                  className="flex flex-col items-center shrink-0 cursor-pointer group active:scale-95 transition-all"
                >
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full p-[2.5px] border-2 border-[#0494f4] bg-[var(--bg-card)] flex items-center justify-center shadow-sm">
                      <img 
                        src={group.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                        alt={group.username} 
                        className="w-full h-full rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold text-[var(--text-primary)] mt-1.5 max-w-[65px] truncate group-hover:text-[#0494f4] transition-colors">
                    {group.fullName || group.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Highly Visible and Aesthetically Premium Search Bar */}
        <div className="px-4 pt-2 pb-1.5">
          <div className="flex items-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/90 focus-within:bg-[var(--bg-main)] rounded-xl px-3.5 h-10 border border-[var(--border-color)]/45 focus-within:border-[#0494f4]/80 focus-within:ring-2 focus-within:ring-[#0494f4]/15 shadow-sm transition-all duration-200">
            <Search size={15} className="text-[var(--text-secondary)] mr-2.5 opacity-75 shrink-0 transition-opacity focus-within:text-[#0494f4]" />
            <input 
              type="text" 
              placeholder="Search chats or messages..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[13px] font-extrabold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 shrink-0"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
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
