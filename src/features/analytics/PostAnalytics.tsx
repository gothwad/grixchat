import React, { useEffect, useState } from 'react';
import { 
  Grid, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { motion } from 'motion/react';

export default function PostAnalytics() {
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const [summary, setSummary] = useState({
    totalLikes: 0,
    totalComments: 0,
    count: 0
  });

  useEffect(() => {
    const fetchPostAnalytics = async () => {
      if (!authUser || !supabase) return;
      try {
        const { data: posts, error, count } = await supabase
          .from('posts')
          .select('*', { count: 'exact' })
          .eq('user_id', authUser.id)
          .order('likes_count', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (posts) {
          setTopPosts(posts.map(p => ({
            ...p,
            imageUrl: p.media_url,
            likes: p.likes_count,
            comments: p.comments_count
          })));

          let likes = 0;
          let comments = 0;
          posts.forEach((p: any) => {
            likes += p.likes_count || 0;
            comments += p.comments_count || 0;
          });

          setSummary({
            totalLikes: likes,
            totalComments: comments,
            count: count || 0
          });
        }
      } catch (err) {
        console.error("Error fetching post analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAnalytics();
  }, [authUser]);

  if (loading) return <div className="p-10 text-center text-xs font-bold animate-pulse">Analyzing Posts...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]">
          <p className="text-[9px] font-black uppercase text-[var(--text-secondary)] mb-1">Posts</p>
          <p className="text-lg font-black">{summary.count}</p>
        </div>
        <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]">
          <p className="text-[9px] font-black uppercase text-[var(--text-secondary)] mb-1">Total Likes</p>
          <p className="text-lg font-black">{summary.totalLikes}</p>
        </div>
        <div className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)]">
          <p className="text-[9px] font-black uppercase text-[var(--text-secondary)] mb-1">Comments</p>
          <p className="text-lg font-black">{summary.totalComments}</p>
        </div>
      </div>

      {/* Top Performing Posts */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Top Performing</h3>
          <button className="text-[10px] font-bold text-blue-500">View All</button>
        </div>

        {topPosts.length > 0 ? (
          <div className="space-y-3">
            {topPosts.map((post, idx) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)] flex gap-3 items-center group cursor-pointer hover:border-blue-500/30 transition-all"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--border-color)]">
                  <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold truncate text-[var(--text-primary)] mb-1">{post.caption || 'No caption'}</p>
                  <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-secondary)]/60">
                    <div className="flex items-center gap-1">
                      <Heart size={10} className="text-rose-500" />
                      <span>{post.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle size={10} className="text-amber-500" />
                      <span>{post.comments || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full">
                    +{Math.floor(Math.random() * 50)}%
                  </div>
                  <MoreHorizontal size={14} className="text-[var(--text-secondary)]" />
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)]/50 p-10 rounded-3xl border border-dashed border-[var(--border-color)] text-center">
            <Grid size={32} className="mx-auto mb-3 text-[var(--text-secondary)]" />
            <p className="text-xs font-bold text-[var(--text-secondary)]">No posts found to analyze.</p>
          </div>
        )}
      </div>
    </div>
  );
}
