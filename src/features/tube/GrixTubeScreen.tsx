import React, { useState, useEffect } from 'react';
import { LocalDataCache } from '../../services/LocalDataCache';
import { useLayout } from '../../contexts/LayoutContext.tsx';
import ReelsView from '../reels/components/ReelsView.tsx';
import MomentsView from '../moments/MomentsView.tsx';
import QnaView from '../qna/QnaView.tsx';
import { 
  MoreVertical,
  ChevronLeft,
  Share2,
  ThumbsUp,
  MessageCircle,
  Play,
  X,
  Grid,
  Gamepad2,
  Sliders,
  Radio,
  Smile,
  Code,
  Newspaper,
  Camera,
  Laptop,
  Sparkles,
  Trophy,
  Compass,
  Utensils,
  Wrench,
  Palette,
  Briefcase,
  Heart
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { formatDistanceToNow } from 'date-fns';

export interface Video {
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
  const { activeFilters } = useLayout();
  const activeTab = activeFilters['vibe'] || 'Videos';
  const [videos, setVideos] = useState<Video[]>(() => {
    return LocalDataCache.getTubeVideos() || [];
  });
  const [loading, setLoading] = useState(() => {
    const cached = LocalDataCache.getTubeVideos();
    return !cached || cached.length === 0;
  });

  useEffect(() => {
    if (!supabase) return;

    const fetchVideos = async () => {
      const { data, error } = await supabase
        .from('tube_videos')
        .select('*, users:user_id(username, photo_url)')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) {
        const mapped = data.map(d => ({
          ...d,
          userName: d.users?.username || 'User',
          userAvatar: d.users?.photo_url || '',
          views: (d as any).views_count || 0,
          duration: (d as any).duration || '0:00',
          createdAt: d.created_at,
          youtubeUrl: d.youtube_url
        })) as any;
        LocalDataCache.saveTubeVideos(mapped);
        setVideos(mapped);
      }
      setLoading(false);
    };

    fetchVideos();

    const channel = supabase
      .channel('tube-videos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tube_videos' }, () => {
        fetchVideos();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const filteredVideos = videos;

  if (activeTab === 'Reels') {
    return (
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[var(--bg-main)]">
        <ReelsView />
      </div>
    );
  }

  if (activeTab === 'Moments') {
    return (
      <div className="h-full w-full overflow-hidden bg-[var(--bg-main)] font-sans">
        <MomentsView />
      </div>
    );
  }

  if (activeTab === 'Q&A') {
    return (
      <div className="h-full w-full overflow-hidden bg-[var(--bg-main)] font-sans">
        <QnaView />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Video Feed View */}
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
              <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to upload a video to GrixTube!</p>
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
                    <img src={video.thumbnail} className="w-full h-full object-cover transition-transform duration-500" alt={video.title} referrerPolicy="no-referrer" />
                    <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                      {video.duration}
                    </span>
                  </div>
                  <div className="flex gap-3">
                    <img src={video.userAvatar} className="w-10 h-10 rounded-full border border-[var(--border-color)] shrink-0" alt={video.userName} referrerPolicy="no-referrer" />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-snug mb-1 line-clamp-2">
                        {video.title}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        <span className="font-bold">{video.userName}</span>
                        <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                        <span>{video.views} views</span>
                        <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                        <span>{video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : 'just now'}</span>
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

