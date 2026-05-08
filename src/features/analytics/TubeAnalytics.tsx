import React, { useEffect, useState } from 'react';
import { 
  Play, 
  Eye, 
  ThumbsUp, 
  Clock,
  TrendingUp,
  Award
} from 'lucide-react';
import { auth, db } from '../../services/firebase.ts';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function TubeAnalytics() {
  const [topVideos, setTopVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalViews, setTotalViews] = useState(0);

  useEffect(() => {
    const fetchTubeAnalytics = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "tube_videos"), 
          where("userId", "==", auth.currentUser.uid),
          orderBy("views", "desc"),
          limit(5)
        );
        const snapshot = await getDocs(q);
        const videos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopVideos(videos);

        let views = 0;
        videos.forEach((v: any) => {
          views += v.views || 0;
        });
        setTotalViews(views);
      } catch (err) {
        console.error("Error fetching tube analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTubeAnalytics();
  }, []);

  if (loading) return <div className="p-10 text-center text-xs font-bold animate-pulse">Calculating views...</div>;

  return (
    <div className="space-y-6">
      {/* View Milestone Header */}
      <div className="bg-blue-600 p-6 rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Award size={18} className="text-blue-200" />
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-100">Visibility Hub</span>
          </div>
          <h2 className="text-4xl font-black mb-1 tracking-tighter">
            {totalViews.toLocaleString()}
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Total Tube Impressions</p>
        </div>
        
        {/* Abstract shapes for design */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full translate-x-10 -translate-y-10" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-blue-400/20 rounded-full -translate-x-5 translate-y-5" />
      </div>

      {/* Grid of details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-3">
            <Eye size={16} className="text-blue-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Retention</span>
          </div>
          <p className="text-xl font-black">74%</p>
          <div className="w-full h-1.5 bg-[var(--bg-main)] rounded-full mt-2">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: '74%' }} />
          </div>
        </div>
        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)]">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">Watch Time</span>
          </div>
          <p className="text-xl font-black">12.4h</p>
          <p className="text-[9px] font-bold text-emerald-500 mt-1">+2.1h this week</p>
        </div>
      </div>

      {/* Best Videos List */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-blue-500" />
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Most Popular Videos</h3>
        </div>

        {topVideos.length > 0 ? (
          <div className="space-y-4">
            {topVideos.map((video, idx) => (
              <motion.div 
                key={video.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="flex gap-4 group cursor-pointer"
              >
                <div className="w-32 aspect-video rounded-2xl overflow-hidden bg-zinc-900 shrink-0 border border-[var(--border-color)] shadow-sm">
                  <img src={video.thumbnail} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="Video" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="text-sm font-black text-[var(--text-primary)] truncate mb-1">{video.title}</h4>
                  <div className="flex items-center gap-3 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tight">
                    <span className="flex items-center gap-1">
                      <Eye size={12} /> {video.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <ThumbsUp size={10} /> {video.likes || 0}
                    </span>
                    <span>{video.duration || '0:00'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] p-10 rounded-[2rem] border-2 border-dashed border-[var(--border-color)] text-center">
            <Play size={32} className="mx-auto mb-3 text-blue-500 opacity-30" />
            <p className="text-xs font-bold text-[var(--text-secondary)]">Start your Tube journey to see insights.</p>
          </div>
        )}
      </div>
    </div>
  );
}
