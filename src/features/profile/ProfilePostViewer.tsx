import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import PostCard from '../home/components/PostCard.tsx';

export default function ProfilePostViewer() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser, userData: currentUserData } = useAuth();
  const searchParams = new URLSearchParams(location.search);
  const startPostId = searchParams.get('postId');
  const tab = searchParams.get('tab') || 'posts';
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!userId || !supabase) return;

    const fetchPosts = async () => {
      setLoading(true);
      try {
        let baseQuery;
        if (tab === 'posts') {
          baseQuery = supabase.from('posts').select(`
            *,
            users:user_id(username, photo_url, full_name)
          `).eq('user_id', userId);
        } else if (tab === 'reels') {
          baseQuery = supabase.from('reels').select(`
            *,
            users:user_id(username, photo_url, full_name)
          `).eq('user_id', userId);
        } else if (tab === 'tube') {
          baseQuery = supabase.from('tube_videos').select(`
            *,
            users:user_id(username, photo_url, full_name)
          `).eq('user_id', userId);
        } else if (tab === 'saved') {
            const { data: userProfile } = await supabase.from('users').select('saved_posts').eq('id', userId).single();
            const savedIds = userProfile?.saved_posts || [];
            
            if (savedIds.length > 0) {
              baseQuery = supabase.from('posts').select(`
                *,
                users:user_id(username, photo_url, full_name)
              `).in('id', savedIds.slice(0, 10));
            } else {
              setPosts([]);
              setLoading(false);
              return;
            }
        } else {
          setLoading(false);
          return;
        }

        const { data, error } = await baseQuery.order('created_at', { ascending: false });
        if (error) throw error;
        
        const fetchedPosts = (data || []).map((m: any) => {
          return {
            id: m.id,
            ...m,
            mediaUrls: m.media_urls || [],
            imageUrl: m.media_urls?.[0] || m.imageUrl || m.thumbnail_url || m.cover || m.thumbnail || m.url || m.video_url,
            userName: m.users?.full_name || m.users?.username || 'User',
            userAvatar: m.users?.photo_url || '',
            caption: m.caption || m.title || m.description || '',
            content: m.caption || m.content || '',
            userId: m.user_id || ''
          };
        });
        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Error fetching viewer posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [userId, tab]);

  // Scroll to the start post once loaded
  useEffect(() => {
    if (!loading && startPostId && postRefs.current[startPostId]) {
      postRefs.current[startPostId]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, startPostId]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex items-center gap-3 z-50 shrink-0 border-b border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-[var(--header-text)] capitalize">{tab}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : posts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <div 
                key={post.id} 
                ref={el => { postRefs.current[post.id] = el; }}
                className="pt-2"
              >
                <PostCard post={post} currentUserData={currentUserData} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <p className="text-sm font-bold">No posts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
