import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  MoreVertical, 
  Music, 
  Share2,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  Pause,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../services/firebase';
import { doc, onSnapshot, updateDoc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { useAuth } from '../../providers/AuthProvider';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export default function ReelWatcherScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [liked, setLiked] = useState(false);
  const [muted, setMuted] = useState(true);
  const [reel, setReel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Video Player State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playerReady, setPlayerReady] = useState(false);
  
  const playerRef = useRef<any>(null);
  const nativeVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load YouTube API (only if needed)
  useEffect(() => {
    if (reel?.youtubeId && !window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [reel]);

  // Fetch Reel Data
  useEffect(() => {
    if (!id) return;

    const unsubscribe = onSnapshot(doc(db, 'reels', id), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setReel({ id: docSnap.id, ...data });
        if (user && data.likedBy && data.likedBy.includes(user.uid)) {
          setLiked(true);
        } else {
          setLiked(false);
        }
      } else {
        navigate('/reels');
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reel:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, user, navigate]);

  // Native Video Event Handlers
  const handleTimeUpdate = () => {
    if (nativeVideoRef.current) {
      setCurrentTime(nativeVideoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (nativeVideoRef.current) {
      setDuration(nativeVideoRef.current.duration);
      setPlayerReady(true);
      setIsPlaying(true);
    }
  };

  // YouTube Initialize Player
  useEffect(() => {
    if (!reel || !reel.youtubeId || !window.YT || playerRef.current) return;

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('youtube-player', {
        videoId: reel.youtubeId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          loop: 1,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          showinfo: 0,
          mute: muted ? 1 : 0,
          playsinline: 1
        },
        events: {
          onReady: (event: any) => {
            setPlayerReady(true);
            setDuration(event.target.getDuration());
            setIsPlaying(true);
            event.target.playVideo();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
            } else if (event.data === window.YT.PlayerState.ENDED) {
              event.target.playVideo(); // Loop
            }
          }
        }
      });
    };

    if (window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [reel, muted]);

  // YouTube Progress Tracking
  useEffect(() => {
    if (!reel?.youtubeId) return;
    const interval = setInterval(() => {
      if (playerRef.current && playerReady && isPlaying && typeof playerRef.current.getCurrentTime === 'function') {
        try {
          setCurrentTime(playerRef.current.getCurrentTime());
        } catch (e) {
          console.warn("Error getting current time:", e);
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isPlaying, playerReady, reel]);

  const togglePlay = () => {
    if (reel.videoUrl && nativeVideoRef.current) {
      if (isPlaying) {
        nativeVideoRef.current.pause();
        setIsPlaying(false);
      } else {
        nativeVideoRef.current.play();
        setIsPlaying(true);
      }
      return;
    }

    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const toggleMute = () => {
    setMuted(!muted);
    if (reel.videoUrl && nativeVideoRef.current) {
      nativeVideoRef.current.muted = !muted;
      return;
    }
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
    } else {
      playerRef.current.mute();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (reel.videoUrl && nativeVideoRef.current) {
      nativeVideoRef.current.currentTime = time;
      return;
    }
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || !id || !reel) return;
    const reelRef = doc(db, 'reels', id);
    const isCurrentlyLiked = liked;
    setLiked(!isCurrentlyLiked);
    try {
      if (isCurrentlyLiked) {
        await updateDoc(reelRef, { likes: increment(-1), likedBy: arrayRemove(user.uid) });
      } else {
        await updateDoc(reelRef, { likes: increment(1), likedBy: arrayUnion(user.uid) });
      }
    } catch (error) {
      setLiked(isCurrentlyLiked);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!reel) return null;

  return (
    <div className="h-full flex flex-col bg-black text-white relative overflow-hidden w-full font-sans">
      <SettingHeader 
        title="Reel" 
        rightElement={
          <div className="flex items-center gap-2">
            <button 
              onClick={toggleMute}
              className="p-2 hover:bg-white/10 rounded-full transition-all"
            >
              {muted ? <VolumeX size={22} /> : <Volume2 size={22} />}
            </button>
            <button className="p-2 hover:bg-white/10 rounded-full transition-all">
              <MoreVertical size={22} />
            </button>
          </div>
        }
      />

      <div className="flex-1 relative overflow-hidden bg-zinc-900" ref={containerRef}>
        {/* Loader while player/video isn't ready */}
        {!playerReady && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50">
            <Loader2 className="w-8 h-8 animate-spin text-white/50" />
          </div>
        )}

        {/* Video Player Container */}
        {reel.videoUrl ? (
          <video
            ref={nativeVideoRef}
            src={reel.videoUrl}
            className="w-full h-full object-contain"
            loop
            muted={muted}
            autoPlay
            playsInline
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onClick={togglePlay}
          />
        ) : reel.youtubeId ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
            <div id="youtube-player" className="w-full h-full scale-[1.5]"></div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs italic">
            Video missing
          </div>
        )}
        
        {/* Interaction Overlay for YouTube */}
        {reel.youtubeId && (
          <div className="absolute inset-0 z-10 bg-transparent" onClick={togglePlay}></div>
        )}

        {/* Bottom Gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90 z-20 pointer-events-none"></div>

        {/* Bottom Info */}
        <div className="absolute left-4 bottom-8 right-4 z-30 pointer-events-none">
          <div className="flex items-center gap-3 mb-4 pointer-events-auto">
            <div className="relative" onClick={() => navigate(`/user/${reel.userUid}`)}>
              <img 
                src={reel.userAvatar || "https://picsum.photos/seed/user/100/100"} 
                className="w-11 h-11 rounded-full border-2 border-white shadow-xl"
                alt="User"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-full border-2 border-black flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
            <span className="font-black text-sm uppercase tracking-tight drop-shadow-md">{reel.userName || 'User'}</span>
            <button className="bg-white text-black px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg active:scale-95">
              Follow
            </button>
          </div>
          
          <div className="flex flex-col gap-1 mb-5">
            <p className="text-sm font-bold leading-relaxed drop-shadow-xl text-white/95">
              {reel.caption}
            </p>
            {reel.description && (
              <p className="text-xs text-white/60 line-clamp-2 italic">
                {reel.description}
              </p>
            )}
            {reel.mentions && reel.mentions.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {reel.mentions.map((m: string) => (
                  <span key={m} className="text-[10px] text-blue-400 font-bold">@{m}</span>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xl w-fit px-4 py-2 rounded-2xl border border-white/20 pointer-events-auto">
            <Music size={16} className="text-white" />
            <div className="overflow-hidden w-[140px]">
              <motion.div 
                animate={{ x: [-100, 140] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest"
              >
                {reel.audio || 'Original Audio'}
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Video Controls & Interactions */}
      <div className="w-full bg-[var(--header-bg)] px-4 py-4 flex flex-col gap-4 z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] shrink-0 border-t border-[var(--border-color)] pb-safe rounded-t-[2.5rem]">
        
        {/* Progress Bar Row */}
        <div className="w-full px-2">
          <div className="flex flex-col gap-1.5">
            <input 
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-[var(--header-text)]/50">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Controls & Actions Row */}
        <div className="w-full flex items-center justify-between px-2">
          <div className="flex items-center gap-4">
            {/* Play/Pause */}
            <button 
              onClick={togglePlay}
              className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/5"
            >
              {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" className="ml-0.5" />}
            </button>

            {/* Replay */}
            <button 
              onClick={() => {
                if (reel.videoUrl && nativeVideoRef.current) {
                  nativeVideoRef.current.currentTime = 0;
                  nativeVideoRef.current.play();
                  setIsPlaying(true);
                } else if (playerRef.current) {
                  playerRef.current.seekTo(0);
                }
              }}
              className="p-2.5 text-[var(--header-text)]/60 hover:text-[var(--header-text)] transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>

          <div className="flex items-center gap-1">
            {/* Like */}
            <div className="flex flex-col items-center">
              <motion.button 
                whileTap={{ scale: 1.3 }}
                onClick={handleLike}
                className={`p-2.5 transition-all ${liked ? 'text-red-500' : 'text-[var(--header-text)]'}`}
              >
                <Heart size={26} fill={liked ? "currentColor" : "none"} strokeWidth={2.5} />
              </motion.button>
              <span className="text-[8px] font-black text-[var(--header-text)]/60 uppercase tracking-tighter">
                {reel.hideLikes ? '--' : (typeof reel.likes === 'number' ? reel.likes : 0)}
              </span>
            </div>

            {/* Comment */}
            <div className={`flex flex-col items-center ${reel.allowComments === false ? 'hidden' : ''}`}>
              <button className="p-2.5 text-[var(--header-text)]">
                <MessageCircle size={26} strokeWidth={2.5} />
              </button>
              <span className="text-[8px] font-black text-[var(--header-text)]/60 uppercase tracking-tighter">
                {typeof reel.comments === 'number' ? reel.comments : 0}
              </span>
            </div>

            {/* Share */}
            <button className="p-2.5 text-[var(--header-text)]" onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: reel.caption,
                  url: window.location.href,
                });
              }
            }}>
              <Share2 size={24} strokeWidth={2.5} />
            </button>

            {/* Rotating Profile Photo */}
            <div className="ml-2">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="w-10 h-10 rounded-full border-2 border-primary/50 p-0.5 overflow-hidden shadow-lg"
              >
                <img 
                  src={reel.cover || "https://picsum.photos/seed/audio/100/100"} 
                  className="w-full h-full rounded-full object-cover" 
                  alt="Cover" 
                />
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

