import React from 'react';
import { motion } from 'motion/react';
import { VideoOff } from 'lucide-react';
import { CallStatus } from '../types/callTypes';
import { CallTimer } from './CallTimer';

interface VideoFeedProps {
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  isVideoOff: boolean;
  callStatus: CallStatus;
  timer: number;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  localVideoRef,
  remoteVideoRef,
  isVideoOff,
  callStatus,
  timer,
}) => {
  return (
    <div className="absolute inset-0 z-0 bg-black">
      <video 
        ref={remoteVideoRef as any} 
        autoPlay 
        playsInline 
        className="w-full h-full object-cover transition-opacity duration-700"
      />
      
      {/* Local Video Overlay (Pip) */}
      <motion.div 
        drag
        dragMomentum={false}
        dragConstraints={{ left: -200, right: 200, top: -400, bottom: 400 }}
        className="absolute top-10 right-6 w-32 h-48 bg-zinc-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-move"
      >
        <video 
          ref={localVideoRef as any} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
        />
        {isVideoOff && (
          <div className="w-full h-full flex items-center justify-center bg-zinc-900">
            <VideoOff size={28} className="text-zinc-600" />
          </div>
        )}
      </motion.div>
      
      {/* Status Overlay for Video Call */}
      <div className="absolute top-10 left-6 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-sm">
        <div className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-100">
          {callStatus === 'connected' ? (
            <CallTimer seconds={timer} className="text-emerald-400" />
          ) : (
            callStatus.toUpperCase()
          )}
        </span>
      </div>
    </div>
  );
};

export default VideoFeed;
