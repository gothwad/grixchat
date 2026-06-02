import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Image, Sparkles, Loader2, Compass } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider';
import { Post } from './types';
import { PostsService } from './services/postsSupabase';
import PostCard from './components/PostCard';
import CreatePostModal from './components/CreatePostModal';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { ImageService } from '../../services/ImageService';
import { transactionQueue } from '../../services/db/transactionQueueService';
import { LocalDataCache } from '../../services/LocalDataCache';

interface StoryGroup {
  userId: string;
  username: string;
  fullName: string;
  photoURL: string;
  hasUnseen: boolean;
}

export default function PostsTab() {
  const { user: authUser, userData } = useAuth();
  const navigate = useNavigate();
  
  // Instant load from Cache to eliminate loading spinner and give native app feel!
  const [posts, setPosts] = useState<Post[]>(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.getHomeFeed(authUser.id);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return cached;
      }
    }
    return [];
  });
  
  const [loading, setLoading] = useState(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.getHomeFeed(authUser.id);
      if (cached && Array.isArray(cached) && cached.length > 0) {
        return false;
      }
    }
    return true;
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stories states loaded instantly from Cache
  const [stories, setStories] = useState<StoryGroup[]>(() => {
    if (authUser?.id) {
      const cached = LocalDataCache.getHomeStories(authUser.id);
      if (cached && Array.isArray(cached)) {
        return cached;
      }
    }
    return [];
  });
  
  const [hasActiveStories, setHasActiveStories] = useState(false);
  const [isUploadingStory, setIsUploadingStory] = useState(false);
  const storyFileInputRef = useRef<HTMLInputElement>(null);

  const currentUserPayload = {
    uid: authUser?.id || 'offline-me',
    fullName: userData?.fullName || 'Me',
    username: userData?.username || 'me_offline',
    avatarUrl: userData?.photoURL || ''
  };

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
        const storyGroups = Object.values(grouped);
        setStories(storyGroups);
        
        if (authUser?.id) {
          LocalDataCache.saveHomeStories(authUser.id, storyGroups);
        }
        
        setHasActiveStories(storiesData.some((s: any) => s.user_id === authUser?.id));
      }
    } catch (e) {
      console.error('Error fetching active stories on PostsTab:', e);
    }
  }, [authUser?.id]);

  const handleDirectStoryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !authUser || !supabase) return;

    setIsUploadingStory(true);
    try {
      const url = await ImageService.uploadImage(file, () => {}, 'stories');
      
      try {
        const { error } = await supabase.from('stories').insert({
          user_id: authUser.id,
          media_url: url,
          type: 'image'
        } as any);

        if (error) throw error;
        await fetchStories();
      } catch (dbErr) {
        console.warn("Direct story database save failed, queueing offline retry session:", dbErr);
        await transactionQueue.addTransaction('story_insert', {
          userId: authUser.id,
          mediaUrl: url,
          type: 'image'
        });
        alert("Low signal! Story queued in background. It will publish automatically once connection stabilizes.");
      }
    } catch (err) {
      console.error("Error direct story upload:", err);
      alert("Failed to share story. Please check your network.");
    } finally {
      setIsUploadingStory(false);
      if (storyFileInputRef.current) {
        storyFileInputRef.current.value = '';
      }
    }
  };

  const loadData = async () => {
    // Only set loading to true if there is zero cached posts to present
    if (posts.length === 0) {
      setLoading(true);
    }
    try {
      const allPosts = await PostsService.fetchPosts(authUser?.id);
      setPosts(allPosts);
      
      if (authUser?.id) {
        LocalDataCache.saveHomeFeed(authUser.id, allPosts);
      }
    } catch {
      // safe load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authUser?.id) {
      loadData();
      fetchStories();
    }
  }, [authUser?.id]);

  const handleLike = async (postId: string) => {
    if (!authUser?.id) return;
    try {
      // Optimistically update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const nextLiked = !p.is_liked_by_me;
          return {
            ...p,
            is_liked_by_me: nextLiked,
            likes_count: p.likes_count + (nextLiked ? 1 : -1)
          };
        }
        return p;
      }));

      // Trigger DB toggle
      await PostsService.toggleLike(postId, authUser.id);
    } catch {
      // safe errors
    }
  };

  const handlePublishPost = async (postData: { image_url: string; caption: string }) => {
    try {
      const created = await PostsService.createPost({
        user_id: currentUserPayload.uid,
        image_url: postData.image_url,
        caption: postData.caption
      }, currentUserPayload);

      setPosts(prev => [created, ...prev]);
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-[var(--bg-main)] relative pb-28 no-scrollbar touch-pan-y overscroll-contain">
      {/* Instagram-style Stories row */}
      <div className="px-4 py-3 bg-[var(--bg-card)] border-b border-[var(--border-color)]/60 overflow-hidden">
        <div className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth py-1">
          {/* Current User Story Circle */}
          <div className="flex flex-col items-center gap-1 shrink-0 cursor-pointer w-16">
            <div className="relative shrink-0 active:scale-95 transition-transform">
              <div 
                onClick={() => {
                  if (hasActiveStories) {
                    navigate(`/stories/view/${authUser?.id}`);
                  } else {
                    storyFileInputRef.current?.click();
                  }
                }}
                className={`w-14 h-14 rounded-full p-[2px] border-2 bg-[var(--bg-main)] flex items-center justify-center shrink-0 aspect-square ${hasActiveStories ? 'border-[#0494f4]' : 'border-zinc-300 dark:border-zinc-700'}`}
              >
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-main)] relative">
                  {isUploadingStory ? (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-[#0494f4]" />
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
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  storyFileInputRef.current?.click();
                }}
                className="absolute -bottom-1 -right-1 w-5.5 h-5.5 bg-[#0494f4] hover:bg-[#0381d6] text-white rounded-full flex items-center justify-center shadow-md border-2 border-[var(--bg-card)] cursor-pointer transition-colors"
              >
                {isUploadingStory ? <Loader2 size={10} className="animate-spin" /> : <Plus size={10} strokeWidth={2.5} />}
              </span>
            </div>
            <span className="text-[10px] font-bold text-[var(--text-secondary)] text-center w-full truncate mt-1">
              My Story
            </span>
            <input 
              type="file" 
              ref={storyFileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleDirectStoryUpload} 
            />
          </div>

          {/* Other User Stories */}
          {stories.map((story) => (
            <div 
              key={story.userId}
              onClick={() => navigate(`/stories/view/${story.userId}`)}
              className="flex flex-col items-center gap-1 shrink-0 cursor-pointer w-16"
            >
              <div className="relative active:scale-95 transition-transform">
                <div className="w-14 h-14 rounded-full p-[2px] border-2 border-[#0494f4] flex items-center justify-center shrink-0 aspect-square">
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
              <span className="text-[10px] font-bold text-[var(--text-primary)] text-center w-full truncate mt-1">
                {story.username}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Posts Feed container */}
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center gap-2">
            <Loader2 className="animate-spin text-[#0494f4]" size={32} />
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-[0.1em]">Gathering Feed...</p>
          </div>
        ) : posts.length > 0 ? (
          posts.map(p => (
            <PostCard 
              key={p.id} 
              post={p} 
              onLike={handleLike} 
              onAddComment={() => {}} 
              currentUserId={authUser?.id} 
            />
          ))
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 space-y-3">
            <Compass size={40} className="text-[var(--text-secondary)]/50" />
            <h3 className="text-xs font-bold text-[var(--text-primary)]">Feed has no posts to show</h3>
            <p className="text-[10px] text-[var(--text-secondary)]">Create a brand new post and let the community shine!</p>
          </div>
        )}
      </div>
    </div>
  );
}
