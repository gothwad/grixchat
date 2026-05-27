import React, { useRef, useState, useEffect } from 'react';
import { Camera as CameraIcon, X, RefreshCw, Zap, ZapOff, Image as ImageIcon, Send, Clock, RotateCcw, Music, Sparkles } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { CAMERA_FILTERS, CameraFilter } from './utils/filters';
import FilterSelector from './components/FilterSelector';
import MusicSearchSheet from '../stories/components/MusicSearchSheet';
import { Track } from '../stories/utils/musicData';
import { ImageService } from '../../services/ImageService';

export default function CameraTab() {
  const { user: authUser } = useAuth();
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get('chatId');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  // Filters & Audio track states
  const [activeFilter, setActiveFilter] = useState<CameraFilter>(CAMERA_FILTERS[0]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showMusicSheet, setShowMusicSheet] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1080 },
          height: { ideal: 1920 }
        }
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera error:", err);
      setError("Please grant camera permission to use interactive filters.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, [isFrontCamera]);

  // Handle live snapping page background music playing
  useEffect(() => {
    if (audioPreviewRef.current) {
      audioPreviewRef.current.pause();
      audioPreviewRef.current = null;
    }

    if (selectedTrack && !capturedImage) {
      const audio = new Audio(selectedTrack.url);
      audio.volume = 0.4;
      audio.loop = true;
      audioPreviewRef.current = audio;
      audio.play().catch(err => console.log("Sound autoplay blocked or issue:", err));
    }

    return () => {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
    };
  }, [selectedTrack, capturedImage]);

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth || 1080;
      canvas.height = videoRef.current.videoHeight || 1920;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFrontCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        // Draw image with filters
        if (activeFilter.filterStyle !== 'none') {
          ctx.filter = activeFilter.filterStyle;
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setCapturedImage(dataUrl);
        
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  // Convert Base64 Data URL to File for Supabase storage
  const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  const handlePostStory = async () => {
    if (!capturedImage || !authUser || !supabase) return;
    setIsSending(true);

    try {
      const file = dataURLtoFile(capturedImage, `snap_${Date.now()}.jpg`);
      const url = await ImageService.uploadImage(file, () => {}, 'stories');

      const { error } = await supabase.from('stories').insert({
        user_id: authUser.id,
        media_url: url,
        type: 'image',
        filter_applied: activeFilter.filterStyle !== 'none' ? activeFilter.filterStyle : null,
        music_title: selectedTrack?.title || null,
        music_artist: selectedTrack?.artist || null,
        music_url: selectedTrack?.url || null
      } as any);

      if (error) throw error;
      navigate('/chats');
    } catch (err) {
      console.error("Error saving filter snap:", err);
      alert("Failed to share snap to stories.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSendToChat = async () => {
    if (!capturedImage || !chatId) return;
    const receiverId = chatId.split('_').find(id => id !== authUser?.id) || chatId.split('_')[0];
    navigate(`/chat/${receiverId}`, { state: { capturedImage } });
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden font-sans select-none">
      <AnimatePresence mode="wait">
        {!capturedImage ? (
          <motion.div 
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="h-full flex flex-col"
          >
            {/* Top Controls */}
            <div className="absolute top-0 inset-x-0 p-5 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={() => navigate(-1)}
                className="p-2.5 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all cursor-pointer"
              >
                <X size={22} />
              </button>
              
              {selectedTrack && (
                <div className="flex items-center gap-2 bg-[#0494f4]/20 border border-[#0494f4]/30 rounded-full px-3 py-1 animate-pulse">
                  <Music size={12} className="text-[#0494f4]" />
                  <span className="text-[10px] font-extrabold text-[#0494f4] truncate max-w-[120px]">
                    {selectedTrack.title}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowMusicSheet(true)}
                  className={`p-2.5 rounded-full transition-all cursor-pointer ${
                    selectedTrack ? 'bg-[#0494f4] text-white' : 'bg-black/20 text-white'
                  }`}
                >
                  <Music size={22} />
                </button>
                <button 
                  onClick={() => setFlash(!flash)}
                  className="p-2.5 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all cursor-pointer"
                >
                  {flash ? <Zap size={22} className="text-yellow-400 fill-yellow-400" /> : <ZapOff size={22} />}
                </button>
              </div>
            </div>

            {/* Live Camera Feed */}
            <div className="flex-1 relative flex items-center justify-center bg-black">
              {error ? (
                <div className="p-8 text-center text-white z-10">
                  <p className="text-white/70 mb-6 font-bold text-sm">{error}</p>
                  <button 
                    onClick={startCamera}
                    className="px-6 py-3 bg-[#0494f4] hover:bg-[#0381d6] text-white rounded-2xl font-black uppercase tracking-wider text-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Allow Camera Acccess
                  </button>
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover transition-transform duration-300 ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
                  style={{ filter: activeFilter.filterStyle }}
                />
              )}

              {/* Snapchat Face Glow Overlay indicator */}
              <div className="absolute inset-0 border-[2px] border-white/10 pointer-events-none rounded-3xl m-4" />
            </div>

            {/* Live Filter selector and Snap action bar */}
            <div className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-4 z-20 pb-8 bg-gradient-to-t from-black/80 to-transparent">
              {/* Filter Carousel Slider */}
              <FilterSelector selectedFilterId={activeFilter.id} onSelectFilter={setActiveFilter} />

              <div className="w-full flex justify-between items-center px-10">
                {/* Gallery Select */}
                <button 
                  onClick={() => {
                    const inp = document.createElement('input');
                    inp.type = 'file'; inp.accept = 'image/*';
                    inp.onchange = (e: any) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const r = new FileReader();
                        r.onload = (ev) => setCapturedImage(ev.target?.result as string);
                        r.readAsDataURL(file);
                      }
                    }; inp.click();
                  }}
                  className="p-3.5 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  <ImageIcon size={24} />
                </button>

                {/* Snap Capture Ball */}
                <button 
                  onClick={takePhoto}
                  className="w-20 h-20 rounded-full border-[6px] border-white flex items-center justify-center active:scale-90 transition-all cursor-pointer"
                >
                  <div className="w-14 h-14 bg-white rounded-full group-hover:scale-90 transition-transform" />
                </button>

                {/* Flip Cam */}
                <button 
                  onClick={() => setIsFrontCamera(!isFrontCamera)}
                  className="p-3.5 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all cursor-pointer"
                >
                  <RefreshCw size={24} />
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col relative"
          >
            <img src={capturedImage} className="w-full h-full object-cover" alt="Preview" style={{ filter: activeFilter.filterStyle }} />
            
            <div className="absolute top-0 inset-x-0 p-5 flex justify-between items-center z-20 bg-gradient-to-b from-black/80 to-transparent">
              <button 
                onClick={retake}
                className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-all flex items-center gap-2 px-4 cursor-pointer"
              >
                <RotateCcw size={18} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">Retake</span>
              </button>

              {activeFilter.id !== 'normal' && (
                <div className="flex items-center gap-1 bg-[#0494f4]/80 text-white rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider">
                  <Sparkles size={11} />
                  <span>{activeFilter.name}</span>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="absolute bottom-0 inset-x-0 p-8 flex flex-col items-center gap-3 z-20 bg-gradient-to-t from-black/80 to-transparent">
              <div className="flex gap-4 w-full justify-center">
                {chatId ? (
                  <button 
                    onClick={handleSendToChat}
                    disabled={isSending}
                    className="flex-1 max-w-xs flex items-center justify-center gap-2.5 bg-[#0494f4] hover:bg-[#0381d6] text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-2xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Send size={16} />
                    <span>Send to Chat</span>
                  </button>
                ) : (
                  <>
                    <button 
                      onClick={handlePostStory}
                      disabled={isSending}
                      className="flex-1 max-w-xs flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-[11px] shadow-2xl active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isSending ? <RefreshCw size={16} className="animate-spin" /> : <Clock size={16} />}
                      <span>Share story</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Music Selector Bottom Sheet overlay */}
      {showMusicSheet && (
        <MusicSearchSheet 
          selectedTrack={selectedTrack} 
          onSelectTrack={setSelectedTrack} 
          onClose={() => setShowMusicSheet(false)} 
        />
      )}
    </div>
  );
}
