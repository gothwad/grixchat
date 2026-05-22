import React, { useEffect, useState } from 'react';
import { 
  Clapperboard, 
  Play, 
  Heart, 
  MessageCircle, 
  Share2, 
  TrendingUp, 
  Clock 
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { motion } from 'motion/react';

export default function ReelAnalytics() {
  const [topReels, setTopReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const [summary, setSummary] = useState({
    totalLikes: 0,
    totalComments: 0,
    count: 0,
    avgLikes: 0
  });

  useEffect(() => {
    const fetchReelAnalytics = async () => {
      if (!authUser || !supabase) return;
      try {
        const { data: reels, error, count } = await supabase
          .from('reels')
          .select('*', { count: 'exact' })
          .eq('user_id', authUser.id)
          .order('likes_count', { ascending: false })
          .limit(5);

        if (error) throw error;

        if (reels) {
          setTopReels(reels.map(r => ({
            ...r,
            cover: r.thumbnail_url,
            likes: r.likes_count,
            comments: r.comments_count
          })));

          let likes = 0;
          let comments = 0;
          reels.forEach((r: any) => {
            likes += r.likes_count || 0;
            comments += r.comments_count || 0;
          });

          setSummary({
            totalLikes: likes,
            totalComments: comments,
            count: count || 0,
            avgLikes: count && count > 0 ? Math.floor(likes / count) : 0
          });
        }
      } catch (err) {
        console.error("Error fetching reels analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReelAnalytics();
  }, [authUser]);

  if (loading) return <div className="p-10 text-center text-xs font-bold animate-pulse">Scanning Reels...</div>;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-5 rounded-3xl text-white shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-white/20 rounded-xl">
              <Clapperboard size={20} />
            </div>
            <TrendingUp size={16} className="text-white/50" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider opacity-70 mb-1">Total Reels</p>
          <p className="text-2xl font-black">{summary.count}</p>
        </div>

        <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm">
          <div className="flex justify-between items-start mb-4 text-emerald-500">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Heart size={20} />
            </div>
            <span className="text-[10px] font-black">+14%</span>
          </div>
          <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)] opacity-60 mb-1">Avg Likes</p>
          <p className="text-2xl font-black text-[var(--text-primary)]">{summary.avgLikes}</p>
        </div>
      </div>

      {/* Popular Reels */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Most Rewatched</h3>
        
        {topReels.length > 0 ? (
          <div className="grid grid-cols-1 gap-3">
            {topReels.map((reel, idx) => (
              <motion.div 
                key={reel.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-[var(--bg-card)] p-3 rounded-2xl border border-[var(--border-color)] flex items-center gap-4 relative overflow-hidden group hover:border-purple-500/30 transition-all"
              >
                <div className="w-20 h-28 rounded-xl overflow-hidden shrink-0 relative bg-zinc-900 border border-[var(--border-color)]">
                  <img src={reel.cover} className="w-full h-full object-cover opacity-80" alt="Reel" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play size={20} className="text-white fill-current opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-[var(--text-primary)] line-clamp-2 mb-2 leading-relaxed">
                    {reel.caption || "Untitled Reel"}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-rose-500">
                      <Heart size={12} fill="currentColor" />
                      <span>{reel.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-[var(--text-secondary)]">
                      <MessageCircle size={12} />
                      <span>{reel.comments || 0}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-black text-blue-500">
                      <Share2 size={12} />
                      <span>{Math.floor((reel.likes || 0) * 0.2)}</span>
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex flex-col items-center justify-center px-4 border-l border-[var(--border-color)]">
                  <Clock size={16} className="text-[var(--text-secondary)] mb-1" />
                  <span className="text-[9px] font-black text-[var(--text-secondary)] uppercase">15s</span>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] p-12 rounded-3xl border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <Clapperboard size={40} className="mb-4 opacity-20" />
            <p className="text-xs font-bold">Upload reels to see analytics</p>
          </div>
        )}
      </div>
    </div>
  );
}
