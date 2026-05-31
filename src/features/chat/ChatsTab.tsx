import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { Link, useNavigate } from 'react-router-dom';
import { MessageCircle, Phone, Video, ArrowUpRight, ArrowDownLeft, PhoneMissed, Info, Lock, Users, Search, X, Plus, Loader2 } from 'lucide-react';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import { motion } from 'motion/react';
import { useConversations } from './hooks/useConversations.ts';
import { useCalls } from './hooks/useCalls.ts';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { ChatUserList } from './components/ChatUserList.tsx';
import { supabase } from '../../lib/supabase';
import { getAcceptedChats, initializeAcceptedConversations } from '../../utils/acceptedChats';
import { storage } from '../../services/StorageService';
import { ImageService } from '../../services/ImageService';

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
  const { activeFilters } = useLayout();
  const activeFilter = activeFilters['chats'] || 'Chats';
  
  const { conversations, otherUsers, loading: conversationsLoading } = useConversations(activeFilter);
  const { calls, loading: callsLoading } = useCalls(activeFilter);
  const loading = activeFilter === 'Calls' ? callsLoading : conversationsLoading;

  const [stories, setStories] = useState<StoryGroup[]>([]);
  const [hasMyActiveStories, setHasMyActiveStories] = useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const fetchStories = useCallback(async () => {
    if (!supabase) return;
    try {
      const { data: storiesData } = await supabase
        .from('stories')
        .select('*, users:user_id(id, username, full_name, photo_url)')
        .order('created_at', { ascending: false });

      if (storiesData) {
        const grouped: Record<string, StoryGroup> = {};
        storiesData.forEach((s: any) => {
          if (s.users && s.user_id !== authUser?.id) {
            grouped[s.user_id] = {
              userId: s.user_id,
              username: s.users.username || 'User',
              fullName: s.users.full_name || 'Grix User',
              photoURL: s.users.photo_url || '',
              hasUnseen: true
            };
          }
        });
        setStories(Object.values(grouped));
        setHasMyActiveStories(storiesData.some((s: any) => s.user_id === authUser?.id));
      }
    } catch (e) {
      console.error('Error fetching active stories on ChatsTab:', e);
    }
  }, [authUser?.id]);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const handleDirectStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser || !supabase) return;

    setIsUploadingStory(true);
    try {
      const url = await ImageService.uploadImage(file, () => {}, 'stories');
      
      const { error } = await supabase.from('stories').insert({
        user_id: authUser.id,
        media_url: url,
        type: 'image'
      } as any);

      if (error) throw error;
      await fetchStories();
    } catch (err) {
      console.error("Error direct story upload:", err);
      alert("Failed to share story.");
    } finally {
      setIsUploadingStory(false);
      if (storyFileInputRef.current) {
        storyFileInputRef.current.value = '';
      }
    }
  };

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
    if (c.type === 'group') return false; // Move groups to dedicated groups tab
    const isHidden = Array.isArray(userData?.hiddenChats) && userData.hiddenChats.includes(c.id);
    const isArchived = Array.isArray(userData?.archivedChats) && userData.archivedChats.includes(c.id);
    
    // Always hide hidden chats from the main chat lists/matches (they only show in unlocked /chats/hidden screen)
    if (isHidden) return false;
    if (isArchived) return false;

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
        {/* INSTAGRAM STYLE STORIES - HORIZONTAL SCROLL ROW */}
        {activeFilter === 'Chats' && (
          <div className="shrink-0 border-b border-[var(--border-color)]/30 bg-[var(--bg-card)] py-3 px-4 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth">
            {/* Current User Story Circle */}
            <div className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer min-w-[72px]">
              <div 
                className="relative group shrink-0 active:scale-95 transition-transform"
              >
                {/* Profile Pic Click: views story if active, else opens gallery */}
                <div 
                  onClick={() => {
                    if (hasMyActiveStories) {
                      navigate(`/stories/view/${authUser?.id}`);
                    } else {
                      storyFileInputRef.current?.click();
                    }
                  }}
                  className={`w-16 h-16 rounded-full p-[2px] border-2 bg-[var(--bg-main)] flex items-center justify-center shrink-0 aspect-square ${hasMyActiveStories ? 'border-[#0494f4]' : 'border-black dark:border-white'}`}
                >
                  <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-main)] relative">
                    {isUploadingStory ? (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={20} className="animate-spin text-white" />
                      </div>
                    ) : (
                      <img 
                        src={userData?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                        alt="My profile"
                        className="w-full h-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    )}
                  </div>
                </div>
                {/* Plus Icon Overlay: directly opens system file selector */}
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    storyFileInputRef.current?.click();
                  }}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#0494f4] hover:bg-[#0381d6] text-white rounded-full flex items-center justify-center shadow-md border-2 border-[var(--bg-card)] cursor-pointer transition-colors"
                >
                  {isUploadingStory ? <Loader2 size={10} className="animate-spin" /> : <Plus size={12} strokeWidth={2.5} />}
                </span>
              </div>
              <span className="text-[10px] font-bold text-[var(--text-secondary)] text-center w-full truncate mt-0.5">
                Your Story
              </span>

              {/* Hidden file input for direct photo story upload */}
              <input 
                type="file" 
                ref={storyFileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleDirectStoryUpload} 
              />
            </div>

            {/* Stories from database */}
            {stories.map((story) => (
              <div 
                key={story.userId}
                onClick={() => navigate(`/stories/view/${story.userId}`)}
                className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer min-w-[72px]"
              >
                <div className="relative active:scale-95 transition-transform">
                  <div className="w-16 h-16 rounded-full p-[2px] border-2 border-[#0494f4] flex items-center justify-center shrink-0 aspect-square">
                    <div className="w-full h-full rounded-full overflow-hidden bg-[var(--bg-main)] flex items-center justify-center shrink-0">
                      <img 
                        src={story.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                        alt={story.username}
                        className="w-full h-full object-cover shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-bold text-[var(--text-primary)] text-center w-full truncate mt-0.5">
                  {story.username}
                </span>
              </div>
            ))}
          </div>
        )}

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
              usersWithStories={stories.map(s => s.userId)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
