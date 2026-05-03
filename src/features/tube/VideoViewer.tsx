import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Share2, 
  ThumbsUp, 
  MessageCircle, 
  Loader2,
  Play
} from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase.ts';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

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

export default function VideoViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'tube_videos', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVideo({ id: docSnap.id, ...docSnap.data() } as Video);
        } else {
          console.error("No such video!");
          navigate('/tube');
        }
      } catch (err) {
        console.error("Error fetching video:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideo();
  }, [id, navigate]);

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[var(--bg-main)] gap-3">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        >
          <Play size={32} className="text-blue-500 fill-current" />
        </motion.div>
        <p className="text-xs font-bold text-[var(--text-secondary)]">Loading Video...</p>
      </div>
    );
  }

  if (!video) return null;

  const youtubeId = extractYoutubeId(video.youtubeUrl);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-main)]">
      {/* Dynamic Header */}
      <div className="shrink-0 bg-[var(--header-bg)] h-14 flex items-center px-4 border-b border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-[var(--header-text)] active:bg-black/5 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h2 className="ml-2 font-bold text-[var(--header-text)] truncate flex-1">{video.title}</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-safe">
        {/* Video Player */}
        <div className="aspect-video w-full bg-black shadow-lg">
          {youtubeId ? (
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <p className="text-sm font-bold opacity-50">Invalid Video URL</p>
            </div>
          )}
        </div>
        
        {/* Metadata */}
        <div className="p-4 space-y-5">
          <h1 className="text-lg font-black leading-tight text-[var(--text-primary)]">
            {video.title}
          </h1>
          
          <div className="flex items-center justify-between bg-[var(--bg-card)]/50 p-3 rounded-2xl border border-[var(--border-color)]/20">
            <div className="flex items-center gap-3">
              <img 
                src={video.userAvatar} 
                className="w-10 h-10 rounded-full border border-[var(--border-color)] shadow-sm" 
                alt={video.userName} 
              />
              <div>
                <p className="font-bold text-[var(--text-primary)] leading-tight">{video.userName}</p>
                <p className="text-[10px] text-[var(--text-secondary)] font-medium uppercase tracking-wider">Verified Account</p>
              </div>
            </div>
            <button className="bg-[var(--text-primary)] text-[var(--bg-main)] px-5 py-2 rounded-full text-[11px] font-black tracking-widest uppercase active:scale-95 transition-transform">
              Follow
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
            <button className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-5 py-2.5 rounded-full text-xs font-bold shrink-0 active:bg-black/5 transition-colors">
              <ThumbsUp size={16} /> 
              <span>{video.views > 1000 ? (video.views/1000).toFixed(1) + 'K' : video.views}</span>
            </button>
            <button className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-5 py-2.5 rounded-full text-xs font-bold shrink-0 active:bg-black/5 transition-colors">
              <Share2 size={16} /> 
              <span>Share</span>
            </button>
            <button className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] px-5 py-2.5 rounded-full text-xs font-bold shrink-0 active:bg-black/5 transition-colors">
              <MessageCircle size={16} /> 
              <span>Comments</span>
            </button>
          </div>

          <div className="bg-[var(--bg-card)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-[11px] font-bold text-[var(--text-primary)]">
              <span>{video.views.toLocaleString()} views</span>
              <span className="w-1 h-1 bg-[var(--text-secondary)] rounded-full opacity-30" />
              <span>{video.createdAt ? formatDistanceToNow(video.createdAt.toDate(), { addSuffix: true }) : 'just now'}</span>
            </div>
            <p className="text-[13px] text-[var(--text-secondary)] font-medium leading-relaxed whitespace-pre-wrap">
              {video.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
