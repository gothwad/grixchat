import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PhoneOff, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Volume2, 
  VolumeX,
  MoreVertical,
  RotateCw,
  Sparkles,
  Zap,
  Check,
  ShieldAlert,
  Sliders,
  AudioLines
} from 'lucide-react';
import { CallType } from '../types/callTypes';

interface CallControlPanelProps {
  type: CallType;
  isMuted: boolean;
  isVideoOff: boolean;
  isSpeakerOn: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onToggleSpeaker: () => void;
  onEndCall: () => void;
}

export const CallControlPanel: React.FC<CallControlPanelProps> = ({
  type,
  isMuted,
  isVideoOff,
  isSpeakerOn,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onEndCall,
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [hdActive, setHdActive] = useState(false);
  const [vocalFilter, setVocalFilter] = useState('Default Voice');
  const [cameraFlipped, setCameraFlipped] = useState(false);
  const [statusNotification, setStatusNotification] = useState<string | null>(null);

  const displayNotification = (text: string) => {
    setStatusNotification(text);
    setTimeout(() => {
      setStatusNotification(null);
    }, 2000);
  };

  const handleToggleHD = () => {
    setHdActive(prev => !prev);
    displayNotification(!hdActive ? "HD High-Fidelity Audio Active" : "Standard Audio Active");
  };

  const handleFlipCamera = () => {
    setCameraFlipped(prev => !prev);
    displayNotification(cameraFlipped ? "Switched to Front Camera" : "Switched to Rear Camera");
  };

  const handleSetVocalFilter = (filter: string) => {
    setVocalFilter(filter);
    displayNotification(`Voice filter set to: ${filter}`);
  };

  return (
    <div className="w-full bg-[#121b22] border-t border-white/5 select-none relative z-50 mt-auto shrink-0 pb-7 pt-4">
      
      {/* Dynamic Floating Quick Feedback Toast inside the call screen */}
      <AnimatePresence>
        {statusNotification && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="absolute top-[-50px] left-1/2 -translate-x-1/2 bg-[#00a884] text-white text-[11px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg border border-[#00a884]/20 z-[60]"
          >
            {statusNotification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Bar Button Layout */}
      <div className="max-w-xl mx-auto px-6 flex items-center justify-around">
        {/* 1. SPEAKER toggle */}
        <button 
          onClick={onToggleSpeaker}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-transparent active:scale-90 border-none cursor-pointer ${
            isSpeakerOn 
              ? 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]' 
              : 'bg-white text-zinc-900 shadow-lg shadow-white/5'
          }`}
          title={isSpeakerOn ? "Speaker Off" : "Speaker On"}
        >
          {isSpeakerOn ? <Volume2 size={20} strokeWidth={2.2} /> : <VolumeX size={20} strokeWidth={2.2} />}
        </button>

        {/* 2. VIDEO toggle (Always visible, WhatsApp lets you toggle video mid-call) */}
        <button 
          onClick={onToggleVideo}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-transparent active:scale-90 border-none cursor-pointer ${
            !isVideoOff 
              ? 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]' 
              : 'bg-[#ff3b30]/25 text-[#ff3b30] border border-[#ff3b30]/30 hover:bg-[#ff3b30]/35'
          }`}
          title={!isVideoOff ? "Turn Video Off" : "Turn Video On"}
        >
          {!isVideoOff ? <Video size={20} strokeWidth={2.2} /> : <VideoOff size={20} strokeWidth={2.2} />}
        </button>

        {/* 3. MIC toggle */}
        <button 
          onClick={onToggleMute}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-transparent active:scale-90 border-none cursor-pointer ${
            !isMuted 
              ? 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]' 
              : 'bg-[#ff3b30]/25 text-[#ff3b30] border border-[#ff3b30]/30 hover:bg-[#ff3b30]/35'
          }`}
          title={!isMuted ? "Mute Microphone" : "Unmute Microphone"}
        >
          {!isMuted ? <Mic size={20} strokeWidth={2.2} /> : <MicOff size={20} strokeWidth={2.2} />}
        </button>

        {/* 4. RED CUT/END CALL button */}
        <button 
          onClick={onEndCall}
          className="w-14 h-14 bg-[#ff3b30] hover:bg-[#e03126] text-white rounded-full flex items-center justify-center shadow-xl hover:shadow-2xl hover:shadow-[#ff3b30]/15 transition-all active:scale-90 border-none cursor-pointer"
          title="End Call"
        >
          <PhoneOff size={22} strokeWidth={2.5} className="rotate-[135deg]" />
        </button>

        {/* 5. 3-DOT MORE OPTIONS toggle */}
        <button 
          onClick={() => setShowMoreMenu(prev => !prev)}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-transparent active:scale-90 border-none cursor-pointer ${
            showMoreMenu 
              ? 'bg-[#00a884] text-white shadow-md' 
              : 'bg-[#202c33] text-[#e9edef] hover:bg-[#2a3942]'
          }`}
          title="More Actions"
        >
          <MoreVertical size={20} strokeWidth={2.2} />
        </button>
      </div>

      {/* WhatsApp clone slide-up bottom drawer menu */}
      <AnimatePresence>
        {showMoreMenu && (
          <>
            {/* Backdrop click-away trigger */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoreMenu(false)}
              className="fixed inset-0 bg-black/40 z-40 transition-opacity"
            />
            
            {/* Content box of the bottom drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 bg-[#121b22] border-t border-white/10 rounded-t-[2rem] px-6 py-6 pb-12 z-50 max-w-2xl mx-auto shadow-[0_-15px_40px_rgba(0,0,0,0.4)]"
            >
              {/* Header drag line indicator */}
              <div className="w-12 h-1.5 bg-zinc-700/60 rounded-full mx-auto mb-6 cursor-pointer" onClick={() => setShowMoreMenu(false)} />
              
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-[17px] font-black text-[#e9edef] uppercase tracking-wider flex items-center gap-2">
                  <Sliders size={18} className="text-[#00a884]" />
                  <span>Call Operations</span>
                </h3>
                <span className="text-[10px] bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/25 px-2.5 py-0.5 rounded-full font-black tracking-widest uppercase">
                  ACTIVE TUNNEL
                </span>
              </div>

              {/* Grid of Interactive Actions */}
              <div className="grid grid-cols-2 gap-3.5">
                {/* Switch Camera */}
                <div 
                  onClick={handleFlipCamera}
                  className="bg-[#202c33] hover:bg-[#2a3942] p-4 rounded-2xl cursor-pointer transition-colors flex flex-col justify-between h-[90px] border border-white/5 active:scale-[0.98]"
                >
                  <RotateCw size={18} className="text-[#00a884]" />
                  <div>
                    <h4 className="text-[13px] font-extrabold text-[#e9edef] leading-tight">Switch Camera</h4>
                    <p className="text-[10px] text-zinc-400 font-bold mt-0.5">Flip feed orientation</p>
                  </div>
                </div>

                {/* HD Stream */}
                <div 
                  onClick={handleToggleHD}
                  className={`p-4 rounded-2xl cursor-pointer transition-colors flex flex-col justify-between h-[90px] border active:scale-[0.98] ${
                    hdActive 
                      ? 'bg-[#00a884]/15 border-[#00a884] text-[#00a884]' 
                      : 'bg-[#202c33] hover:bg-[#2a3942] border-white/5 text-[#e9edef]'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <Zap size={18} className={hdActive ? 'text-[#00a884]' : 'text-zinc-400'} />
                    {hdActive && <Check size={14} className="text-[#00a884] stroke-[3]" />}
                  </div>
                  <div>
                    <h4 className="text-[13px] font-extrabold leading-tight">HD Video Calling</h4>
                    <p className={`text-[10px] font-bold mt-0.5 ${hdActive ? 'text-[#00a884]' : 'text-zinc-400'}`}>
                      {hdActive ? 'Premium HD Active' : 'Toggle extra bandwidth'}
                    </p>
                  </div>
                </div>

                {/* Voice Effects */}
                <div 
                  className="bg-[#202c33] col-span-2 p-4 rounded-2xl border border-white/5"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <AudioLines size={18} className="text-[#00a884]" />
                    <h4 className="text-[13px] font-extrabold text-[#e9edef]">Active Vocal Equalizer</h4>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    {['Default Voice', 'Studio Filter', 'Ambient Clear', 'Vocal Boost'].map((filterName) => (
                      <button
                        key={filterName}
                        onClick={() => handleSetVocalFilter(filterName)}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider shrink-0 transition-all border-none ${
                          vocalFilter === filterName
                            ? 'bg-[#00a884] text-white shadow-md'
                            : 'bg-[#121b22] text-[#e9edef] hover:bg-[#1f2c34] text-zinc-300'
                        }`}
                      >
                        {filterName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Safety Encrypted Label */}
              <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] font-bold text-center text-zinc-400">
                <Sparkles size={12} className="text-[#00a884]" />
                <span className="uppercase tracking-[0.2em] text-[#00a884]">WhatsApp Clone Secure Encryption Line</span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CallControlPanel;
