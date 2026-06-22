import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { X, Loader2, Music, Volume2, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Avatar from '../../components/common/Avatar';

export default function StoryWatcherScreen() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, userData } = useAuth();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  
  const [isPaused, setIsPaused] = useState(false);
  const [showViewsSheet, setShowViewsSheet] = useState(false);
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

  // Handle story view registration (record view automatically on mount or when index changes)
  useEffect(() => {
    const activeStory = stories[currentIndex];
    if (!supabase || !authUser?.id || !activeStory || activeStory.user_id === authUser.id) return;

    const recordStoryView = async () => {
      try {
        await supabase.rpc('view_story', {
          story_id_param: activeStory.id,
          viewer_id_param: authUser.id,
          viewer_username_param: userData?.username || authUser.email?.split('@')[0] || 'User',
          viewer_fullname_param: userData?.fullName || '',
          viewer_photo_url_param: userData?.photoURL || ''
        });
      } catch (err) {
        console.warn('Failed to register story view via RPC:', err);
      }
    };

    recordStoryView();
  }, [currentIndex, stories, authUser?.id, userData]);

  // Handle pausing of audio playback
  useEffect(() => {
    if (!audioRef.current) return;
    if (isPaused || showViewsSheet) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
  }, [isPaused, showViewsSheet]);

  // Auto-advance tracking with granular 50ms pauseable frame steps
  useEffect(() => {
    if (stories.length === 0 || isPaused || showViewsSheet) return;

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
  }, [currentIndex, stories, isPaused, showViewsSheet]);

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

        {/* Views Indicator (only for current user's own stories) */}
        {currentStory?.user_id === authUser?.id && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowViewsSheet(true);
              }}
              className="flex items-center gap-2 bg-black/60 hover:bg-black/80 active:scale-95 transition-all text-white px-5 py-2.5 rounded-full border border-white/10 shadow-lg backdrop-blur-md cursor-pointer select-none"
            >
              <Eye size={15} className="text-sky-400 animate-pulse" />
              <span className="text-[11px] font-bold tracking-wide">
                {Array.isArray(currentStory?.views) ? currentStory.views.length : 0} Views
              </span>
            </button>
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

      {/* WhatsApp-style Bottom Sheet for Viewers list */}
      <AnimatePresence>
        {showViewsSheet && (
          <>
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowViewsSheet(false)}
              className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
            />
            
            {/* Slide-up Sheet */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[60%] bg-[#121214] border-t border-white/10 rounded-t-[24px] overflow-hidden flex flex-col z-50 shadow-2xl safe-bottom"
            >
              {/* Drag Handle indicator */}
              <div className="w-full flex justify-center py-3 select-none">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>

              {/* Title Header */}
              <div className="px-6 pb-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="text-sky-400" size={18} />
                  <span className="text-white font-extrabold text-sm tracking-wide">
                    Viewer List ({Array.isArray(currentStory?.views) ? currentStory.views.length : 0})
                  </span>
                </div>
                <button 
                  onClick={() => setShowViewsSheet(false)}
                  className="text-white/60 hover:text-white px-2.5 py-1 text-xs font-bold"
                >
                  Close
                </button>
              </div>

              {/* Viewers List Scrollable */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar pb-8">
                {!Array.isArray(currentStory?.views) || currentStory.views.length === 0 ? (
                  <div className="text-center py-10 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-1">
                      <Eye className="text-white/20" size={20} />
                    </div>
                    <span className="text-xs text-white/40 font-bold">No views yet</span>
                    <p className="text-[10px] text-white/30 max-w-[180px] mx-auto leading-relaxed font-medium">
                      Share with more friends on GrixChat to get instant view updates.
                    </p>
                  </div>
                ) : (
                  currentStory.views.map((viewer: any, vIdx: number) => {
                    const viewTime = viewer.viewed_at ? new Date(viewer.viewed_at) : null;
                    const timeString = viewTime 
                      ? viewTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
                      : '';
                    const dateString = viewTime
                      ? viewTime.toLocaleDateString([], { month: 'short', day: 'numeric' })
                      : '';

                    return (
                      <div 
                        key={viewer.id || vIdx} 
                        className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar 
                            url={viewer.photo_url} 
                            name={viewer.full_name || viewer.username} 
                            size="sm" 
                            className="border border-white/5 shadow-inner"
                          />
                          <div className="flex flex-col">
                            <span className="text-white text-xs font-extrabold">
                              {viewer.full_name || viewer.username}
                            </span>
                            <span className="text-white/40 text-[10px] font-bold">
                              @{viewer.username}
                            </span>
                          </div>
                        </div>
                        
                        {/* Time badges */}
                        <div className="flex flex-col items-end text-right gap-0.5 opacity-80">
                          <span className="text-[10px] text-sky-400 font-extrabold flex items-center gap-1 bg-sky-500/10 px-2 py-0.5 rounded-full">
                            {timeString}
                          </span>
                          {dateString && (
                            <span className="text-[8px] text-white/30 font-bold mr-1">
                              {dateString}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
