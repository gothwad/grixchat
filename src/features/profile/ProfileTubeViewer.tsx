import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, MoreVertical, Play } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'motion/react';

export default function ProfileTubeViewer() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startVideoId = searchParams.get('videoId');
  
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchVideos = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "tube_videos"), 
          where("userId", "==", userId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const fetchedVideos = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setVideos(fetchedVideos);
      } catch (err) {
        console.error("Error fetching viewer videos:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [userId]);

  // Scroll to the start video once loaded
  useEffect(() => {
    if (!loading && startVideoId && videoRefs.current[startVideoId]) {
      videoRefs.current[startVideoId]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, startVideoId]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex items-center gap-3 z-50 shrink-0 border-b border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-[var(--header-text)] capitalize">Tube</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : videos.length > 0 ? (
          <div className="flex flex-col gap-px bg-[var(--border-color)]/10">
            {videos.map((video) => (
              <motion.div 
                key={video.id} 
                ref={el => videoRefs.current[video.id] = el}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-[var(--bg-main)] p-4 cursor-pointer"
                onClick={() => navigate(`/tube?videoId=${video.id}`)}
              >
                <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-sm border border-[var(--border-color)]/20">
                  <img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} referrerPolicy="no-referrer" />
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                    {video.duration || '0:00'}
                  </span>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 opacity-0 hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Play className="text-white fill-current" size={24} />
                    </div>
                  </div>
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
                      <span>{video.views || 0} views</span>
                      <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                      <span>{video.createdAt ? formatDistanceToNow(video.createdAt.toDate(), { addSuffix: true }) : 'just now'}</span>
                    </div>
                  </div>
                  <button className="p-1 text-[var(--text-secondary)] shrink-0"><MoreVertical size={16} /></button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <p className="text-sm font-bold">No videos found</p>
          </div>
        )}
      </div>
    </div>
  );
}
