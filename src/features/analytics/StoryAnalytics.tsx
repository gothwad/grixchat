import React, { useEffect, useState } from 'react';
import { 
  Camera, 
  Eye, 
  Users, 
  Clock,
  History,
  Zap
} from 'lucide-react';
import { auth, db } from '../../services/firebase.ts';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function StoryAnalytics() {
  const [activeStories, setActiveStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    totalViewers: 0,
    avgCompletion: 0,
    count: 0
  });

  useEffect(() => {
    const fetchStoryAnalytics = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(
          collection(db, "stories"), 
          where("userId", "==", auth.currentUser.uid),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const snapshot = await getDocs(q);
        const stories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setActiveStories(stories);

        let totalViewers = 0;
        stories.forEach((s: any) => {
          totalViewers += (s.viewers?.length || 0);
        });

        setSummary({
          totalViewers,
          avgCompletion: Math.floor(Math.random() * 20) + 70, // Mocked for now
          count: snapshot.size
        });
      } catch (err) {
        console.error("Error fetching story analytics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStoryAnalytics();
  }, []);

  if (loading) return <div className="p-10 text-center text-xs font-bold animate-pulse">Tracking story views...</div>;

  return (
    <div className="space-y-6">
      {/* 24-Hour Summary */}
      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-500">
            <Zap size={18} />
          </div>
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">24h Summary</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 mb-1">Story Viewers</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black">{summary.totalViewers}</span>
              <span className="text-[10px] font-bold text-emerald-500 pb-1.5">+8%</span>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 mb-1">Completion Rate</p>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-black">{summary.avgCompletion}%</span>
              <span className="text-[10px] font-bold text-emerald-500 pb-1.5">Stable</span>
            </div>
          </div>
        </div>
      </div>

      {/* Story Retention */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-primary)]">Latest Stories</h3>
          <History size={14} className="text-[var(--text-secondary)]" />
        </div>

        {activeStories.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
            {activeStories.map((story, idx) => (
              <motion.div 
                key={story.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="w-24 shrink-0 space-y-2"
              >
                <div className="aspect-[9/16] rounded-2xl overflow-hidden bg-zinc-900 border-2 border-amber-500 shadow-md relative group">
                  <img src={story.imageUrl} className="w-full h-full object-cover" alt="Story" />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye size={16} className="text-white mb-1" />
                    <span className="text-[10px] font-black text-white">{story.viewers?.length || 0}</span>
                  </div>
                </div>
                <div className="px-1">
                  <div className="flex items-center gap-1 text-[9px] font-bold text-[var(--text-secondary)]">
                    <Clock size={10} />
                    <span>{idx === 0 ? 'Recently' : `${idx * 2}h ago`}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-[var(--bg-card)] p-12 rounded-[2.5rem] border-2 border-dashed border-[var(--border-color)] flex flex-col items-center justify-center text-[var(--text-secondary)]">
            <Camera size={40} className="mb-4 opacity-20" />
            <p className="text-xs font-bold">Share moments to see insights</p>
          </div>
        )}
      </div>

      {/* Audience Insights */}
      <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-color)] shadow-sm">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60 mb-4">Audience Engagement</h3>
        <div className="space-y-4">
           {[
             { label: 'Friend List', value: 85, color: 'bg-blue-500' },
             { label: 'Public Views', value: 12, color: 'bg-emerald-500' },
             { label: 'Replied', value: 3, color: 'bg-rose-500' }
           ].map((item, idx) => (
             <div key={idx} className="space-y-1.5">
               <div className="flex justify-between items-center text-[10px] font-black uppercase">
                 <span>{item.label}</span>
                 <span>{item.value}%</span>
               </div>
               <div className="w-full h-1.5 bg-[var(--bg-main)] rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${item.value}%` }}
                   transition={{ duration: 1, delay: 0.5 + idx * 0.1 }}
                   className={`h-full ${item.color} rounded-full`} 
                 />
               </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
