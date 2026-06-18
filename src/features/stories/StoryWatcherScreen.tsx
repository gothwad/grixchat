import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { X, Loader2, Music, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Avatar from '../../components/common/Avatar';

export default function StoryWatcherScreen() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pressTimerRef = useRef<any>(null);
  const isLongPressRef = useRef(false);

  useEffect(() => {
    if (!userId || !supabase) return;

    const fetchStories = async () => {
      try {
        const { data, error } = await supabase
          .from('stories')
          .select('*, users:user_id(username, photo_url)')
          .eq('user_id', userId)
          .order('created_at', { ascending: true });
        
        if (!error && data) {
          setStories(data.map(s => ({
            ...s,
            username: s.users?.username || 'User',
            photoURL: s.users?.photo_url || '',
            imageUrl: s.media_url
          })));

          if (data.length === 0) {
            navigate('/chats');
          }
        } else {
          navigate('/chats');
        }
      } catch (err) {
        console.error('Error fetching stories for watcher:', err);
        navigate('/chats');
      } finally {
        setLoading(false);
      }
    };

    fetchStories();
  }, [userId]);

  // Handle active story music track playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const currentStory = stories[currentIndex];
    const trackUrl = currentStory?.music_url;
    
    if (trackUrl) {
      const audio = new Audio(trackUrl);
      audio.volume = 0.5;
      audio.loop = true;
      audioRef.current = audio;
      
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.log("Audio autoplay was prevented/interrupted: ", err);
        });
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentIndex, stories]);

  // Handle pausing of audio playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPaused) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isPaused]);

  // Auto-advance tracking with granular 50ms pauseable frame steps
  useEffect(() => {
    if (stories.length === 0 || isPaused) return;

    setProgress(0);
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNext();
          return 100;
        }
        return prev + 1;
      });
    }, 50); // 50ms * 100 = 5000ms (5s duration per story item)

    return () => clearInterval(interval);
  }, [currentIndex, stories, isPaused]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      navigate('/chats');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handlePointerDown = () => {
    isLongPressRef.current = false;
    setIsPaused(true);
    pressTimerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    }, 250);
  };

  const handlePointerUp = (action: 'prev' | 'next') => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    setIsPaused(false);
    if (!isLongPressRef.current) {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
      if (action === 'prev') handlePrev();
      else handleNext();
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <Loader2 className="text-white animate-spin" size={48} />
      </div>
    );
  }

  const currentStory = stories[currentIndex];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans select-none">
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 px-2 flex gap-1 z-20">
        {stories.map((_, idx) => {
          let barWidth = '0%';
          if (idx < currentIndex) barWidth = '100%';
          else if (idx === currentIndex) barWidth = `${progress}%`;

          return (
            <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all ease-linear"
                style={{ 
                  width: barWidth,
                  transitionDuration: idx === currentIndex ? '50ms' : '0ms'
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Avatar url={currentStory?.photoURL} name={currentStory?.username} size="sm" className="border border-white/20" />
          <span className="text-white font-extrabold text-xs tracking-wider">@{currentStory?.username}</span>
        </div>
        <button onClick={() => navigate('/chats')} className="text-white p-1 hover:bg-white/10 rounded-full transition-all cursor-pointer">
          <X size={24} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          {currentStory?.type === 'text' ? (
            <motion.div
              key={currentStory.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              style={{ background: currentStory.bg_color || '#111' }}
              className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
            >
              <p className={`text-white text-[24px] font-black leading-snug max-w-md ${currentStory.filter_applied || 'font-sans'}`} style={{ textShadow: '0 2px 10px rgba(0,0,0,0.4)' }}>
                {currentStory.text_content}
              </p>
            </motion.div>
          ) : (
            <motion.img 
              key={currentStory?.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              src={currentStory?.imageUrl} 
              className={`w-full h-full object-contain`}
              style={{ filter: currentStory?.filter_applied || 'none' }}
            />
          )}
        </AnimatePresence>

        {/* Music Indicator Layer */}
        {currentStory?.music_title && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md rounded-full py-2 px-5 flex items-center gap-2.5 border border-white/20 z-30 max-w-[300px] shadow-lg select-none">
            <Volume2 size={13} className="text-emerald-400 animate-pulse shrink-0" />
            
            {/* Equalizer wave micro-animations */}
            <div className="flex items-end gap-[2px] h-3 w-5 shrink-0 select-none mr-0.5">
              <span className="w-[2px] bg-emerald-400 rounded-full h-full animate-bounce" style={{ animationDuration: '0.6s' }} />
              <span className="w-[2px] bg-emerald-400 rounded-full h-2/3 animate-bounce" style={{ animationDuration: '0.8s', animationDelay: '0.1s' }} />
              <span className="w-[2px] bg-emerald-400 rounded-full h-1/2 animate-bounce" style={{ animationDuration: '0.5s', animationDelay: '0.2s' }} />
            </div>

            <div className="min-w-0 flex flex-col">
              <span className="text-[10px] font-black tracking-tight text-white truncate max-w-[140px] leading-none">
                {currentStory.music_title}
              </span>
              <span className="text-[8px] text-zinc-400 truncate max-w-[140px] leading-none mt-0.5">
                {currentStory.music_artist || 'Ambient Soundtrack'}
              </span>
            </div>
          </div>
        )}

        {/* Navigation Overlays */}
        <div className="absolute inset-0 flex">
          <div 
            className="flex-1 cursor-w-resize" 
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp('prev')}
            onPointerLeave={() => setIsPaused(false)}
          />
          <div 
            className="flex-1 cursor-e-resize" 
            onPointerDown={handlePointerDown}
            onPointerUp={() => handlePointerUp('next')}
            onPointerLeave={() => setIsPaused(false)}
          />
        </div>
      </div>
    </div>
  );
}
