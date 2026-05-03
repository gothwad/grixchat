import React, { useState, useEffect } from 'react';
import { 
  MoreVertical,
  ChevronLeft,
  Share2,
  ThumbsUp,
  MessageCircle,
  Play,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../services/firebase.ts';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

const CATEGORIES = ['All', 'Music', 'Gaming', 'Mixes', 'Live', 'Comedy', 'Programming', 'News', 'Education', 'Vlogs'];

interface Video {
  id: string;
  title: string;
  thumbnail: string;
  youtubeUrl: string;
  userName: string;
  userAvatar: string;
  views: number;
  duration: string;
  createdAt: any;
  description: string;
}

export default function GrixTubeScreen() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'tube_videos'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const videoData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Video[];
      setVideos(videoData);
      setLoading(loading && false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredVideos = selectedCategory === 'All' 
    ? videos 
    : videos.filter(v => (v as any).category === selectedCategory);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Categories Bar */}
      <div className="shrink-0 flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar border-b border-[var(--border-color)] bg-[var(--header-bg)]">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-[var(--header-text)] text-[var(--header-bg)] shadow-sm' 
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-xs font-bold text-[var(--text-secondary)]">Loading Tube...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4 px-8 text-center text-blue-500">
            <div className="p-6 bg-[var(--bg-card)] rounded-full border border-[var(--border-color)]">
              <Play size={48} className="opacity-20" />
            </div>
            <div>
              <p className="font-black text-lg text-[var(--text-primary)]">No Videos Yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to upload a video to Tube!</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-px bg-[var(--border-color)]">
            {filteredVideos.map(video => (
              <motion.div 
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                onClick={() => navigate(`/tube/watch/${video.id}`)}
                className="bg-[var(--bg-main)] p-4 active:bg-black/5 transition-colors cursor-pointer group"
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-sm border border-[var(--border-color)]">
                  <img src={video.thumbnail} className="w-full h-full object-cover transition-transform duration-500" alt={video.title} />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                    {video.duration}
                  </span>
                </div>
                <div className="flex gap-3">
                  <img src={video.userAvatar} className="w-10 h-10 rounded-full border border-[var(--border-color)] shrink-0" alt={video.userName} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-snug mb-1 line-clamp-2">
                      {video.title}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                      <span className="font-bold">{video.userName}</span>
                      <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                      <span>{video.views} views</span>
                      <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                      <span>{video.createdAt ? formatDistanceToNow(video.createdAt.toDate(), { addSuffix: true }) : 'just now'}</span>
                    </div>
                  </div>
                  <button className="p-1 text-[var(--text-secondary)] shrink-0"><MoreVertical size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Loader2({ className, size }: { className?: string, size?: number }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      className={className}
    >
      <Play size={size} className="fill-current" />
    </motion.div>
  );
}

