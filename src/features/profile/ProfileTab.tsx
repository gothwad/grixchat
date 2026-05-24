import React, { useEffect, useState } from 'react';
import { 
  Grid,
  Bookmark,
  Camera,
  Clapperboard,
  Play,
  Pencil,
  Share2,
  Check,
  ChevronRight,
  Heart
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../providers/AuthProvider';

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tube' | 'saved'>('posts');
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const navigate = useNavigate();

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const userData = authUserData;

  // Track item counts dynamically
  const [counts, setCounts] = useState({
    posts: 0,
    reels: 0,
    tube: 0,
    saved: 0
  });

  // Fetch counts on load/update
  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchCounts = async () => {
      try {
        // Posts count
        const { count: postCount } = await supabase
          .from('posts')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);
        
        // Reels count
        const { count: reelsCount } = await supabase
          .from('reels')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        // Tube videos count
        const { count: tubeCount } = await supabase
          .from('tube_videos')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);

        // Saved count from local state or context
        const savedCount = userData?.saved_posts?.length || 0;

        setCounts({
          posts: postCount || 0,
          reels: reelsCount || 0,
          tube: tubeCount || 0,
          saved: savedCount
        });
      } catch (err) {
        console.error("Error fetching creator metrics:", err);
      }
    };

    fetchCounts();
  }, [authUser, userData?.saved_posts]);

  // Fetch main content based on active tab
  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchContent = async () => {
      try {
        if (activeTab === 'posts') {
          const { data } = await supabase.from('posts').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(p => ({
            ...p,
            imageUrl: p.media_urls?.[0] || p.imageUrl 
          })));
        } else if (activeTab === 'reels') {
          const { data } = await supabase.from('reels').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(d => ({ ...d, imageUrl: d.cover_url || d.thumbnail_url || d.cover })));
        } else if (activeTab === 'tube') {
          const { data } = await supabase.from('tube_videos').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(d => ({ ...d, imageUrl: d.thumbnail_url || d.thumbnail })));
        } else if (activeTab === 'saved') {
          if (userData?.saved_posts && userData.saved_posts.length > 0) {
            const { data } = await supabase.from('posts').select('*').in('id', userData.saved_posts).order('created_at', { ascending: false });
            setPosts((data || []).map(p => ({
              ...p,
              imageUrl: p.media_urls?.[0] || p.imageUrl 
            })));
          } else {
            setPosts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching tab content:", err);
        setPosts([]);
      }
    };
    
    fetchContent();
  }, [activeTab, userData?.saved_posts, authUser]);

  // Robust Clipboard share profile utility
  const handleShareProfile = () => {
    if (!userData?.username) return;
    const profileLink = `${window.location.origin}/user/${authUser?.id}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(profileLink).then(() => {
        setCopied(true);
        setShowToast(true);
        setTimeout(() => {
          setCopied(false);
          setShowToast(false);
        }, 2500);
      }).catch((err) => {
        executeFallbackCopy();
      });
    } else {
      executeFallbackCopy();
    }
  };

  const executeFallbackCopy = () => {
    try {
      const textToCopy = `@${userData?.username || 'grix_user'}`;
      const tempInput = document.createElement("input");
      tempInput.value = textToCopy;
      document.body.appendChild(tempInput);
      tempInput.select();
      document.execCommand("copy");
      document.body.removeChild(tempInput);
      setCopied(true);
      setShowToast(true);
      setTimeout(() => {
        setCopied(false);
        setShowToast(false);
      }, 2500);
    } catch (e) {
      console.error("Copy operation disabled due to frame sandbox restriction.");
    }
  };

  const renderMediaCardItem = (post: any) => {
    const isVideoOrTube = activeTab === 'tube' || activeTab === 'reels';
    const hasImage = !!post.imageUrl;
    
    return (
      <div 
        key={post.id} 
        className={`relative group overflow-hidden cursor-pointer rounded-xl border border-[var(--border-color)] bg-[var(--box-bg)] transition-all duration-200 active:scale-[0.98] ${
          activeTab === 'tube' ? 'aspect-video' : 'aspect-square'
        }`}
        onClick={() => {
          if (activeTab === 'posts' || activeTab === 'saved') {
            navigate(`/user/${authUser?.id}/posts?postId=${post.id}&tab=${activeTab}`);
          } else if (activeTab === 'reels') {
            navigate(`/user/${authUser?.id}/reels?reelId=${post.id}`);
          } else if (activeTab === 'tube') {
            navigate(`/user/${authUser?.id}/tube?videoId=${post.id}`);
          }
        }}
      >
        {hasImage ? (
          <img 
            src={post.imageUrl} 
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            referrerPolicy="no-referrer"
            alt="Upload"
          />
        ) : (
          /* Text note/quote card stylized layout fallback */
          <div className="absolute inset-0 p-3.5 flex flex-col justify-between text-[var(--text-primary)]">
            <div className="flex items-center justify-between opacity-50">
              {activeTab === 'posts' && <Camera size={13} />}
              {activeTab === 'saved' && <Bookmark size={13} />}
              <span className="text-[8.5px] font-bold bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 rounded tracking-wider uppercase">Text</span>
            </div>
            <p className="text-[11.5px] font-normal leading-relaxed line-clamp-4 text-[var(--text-primary)] my-auto">
              {post.content || post.title || 'No caption'}
            </p>
            <div className="text-[8.5px] opacity-40 font-mono">
              {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Now'}
            </div>
          </div>
        )}
        
        {/* Simple and elegant tap overlay */}
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {isVideoOrTube ? (
            <div className="w-8 h-8 rounded-full bg-white/90 shadow text-black flex items-center justify-center">
              <Play size={14} className="fill-current text-zinc-900 ml-0.5" />
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-white/90 shadow text-black flex items-center justify-center">
              <Heart size={14} className="fill-current text-rose-500" />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar">
      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-md flex items-center gap-2 border border-zinc-800"
          >
            <Check size={13} className="text-emerald-400 shrink-0" />
            <span>Profile link copied</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 pb-24">
        {/* Profile Card Block */}
        <div className="px-4 pt-5 pb-2">
          {/* Unified Profile Card Header */}
          <div className="bg-[var(--box-bg)] border border-[var(--border-color)] p-4 rounded-xl mb-3 flex items-center gap-3.5 shadow-sm">
            {/* Elegant Flat Minimal Profile Picture */}
            <div className="relative shrink-0">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-100 border border-[var(--border-color)] shadow-sm">
                <img 
                  src={userData?.photoURL || DEFAULT_LOGO} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  alt="Avatar"
                />
              </div>
            </div>

            {/* Profile Info Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-[15.5px] font-bold text-[var(--text-primary)] tracking-tight truncate leading-none">
                  {userData?.fullName || 'GrixChat User'}
                </h2>
                
                {/* Premium Action Buttons next to Name */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button 
                    onClick={handleShareProfile}
                    className="w-[30px] h-[30px] rounded-lg bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center justify-center active:scale-95 transition-all hover:text-[var(--text-primary)]"
                    title="Share Profile"
                  >
                    {copied ? <Check size={13} className="text-emerald-500" /> : <Share2 size={13} />}
                  </button>
                  <button 
                    onClick={() => navigate('/edit-profile')}
                    className="w-[30px] h-[30px] rounded-lg bg-[var(--bg-main)] text-[var(--text-secondary)] border border-[var(--border-color)] flex items-center justify-center active:scale-95 transition-all hover:text-[var(--text-primary)]"
                    title="Edit Profile"
                  >
                    <Pencil size={12} />
                  </button>
                </div>
              </div>
              <p className="text-[11.5px] text-[var(--text-secondary)] font-mono font-medium truncate mt-1">
                @{userData?.username || 'profile'}
              </p>
            </div>
          </div>

          {/* Solid Minimal Biography Layout (Dynamic Height wrapper) */}
          <div className="bg-[var(--box-bg)] border border-[var(--border-color)] px-4 py-3 rounded-xl mb-3 min-h-[44px] flex flex-col justify-center shadow-sm">
            <p className="text-[11.5px] text-[var(--text-primary)] leading-normal font-normal whitespace-pre-line break-words">
              {userData?.bio || 'Active GrixChat member. Exploring chats, posts and reels.'}
            </p>
          </div>

          {/* Android Style Clean Connection Stats Layout */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button 
              onClick={() => navigate(`/user/${authUser?.id}/followers`)}
              className="flex items-center justify-between bg-[var(--box-bg)] px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Followers</span>
                <span className="text-sm font-extrabold text-[var(--text-primary)]">{userData?.followers?.length || 0}</span>
              </div>
              <ChevronRight size={13} className="text-[var(--text-secondary)] opacity-50" />
            </button>

            <button 
              onClick={() => navigate(`/user/${authUser?.id}/following`)}
              className="flex items-center justify-between bg-[var(--box-bg)] px-3.5 py-2.5 rounded-xl border border-[var(--border-color)] active:scale-[0.98] transition-all"
            >
              <div className="flex flex-col">
                <span className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">Following</span>
                <span className="text-sm font-extrabold text-[var(--text-primary)]">{userData?.following?.length || 0}</span>
              </div>
              <ChevronRight size={13} className="text-[var(--text-secondary)] opacity-50" />
            </button>
          </div>

          {/* Flat Segments Control (Both Icon and Text) */}
          <div className="grid grid-cols-4 bg-[var(--box-bg)] p-1 rounded-xl gap-1 border border-[var(--border-color)] select-none">
            {[
              { id: 'posts', label: 'Posts', icon: Grid, count: counts.posts },
              { id: 'reels', label: 'Reels', icon: Clapperboard, count: counts.reels },
              { id: 'tube', label: 'Videos', icon: Play, count: counts.tube },
              { id: 'saved', label: 'Saved', icon: Bookmark, count: counts.saved }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative py-1.5 rounded-lg flex flex-col items-center justify-center transition-all duration-150 ${
                    isActive 
                      ? 'bg-[var(--bg-main)] text-[var(--text-primary)] font-semibold border border-[var(--border-color)] shadow-sm' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] opacity-80'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Icon size={13} className={isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'} />
                    <span className="text-[9.5px] font-bold font-mono text-[var(--text-primary)]">{tab.count}</span>
                  </div>
                  <span className="text-[10px] font-medium mt-0.5 tracking-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Media Grid Section */}
        <div className="px-4">
          <div className="grid grid-cols-3 gap-2">
            {posts.length > 0 ? (
              posts.map((post) => renderMediaCardItem(post))
            ) : (
              <div className="col-span-3 py-10 flex flex-col items-center justify-center text-[var(--text-secondary)] bg-[var(--box-bg)] rounded-xl border border-[var(--border-color)]">
                <div className="w-10 h-10 rounded-full bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center mb-2.5 text-[var(--text-secondary)]">
                  {activeTab === 'posts' && <Camera size={16} />}
                  {activeTab === 'reels' && <Clapperboard size={16} />}
                  {activeTab === 'tube' && <Play size={16} />}
                  {activeTab === 'saved' && <Bookmark size={16} />}
                </div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-primary)] mb-0.5">
                  {activeTab === 'posts' && 'Empty Feed'}
                  {activeTab === 'reels' && 'No Reels'}
                  {activeTab === 'tube' && 'No Videos'}
                  {activeTab === 'saved' && 'No Saved Posts'}
                </p>
                <p className="text-[10.5px] opacity-65 text-center px-4 max-w-[220px]">
                  {activeTab === 'posts' && 'Your photos and written updates will appear here.'}
                  {activeTab === 'reels' && 'Share short-form vertical videos with Grix.'}
                  {activeTab === 'tube' && 'Publish custom widescreen video files.'}
                  {activeTab === 'saved' && 'Post items saved from your feed.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
