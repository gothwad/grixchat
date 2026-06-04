import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Shield, Video } from 'lucide-react';
import { CallStatus, CallType } from '../types/callTypes';
import { CallTimer } from './CallTimer';

interface CallHeaderProps {
  receiver: any;
  callStatus: CallStatus;
  timer: number;
  type: CallType;
}

export const CallHeader: React.FC<CallHeaderProps> = ({
  receiver,
  callStatus,
  timer,
  type,
}) => {
  const getSubText = () => {
    switch (callStatus) {
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Calling...';
      case 'connected':
        return 'Connected';
      case 'offline':
        return 'Offline';
      case 'ended':
        return 'Call Ended';
      case 'error':
        return 'Error Connecting';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-between pt-12 pb-6 px-6">
      
      {/* 1. Encrypted Secure Badge */}
      <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/5 select-none shrink-0">
        <Lock size={11} className="text-[#00a884]" />
        <span className="text-[9px] font-black tracking-[0.2em] uppercase text-zinc-400">
          End-To-End Encrypted
        </span>
      </div>

      {/* 2. Primary Calling Card (Avatar, Name, Timer) */}
      <div className="flex-1 flex flex-col items-center justify-center text-center w-full my-4">
        
        {/* On Voice/Audio call, we display a beautiful huge avatar with WhatsApp pulsing visual rings */}
        {type === 'voice' && (
          <div className="relative my-8 flex items-center justify-center">
            {/* Ambient Concentric Pulsing Ripples */}
            {callStatus === 'connected' && (
              <>
                <div className="absolute w-[180px] h-[180px] rounded-full border border-[#00a884]/30 animate-pulse scale-[1.1] opacity-60"></div>
                <div className="absolute w-[240px] h-[240px] rounded-full border border-[#00a884]/15 animate-pulse scale-[1.3] opacity-35"></div>
                <div className="absolute w-[300px] h-[300px] rounded-full border border-[#00a884]/5 animate-pulse scale-[1.5] opacity-25"></div>
              </>
            )}
            
            {/* Ringing/Calling dynamic active pulses */}
            {(callStatus === 'ringing' || callStatus === 'connecting') && (
              <>
                <div className="absolute w-[180px] h-[180px] rounded-full bg-[#00a884]/10 animate-ping opacity-50"></div>
                <div className="absolute w-[245px] h-[245px] rounded-full border border-white/5 animate-pulse scale-[1.2] opacity-30"></div>
              </>
            )}

            {/* Main Avatar Frame */}
            <div className={`w-36 h-36 rounded-full overflow-hidden border-4 ${
              callStatus === 'connected' ? 'border-[#00a884] shadow-[0_0_40px_rgba(0,168,132,0.25)]' : 'border-zinc-700/80 shadow-2xl'
            } transition-all duration-700 hover:scale-105 relative z-10`}>
              <img 
                src={receiver?.photoURL || receiver?.photo_url || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                className="w-full h-full object-cover"
                alt={receiver?.fullName || receiver?.full_name || 'GrixChat User'}
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        )}

        {/* Name and calling status */}
        <div className="relative z-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#e9edef] drop-shadow-md mb-1.5 uppercase">
            {receiver?.fullName || receiver?.full_name || receiver?.username || 'GrixChat User'}
          </h2>
          
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs font-bold tracking-widest uppercase ${
              callStatus === 'connected' ? 'text-[#00a884]' : 'text-zinc-400'
            }`}>
              {type === 'voice' ? 'GrixChat Voice Call' : 'GrixChat Video Call'}
            </span>
          </div>
        </div>

        {/* Connection status tracker badge */}
        <div className="mt-4 relative z-10">
          <div className="bg-black/30 backdrop-blur-md px-5 py-2 rounded-2xl border border-white/5 flex items-center gap-2.5 shadow-lg">
            <span className={`w-2 h-2 rounded-full ${
              callStatus === 'connected' 
                ? 'bg-[#00a884] animate-ping' 
                : callStatus === 'ringing' 
                  ? 'bg-yellow-400 animate-pulse'
                  : 'bg-zinc-500 animate-pulse'
            }`}></span>
            
            <span className="text-[11px] font-black uppercase text-[#e9edef] tracking-wider">
              {getSubText()}
            </span>
            
            {callStatus === 'connected' && (
              <>
                <div className="w-[1px] h-3 bg-white/15" />
                <CallTimer seconds={timer} className="text-[#00a884] font-black text-xs" />
              </>
            )}
          </div>
        </div>
        
      </div>
      
    </div>
  );
};

export default CallHeader;
