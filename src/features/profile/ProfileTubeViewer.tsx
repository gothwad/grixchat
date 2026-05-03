import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, MoreVertical, Play, Edit2, Trash2, X } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';

export default function ProfileTubeViewer() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startVideoId = searchParams.get('videoId');
  
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [menuVideoId, setMenuVideoId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const videoRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  const isOwner = auth.currentUser?.uid === userId;

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
    if (!loading && startVideoId) {
      if (videoRefs.current[startVideoId]) {
        videoRefs.current[startVideoId]?.scrollIntoView({ behavior: 'auto' });
      }
    }
  }, [loading, startVideoId]);

  // Set up Intersection Observer for autoplay on scroll
  useEffect(() => {
    if (loading || videos.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: '-25% 0px -25% 0px', // Targets the middle half of the viewport
      threshold: 0.5 // Requires the video to be at least 50% visible in that zone
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // Find the entry that is most visible in the target zone
      const intersecting = entries.filter(e => e.isIntersecting);
      if (intersecting.length > 0) {
        // Sort by intersection ratio to pick the most centered one if multiple
        const bestEntry = intersecting.reduce((prev, current) => 
          (prev.intersectionRatio > current.intersectionRatio) ? prev : current
        );
        const videoId = bestEntry.target.getAttribute('data-video-id');
        if (videoId) {
          setActiveVideoId(videoId);
        }
      }
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);

    // Observe all video containers
    Object.values(videoRefs.current).forEach(container => {
      if (container instanceof HTMLElement) {
        observer.observe(container);
      }
    });

    return () => observer.disconnect();
  }, [loading, videos]);

  const handleDelete = async (videoId: string) => {
    if (!window.confirm("Are you sure you want to delete this video?")) return;
    try {
      await deleteDoc(doc(db, "tube_videos", videoId));
      setVideos(prev => prev.filter(v => v.id !== videoId));
      setMenuVideoId(null);
    } catch (err) {
      console.error("Error deleting video:", err);
    }
  };

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex items-center gap-3 z-50 shrink-0 border-b border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-[var(--header-text)] capitalize">Tube Viewer</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : videos.length > 0 ? (
          <div className="flex flex-col gap-px bg-[var(--border-color)]/10">
            {videos.map((video) => {
              const youtubeId = extractYoutubeId(video.youtubeUrl);
              const isActive = activeVideoId === video.id;

              return (
                <motion.div 
                  key={video.id} 
                  ref={el => videoRefs.current[video.id] = el}
                  data-video-id={video.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-[var(--bg-main)] p-4 border-b border-[var(--border-color)]/5"
                >
                  <div className="relative aspect-video rounded-2xl overflow-hidden mb-3 shadow-md border border-[var(--border-color)]/20 bg-black">
                    {isActive && youtubeId ? (
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
                      <>
                        <img 
                          src={video.thumbnail} 
                          className="w-full h-full object-cover" 
                          alt={video.title} 
                          referrerPolicy="no-referrer" 
                        />
                        <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                          {video.duration || '0:00'}
                        </span>
                        <div 
                          className="absolute inset-0 flex items-center justify-center bg-black/10 transition-opacity cursor-pointer"
                          onClick={() => setActiveVideoId(video.id)}
                        >
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 group active:scale-95 transition-transform">
                            <Play className="text-white fill-current" size={28} />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <img src={video.userAvatar} className="w-10 h-10 rounded-full border border-[var(--border-color)] shrink-0" alt={video.userName} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[15px] font-bold text-[var(--text-primary)] leading-tight mb-1 line-clamp-2">
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
                    {isOwner && (
                      <div className="relative shrink-0">
                        <button 
                          onClick={() => setMenuVideoId(menuVideoId === video.id ? null : video.id)}
                          className="p-2 text-[var(--text-secondary)] hover:bg-black/5 rounded-full transition-colors"
                        >
                          <MoreVertical size={18} />
                        </button>
                        
                        <AnimatePresence>
                          {menuVideoId === video.id && (
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.95, y: -10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: -10 }}
                              className="absolute right-0 top-full mt-1 w-36 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-xl z-[60] overflow-hidden"
                            >
                              <button 
                                onClick={() => navigate(`/tube/edit/${video.id}`)}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-2 transition-colors"
                              >
                                <Edit2 size={14} className="text-blue-500" />
                                <span>Edit Video</span>
                              </button>
                              <button 
                                onClick={() => handleDelete(video.id)}
                                className="w-full px-4 py-2.5 text-left text-xs font-bold text-red-500 hover:bg-red-50/10 flex items-center gap-2 transition-colors border-t border-[var(--border-color)]/5"
                              >
                                <Trash2 size={14} />
                                <span>Delete</span>
                              </button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <p className="text-sm font-bold uppercase tracking-wider">No videos found</p>
          </div>
        )}
      </div>
      
      {/* Tap outside menu closer */}
      {menuVideoId && (
        <div className="fixed inset-0 z-50" onClick={() => setMenuVideoId(null)} />
      )}
    </div>
  );
}
