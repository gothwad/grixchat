import React, { useEffect, useState, useCallback } from 'react';
import { 
  Pencil,
  Star,
  Loader2,
  Image,
  Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { truncateToChars } from '../../utils/bioHelper';
import { PostsService } from '../posts/services/postsSupabase';
import { Post } from '../posts/types';
import { supabase } from '../../lib/supabase';
import { AnimatePresence } from 'motion/react';
import CreatePostModal from '../posts/components/CreatePostModal';

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const navigate = useNavigate();

  const loadUserPosts = useCallback(async () => {
    if (!authUser?.id) return;
    setLoadingPosts(true);
    try {
      const allPosts = await PostsService.fetchPosts(authUser.id);
      // Filter for posts created by the current authenticated user
      const filtered = allPosts.filter(p => p.user_id === authUser.id || p.user?.uid === authUser.id);
      setUserPosts(filtered);
    } catch (e) {
      console.error("Error loading user posts in ProfileTab:", e);
    } finally {
      setLoadingPosts(false);
    }
  }, [authUser?.id]);

  const fetchFriendsCount = useCallback(async () => {
    if (!authUser?.id || !supabase) return;
    try {
      // Get following IDs and follower IDs from follows table representing mutual friend links
      const { data: followRows, error: followError } = await supabase
        .from('follows')
        .select('follower_id, following_id')
        .or(`follower_id.eq.${authUser.id},following_id.eq.${authUser.id}`);

      if (followError) throw followError;

      const IFollow = new Set<string>();
      const FollowsMe = new Set<string>();

      followRows?.forEach((row: any) => {
        if (row.follower_id === authUser.id) {
          IFollow.add(row.following_id);
        }
        if (row.following_id === authUser.id) {
          FollowsMe.add(row.follower_id);
        }
      });

      const mutualCount = Array.from(IFollow).filter(id => FollowsMe.has(id)).length;
      setFriendsCount(mutualCount);
    } catch (err) {
      console.error('Error fetching friends count inside ProfileTab:', err);
    }
  }, [authUser?.id]);

  useEffect(() => {
    loadUserPosts();
    fetchFriendsCount();
  }, [loadUserPosts, fetchFriendsCount]);
  
  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const userData = authUserData;
  const profilePic = userData?.photoURL || (userData as any)?.photo_url || authUser?.user_metadata?.avatar_url || DEFAULT_LOGO;

  const handlePublishPost = async (postData: { image_url: string; caption: string }) => {
    try {
      const currentUserPayload = {
        uid: authUser?.id || 'offline-me',
        fullName: userData?.fullName || 'Me',
        username: userData?.username || 'user',
        avatarUrl: userData?.photoURL || ''
      };

      await PostsService.createPost({
        user_id: currentUserPayload.uid,
        image_url: postData.image_url,
        caption: postData.caption
      }, currentUserPayload);

      setIsCreateModalOpen(false);
      // Refresh posts and count immediately
      loadUserPosts();
    } catch (e) {
      console.error("Error publishing new post in ProfileTab:", e);
    }
  };

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar pb-32 animate-fade-in animate-once touch-pan-y overscroll-contain">
      {/* Beautiful Profile Header Section */}
      <div className="px-4 pt-4 mb-3">
        <div 
          onClick={() => navigate('/edit-profile')}
          className="relative bg-[var(--bg-card)] text-[var(--text-primary)] py-5 px-4 border border-[var(--border-color)]/50 rounded-2xl shadow-sm shrink-0 cursor-pointer hover:bg-[var(--bg-card)]/90 transition-colors flex flex-col items-center justify-center text-center"
        >
          {/* Centered Avatar Wrapper with Edit Pencil icon overlay */}
          <div className="relative group shrink-0 mb-3">
            <div className="w-20 h-20 rounded-full p-[2px] border-2 border-zinc-200 dark:border-zinc-800 bg-[var(--bg-main)] flex items-center justify-center shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-main)]">
                <img 
                  src={profilePic || DEFAULT_LOGO} 
                  className="w-full h-full object-cover shrink-0"
                  referrerPolicy="no-referrer"
                  alt="Profile Avatar"
                />
              </div>
            </div>
            <span className="absolute bottom-0 right-0 w-6.5 h-6.5 bg-[#0494f4] text-white rounded-full flex items-center justify-center shadow-lg border-2 border-[var(--bg-card)] hover:scale-105 active:scale-95 transition-all">
              <Pencil size={11} strokeWidth={2.5} />
            </span>
          </div>

          {/* Name & Username Column */}
          <div className="flex flex-col items-center min-w-0">
            <h2 className="text-base font-extrabold tracking-tight text-[var(--text-primary)] leading-tight">
              {userData?.fullName || 'GrixChat User'}
            </h2>
            <span className="text-[10px] text-[#0494f4] font-semibold font-mono tracking-wide mt-1.5 px-2.5 py-0.5 bg-[#0494f4]/15 rounded-full select-none">
              @{userData?.username || 'user'}
            </span>
          </div>

          {/* Bio & Status section */}
          <div className="mt-3.5 pt-3 border-t border-[var(--border-color)]/30 w-full text-center">
            <span className="text-[8.5px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-0.5 font-mono opacity-80">
              Bio & status
            </span>
            <p className="text-xs text-[var(--text-primary)] leading-normal max-w-xs mx-auto break-words whitespace-pre-line text-[var(--text-secondary)] font-medium">
              {userData?.bio ? truncateToChars(userData.bio) : 'Tap to describe yourself & write a custom bio.'}
            </p>
          </div>
        </div>
      </div>

      {/* Stats Block replacing Account Info */}
      <div className="px-4 mb-3">
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]/50 overflow-hidden shadow-sm py-2 px-4 flex justify-around items-center">
          {/* Post Count Stats */}
          <div className="flex flex-col items-center flex-1 justify-center py-0.5 select-none">
            <span className="text-sm font-black text-[var(--text-primary)]">
              {userPosts.length}
            </span>
            <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5">
              Posts
            </span>
          </div>
          
          <div className="w-px h-6 bg-[var(--border-color)]/30" />

          {/* Friends Stats */}
          <div 
            onClick={() => navigate('/search/friends')}
            className="flex flex-col items-center flex-1 cursor-pointer hover:opacity-85 transition-opacity justify-center py-0.5 group select-none"
          >
            <span className="text-sm font-black text-[#0494f4] group-hover:scale-105 transition-transform flex items-center">
              {friendsCount}
            </span>
            <span className="text-[9px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mt-0.5 text-center leading-none">
              Friends
            </span>
          </div>
        </div>
      </div>

      {/* Share what's on your mind... Box - moved below stats block */}
      <div className="px-4 mb-4">
        <div 
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-3 bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]/60 cursor-pointer active:scale-[0.99] hover:bg-[var(--bg-card)]/95 transition-all shadow-sm"
        >
          {profilePic ? (
            <img src={profilePic} alt="Me" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[#0494f4]/15 text-[#0494f4] text-[10px] font-black flex items-center justify-center uppercase">
              ME
            </div>
          )}
          <span className="text-xs font-semibold text-[var(--text-secondary)]/80 flex-1 text-left">
            Share what's on your mind...
          </span>
          <Image size={18} className="text-[#0494f4] opacity-80" />
        </div>
      </div>

      {/* Instagram-style Posts Grid */}
      <div className="px-4 mb-4">
        <h3 className="px-2 mb-2 text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.15em] flex justify-between items-center">
          <span>My Posts list</span>
        </h3>
        
        {loadingPosts ? (
          <div className="py-12 bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl flex justify-center items-center">
            <Loader2 className="animate-spin text-[#0494f4]" size={20} />
          </div>
        ) : userPosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1 rounded-2xl overflow-hidden border border-[var(--border-color)]/40 p-1 bg-[var(--bg-card)]">
            {userPosts.map((post) => (
              <div 
                key={post.id} 
                onClick={() => navigate('/posts')}
                className="relative aspect-square overflow-hidden bg-[var(--bg-main)] cursor-pointer group active:scale-95 transition-transform"
              >
                <img 
                  src={post.image_url} 
                  alt={post.caption || "Post item"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                {/* Overlay with Likes count */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 font-bold text-xs select-none">
                  <Star size={12} fill="currentColor" />
                  <span>{post.likes_count}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/50 rounded-2xl p-8 shadow-sm text-center flex flex-col items-center justify-center gap-3">
            <div className="text-[var(--text-secondary)]/40">
              <Star size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-[var(--text-primary)]">No posts published yet</p>
              <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Click "Share what's on your mind" to publish your first image!</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal Expansion Drawer */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <CreatePostModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onPublish={handlePublishPost} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
