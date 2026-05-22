import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { 
  Plus,
  Camera,
  PenLine,
  Image as ImageIcon,
  Clapperboard,
  User,
  PlaySquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LocalDataCache } from '../../services/LocalDataCache';

import PostCard from './components/PostCard.tsx';
import CommentSheet from './components/CommentSheet.tsx';

export default function HomeTab() {
  const navigate = useNavigate();
  const { userData: currentUserData } = useAuth();
  
  const [feedItems, setFeedItems] = useState<any[]>(() => {
    if (currentUserData?.id) {
      return LocalDataCache.getHomeFeed(currentUserData.id) || [];
    }
    return [];
  });
  
  const [stories, setStories] = useState<any[]>(() => {
    if (currentUserData?.id) {
      return LocalDataCache.getHomeStories(currentUserData.id) || [];
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    if (currentUserData?.id) {
      const cached = LocalDataCache.getHomeFeed(currentUserData.id);
      return !cached || cached.length === 0;
    }
    return true;
  });
  
  const [showStoryMenu, setShowStoryMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowStoryMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  // Fetch Stories
  useEffect(() => {
    if (!currentUserData || !supabase) return;

    const fetchStories = async () => {
      // Get stories from people I follow + myself
      const myId = currentUserData.id;
      
      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId);
      
      const followingIds = (followData as any[])?.map(f => f.following_id) || [];
      const allowedIds = [myId, ...followingIds];

      const { data: storyData, error } = await supabase
        .from('stories')
        .select(`
          *,
          user:users (
            id,
            username,
            full_name,
            photo_url
          )
        `)
        .in('user_id', allowedIds)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching stories:', error);
        return;
      }

      // Group stories by user
      const grouped: { [key: string]: any } = {};
      storyData?.forEach((s: any) => {
        const userId = s.user_id;
        if (!grouped[userId]) {
          grouped[userId] = {
            userId: userId,
            fullName: s.user?.full_name,
            username: s.user?.username,
            photoURL: s.user?.photo_url,
            updates: []
          };
        }
        grouped[userId].updates.push(s);
      });

      const storyList = Object.values(grouped);
      LocalDataCache.saveHomeStories(myId, storyList);
      setStories(storyList);
    };

    fetchStories();
    
    // Optional: Real-time subscription for new stories
    const channel = supabase
      .channel('public:stories')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, () => {
        fetchStories();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserData?.id]);

  // Fetch Feed (Posts from people I follow)
  useEffect(() => {
    if (!currentUserData || !supabase) return;

    const fetchFeed = async () => {
      const myId = currentUserData.id;
      const cached = LocalDataCache.getHomeFeed(myId);
      if (!cached || cached.length === 0) {
        setLoading(true);
      }

      const { data: followData } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', myId);
      
      const followingIds = (followData as any[])?.map(f => f.following_id) || [];
      const allowedIds = [myId, ...followingIds];

      const { data: posts, error } = await supabase
        .from('posts')
        .select(`
          *,
          user:users (
            id,
            username,
            full_name,
            photo_url
          )
        `)
        .in('user_id', allowedIds)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching posts:', error);
      } else {
        // Map to expected frontend structure
        const mappedPosts = (posts as any[])?.map(p => ({
          id: p.id,
          userId: p.user_id,
          username: p.user?.username,
          fullName: p.user?.full_name,
          photoURL: p.user?.photo_url,
          content: p.caption,
          mediaUrls: p.media_urls,
          likesCount: p.likes_count,
          commentsCount: p.comments_count,
          createdAt: p.created_at,
          feedType: 'post'
        }));
        LocalDataCache.saveHomeFeed(myId, mappedPosts || []);
        setFeedItems(mappedPosts || []);
      }
      setLoading(false);
    };

    fetchFeed();

    // Subscribe to post changes/likes
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchFeed();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserData?.id]);

  const myStories = stories.find(s => s.userId === currentUserData?.id);
  const otherStories = stories.filter(s => s.userId !== currentUserData?.id);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans overflow-y-auto no-scrollbar pb-24" ref={scrollContainerRef}>
      {/* Stories Bar */}
      <div className="flex items-center gap-4 px-4 py-4 overflow-x-auto no-scrollbar border-b border-[var(--border-color)]/30 shrink-0">
        {/* My Story */}
        <div 
          className="flex flex-col items-center gap-1 shrink-0 cursor-pointer relative"
          ref={menuRef}
        >
          <div className="relative" onClick={() => setShowStoryMenu(!showStoryMenu)}>
            <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-[var(--primary)]">
              <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden">
                <img 
                  src={currentUserData?.photoURL || DEFAULT_LOGO} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  alt=""
                />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-[var(--bg-main)]">
              <Plus size={14} strokeWidth={4} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Your World</span>
        </div>

        {/* Action Menu Dropdown */}
        <AnimatePresence>
          {showStoryMenu && (
            <div className="fixed inset-0 z-[100]" onClick={() => setShowStoryMenu(false)}>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                style={{ 
                  position: 'fixed',
                  top: '145px',
                  left: '16px',
                }}
                className="w-52 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] py-2 z-[110] overflow-hidden origin-top-left"
                onClick={e => e.stopPropagation()}
              >
                {myStories && (
                  <button 
                    onClick={() => { setShowStoryMenu(false); navigate(`/stories/view/${currentUserData?.id}`); }}
                    className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                  >
                    <User size={18} className="text-blue-500" />
                    View Story
                  </button>
                )}
                <button 
                  onClick={() => { setShowStoryMenu(false); navigate('/chats'); }}
                  className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                >
                  <PenLine size={18} className="text-purple-500" />
                  Make Note
                </button>
                <button 
                  onClick={() => { setShowStoryMenu(false); navigate('/stories/create'); }}
                  className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                >
                  <Camera size={18} className="text-orange-500" />
                  Bring Story
                </button>
                <button 
                  onClick={() => { setShowStoryMenu(false); navigate('/create'); }}
                  className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                >
                  <ImageIcon size={18} className="text-emerald-500" />
                  Upload Post
                </button>
                <button 
                  onClick={() => { setShowStoryMenu(false); navigate('/reels/create'); }}
                  className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                >
                  <Clapperboard size={18} className="text-pink-500" />
                  Make Reel
                </button>
                <button 
                  onClick={() => { setShowStoryMenu(false); navigate('/tube/upload'); }}
                  className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                >
                  <PlaySquare size={18} className="text-blue-500" />
                  Make Video
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Other Stories */}
        {otherStories.map((userStory) => (
          <div 
            key={userStory.userId}
            onClick={() => navigate(`/stories/view/${userStory.userId}`)}
            className="flex flex-col items-center gap-1 shrink-0 cursor-pointer"
          >
            <div className={`w-[68px] h-[68px] rounded-full p-[3px] ${userStory.allSeen ? 'bg-zinc-300' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'}`}>
              <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden">
                <img 
                  src={userStory.photoURL || DEFAULT_LOGO} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                  alt=""
                />
              </div>
            </div>
            <span className="text-[10px] font-medium text-[var(--text-secondary)] truncate w-16 text-center">
              {userStory.username || 'User'}
            </span>
          </div>
        ))}
      </div>

      {/* Feed */}
      <div className="flex flex-col">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Feed...</p>
          </div>
        ) : feedItems.length > 0 ? (
          feedItems.map((item) => (
            <div key={item.id}>
              <PostCard 
                post={item} 
                currentUserData={currentUserData} 
                onCommentClick={(postId) => {
                  setActiveCommentPostId(postId);
                }}
              />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <Camera size={32} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Feed is empty</h3>
            <p className="text-xs text-[var(--text-secondary)]">Follow people to see their posts here.</p>
            <button 
              onClick={() => navigate('/search-user')}
              className="mt-2 bg-[var(--primary)] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
            >
              Find Friends
            </button>
          </div>
        )}
      </div>

      {/* Global Comments Sheet */}
      <CommentSheet 
        postId={activeCommentPostId || ''}
        isOpen={!!activeCommentPostId}
        onClose={() => setActiveCommentPostId(null)}
        currentUserData={currentUserData}
        collectionName="posts"
      />
    </div>
  );
}
