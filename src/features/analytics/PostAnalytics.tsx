import React, { useEffect, useState } from 'react';
import { 
  Grid, 
  Heart, 
  MessageCircle, 
  Bookmark,
  Share2,
  MoreHorizontal
} from 'lucide-react';
import { auth, db } from '../../services/firebase.ts';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function PostAnalytics() {
  const [topPosts, setTopPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalLikes: 0,
    totalComments: 0,
    count: 0
  });

  useEffect(() => {
    const fetchPostAnalytics = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "posts"), 
          where("userId", "==", auth.currentUser.uid),
          orderBy("likes", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopPosts(posts);

        let likes = 0;
        let comments = 0;
        posts.forEach((p: any) => {
          likes += p.likes || 0;
          comments += p.comments || 0;
        });

        setSummary({
          totalLikes: likes,
          totalComments: comments,
          count: snapshot.size
        });
      } catch (err) {
        console.error("Error fetching post analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPostAnalytics();
  }, []);

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
