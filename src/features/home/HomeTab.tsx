import React, { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDocs, where } from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Share2, 
  Bookmark,
  Plus,
  Camera,
  Send,
  PenLine,
  Image as ImageIcon,
  Clapperboard,
  User,
  X as CloseIcon,
  PlaySquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toDate } from '../../utils/dateUtils.ts';

import PostCard from './components/PostCard.tsx';
import VideoPostCard from './components/VideoPostCard.tsx';

export default function HomeTab() {
  const navigate = useNavigate();
  const [feedItems, setFeedItems] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [showStoryMenu, setShowStoryMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

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

  useEffect(() => {
    if (auth.currentUser) {
      const unsubscribeMe = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
        if (docSnap.exists()) {
          setCurrentUserData(docSnap.data());
        }
      });
      return () => unsubscribeMe();
    }
  }, []);

  // Fetch Stories
  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "stories"),
      orderBy("timestamp", "desc"),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const storyList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      
      const grouped: { [key: string]: any } = {};
      storyList.forEach((s: any) => {
        const isMe = s.userId === auth.currentUser?.uid;
        const isFollowing = currentUserData?.following?.includes(s.userId);

        if (isMe || isFollowing) {
          if (!grouped[s.userId]) {
            grouped[s.userId] = {
              userId: s.userId,
              fullName: s.fullName,
              username: s.username,
              photoURL: s.photoURL,
              updates: []
            };
          }
          grouped[s.userId].updates.push(s);
        }
      });

      const processedStories = Object.values(grouped).map((userStory: any) => {
        const allSeen = userStory.updates.every((u: any) => 
          u.viewers && u.viewers.includes(auth.currentUser?.uid)
        );
        return { ...userStory, allSeen };
      });

      setStories(processedStories);
    });

    return () => unsubscribe();
  }, [currentUserData?.following]);

  // Fetch Feed (Posts + Videos - Following Only)
  useEffect(() => {
    if (!auth.currentUser || !currentUserData) return;

    const following = currentUserData.following || [];
    const myUid = auth.currentUser.uid;
    const allowedUserIds = [myUid, ...following];

    const fetchFeed = async () => {
      setLoading(true);
      try {
        // Since Firestore 'in' matches max 30 IDs, and we want a merged feed from multiple collections,
        // we'll fetch both and merge/filter in JS for this demo.
        // In production, we'd use a unified 'activities' collection.
        
        // Fetch Posts
        const postsQ = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(40));
        const postsSnap = await getDocs(postsQ);
        const postItems = postsSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          feedType: 'post' 
        }));

        // Fetch Tube Videos
        const videosQ = query(collection(db, "tube_videos"), orderBy("createdAt", "desc"), limit(40));
        const videosSnap = await getDocs(videosQ);
        const videoItems = videosSnap.docs.map(d => ({ 
          id: d.id, 
          ...d.data(), 
          feedType: 'video' 
        }));

        // Combine and Filter by Following
        const combined = [...postItems, ...videoItems]
          .filter((item: any) => allowedUserIds.includes(item.userId))
          .sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis?.() || a.createdAt || 0;
            const timeB = b.createdAt?.toMillis?.() || b.createdAt || 0;
            return timeB - timeA;
          });

        setFeedItems(combined);
      } catch (err) {
        console.error("Error fetching feed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFeed();
  }, [currentUserData?.following]);

  // Autoplay Intersection Observer
  useEffect(() => {
    if (loading || feedItems.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
      // Find all videos currently in view
      const visibleVideos = entries.filter(e => e.isIntersecting && e.target.getAttribute('data-type') === 'video');
      
      if (visibleVideos.length > 0) {
        // Sort by intersection ratio to find the most "centered" one
        const bestEntry = visibleVideos.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = bestEntry.target.getAttribute('data-id');
        if (id) setActiveVideoId(id);
      } else {
        // If no videos are intersecting significantly, clear active video
        const leavingVideos = entries.filter(e => !e.isIntersecting && e.target.getAttribute('data-type') === 'video');
        if (leavingVideos.some(e => e.target.getAttribute('data-id') === activeVideoId)) {
          setActiveVideoId(null);
        }
      }
    }, {
      root: null,
      rootMargin: '-20% 0px -20% 0px', // Detects items in the middle 60% of the screen
      threshold: [0, 0.5, 0.9] // Check at multiple visibility points
    });

    Object.values(itemRefs.current).forEach(node => {
      if (node instanceof HTMLElement) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [loading, feedItems, activeVideoId]);

  const myStories = stories.find(s => s.userId === auth.currentUser?.uid);
  const otherStories = stories.filter(s => s.userId !== auth.currentUser?.uid);

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
            <div className="w-[68px] h-[68px] rounded-full p-[3px] bg-[#375a7f]">
              <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden">
                <img 
                  src={currentUserData?.photoURL || DEFAULT_LOGO} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
            <div className="absolute bottom-1 right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-[var(--bg-main)]">
              <Plus size={14} strokeWidth={4} />
            </div>
          </div>
          <span className="text-[10px] font-medium text-[var(--text-secondary)]">Your World</span>
        </div>

        {/* WhatsApp-like Dropdown Menu */}
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
                    onClick={() => { setShowStoryMenu(false); navigate(`/stories/view/${auth.currentUser?.uid}`); }}
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
            <div 
              key={item.id} 
              ref={el => itemRefs.current[item.id] = el}
              data-id={item.id}
              data-type={item.feedType}
            >
              {item.feedType === 'video' ? (
                <VideoPostCard 
                  video={item} 
                  currentUserData={currentUserData} 
                  isActive={activeVideoId === item.id}
                />
              ) : (
                <PostCard 
                  post={item} 
                  currentUserData={currentUserData} 
                />
              )}
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4">
            <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400">
              <Camera size={32} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Feed is empty</h3>
            <p className="text-xs text-[var(--text-secondary)]">Follow people to see their posts and videos here.</p>
            <button 
              onClick={() => navigate('/search-user')}
              className="mt-2 bg-[var(--primary)] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-lg"
            >
              Find Friends
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
