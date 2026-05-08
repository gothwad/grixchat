import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { X, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WatchTogetherProps {
  url: string;
  chatId: string;
  currentUserId: string;
  watchState: any;
  updateWatchState: (updates: any) => Promise<void>;
  onClose: () => void;
}

export default function WatchTogether({ 
  url, 
  chatId, 
  currentUserId, 
  watchState, 
  updateWatchState, 
  onClose 
}: WatchTogetherProps) {
  const playerRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [localPlaying, setLocalPlaying] = useState(true);
  const lastSyncTimeRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);

  // Sync with incoming Firestore state
  useEffect(() => {
    if (!watchState || !isReady || !playerRef.current) return;
    
    // Only sync if I am NOT the one who updated the state last
    if (watchState.updatedBy !== currentUserId) {
      const myTime = playerRef.current.getCurrentTime();
      const serverTime = watchState.currentTime || 0;
      
      // If skew is more than 3 seconds, force seek
      if (Math.abs(myTime - serverTime) > 3) {
        console.log("Syncing to server time:", serverTime);
        playerRef.current.seekTo(serverTime, 'seconds');
      }

      if (watchState.isPlaying !== undefined && watchState.isPlaying !== localPlaying) {
        setLocalPlaying(watchState.isPlaying);
      }
    }
  }, [watchState?.currentTime, watchState?.isPlaying, isReady, currentUserId]);

  const handleProgress = (state: any) => {
    const currentTime = state.playedSeconds;
    
    // Detect manual seek if the jump is significant and we are the owner of the session
    // Or just update our state if we move.
    if (watchState?.updatedBy === currentUserId) {
      // Check for seek (jump > 2 seconds)
      if (Math.abs(currentTime - lastTimeRef.current) > 2 && !isSeekingRef.current) {
        console.log("Seek detected via progress:", currentTime);
        updateWatchState({ 
          currentTime: currentTime,
          isPlaying: localPlaying
        });
      }

      // Periodic sync (every 5 seconds)
      const now = Date.now();
      if (now - lastSyncTimeRef.current > 5000) {
        updateWatchState({ currentTime: currentTime });
        lastSyncTimeRef.current = now;
      }
    }
    
    lastTimeRef.current = currentTime;
  };

  const syncNow = () => {
    if (watchState?.currentTime !== undefined && playerRef.current) {
      playerRef.current.seekTo(watchState.currentTime, 'seconds');
    }
  };

  const Player = ReactPlayer as any;

  return (
    <motion.div 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="w-full bg-black relative z-[45] shadow-inner overflow-hidden flex flex-col"
    >
      <div className="aspect-video w-full max-h-[35dvh] bg-zinc-900 flex items-center justify-center relative group">
        <Player
          ref={playerRef}
          url={url}
          width="100%"
          height="100%"
          playing={localPlaying}
          controls={true}
          onReady={() => setIsReady(true)}
          onProgress={handleProgress}
          onPlay={() => {
            setLocalPlaying(true);
            updateWatchState({ isPlaying: true });
          }}
          onPause={() => {
            setLocalPlaying(false);
            updateWatchState({ isPlaying: false });
          }}
          // We omit onSeek here to avoid React 19 "Unknown event handler property" warning
          // Seeking is detected via onProgress jump check above
          config={{
            youtube: {
              embedOptions: {
                showinfo: 0,
                rel: 0,
                modestbranding: 1
              }
            }
          }}
        />
        <button 
          onClick={onClose}
          className="absolute top-2 left-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-50 backdrop-blur-md border border-white/20 active:scale-90"
        >
          <X size={16} />
        </button>
      </div>
      
      <div className="px-4 py-2 bg-black border-t border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-[9px] text-white font-black uppercase tracking-[0.2em]">Watch Party</span>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={syncNow}
            className="text-[9px] font-bold text-white/40 hover:text-white transition-colors uppercase flex items-center gap-1 active:scale-95"
          >
            <RotateCcw size={10} />
            Force Sync
          </button>
        </div>
      </div>
    </motion.div>
  );
}
