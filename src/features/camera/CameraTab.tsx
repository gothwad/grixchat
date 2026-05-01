import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Zap, ZapOff, Image as ImageIcon, ArrowLeft, Send, Check, RotateCcw } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { db, auth } from '../../services/firebase.ts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function CameraTab() {
  const [searchParams] = useSearchParams();
  const chatId = searchParams.get('chatId');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(false);
  const [flash, setFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const navigate = useNavigate();

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const constraints = {
        video: {
          facingMode: isFrontCamera ? 'user' : 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
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
      setError("Could not access camera. Please ensure you have granted permission.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isFrontCamera]);

  const toggleCamera = () => {
    setIsFrontCamera(!isFrontCamera);
  };

  const takePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFrontCamera) {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedImage(dataUrl);
        // Stop camera stream when previewing
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
          setStream(null);
        }
      }
    }
  };

  const handleSend = async () => {
    if (!capturedImage || !chatId) return;
    
    // Pass the captured image back to the chat screen
    navigate(-1);
    // Note: Since navigate(-1) doesn't easily pass state, 
    // we'll use a custom event or just update the logic to navigate to the chat with state
    const receiverId = chatId.split('_').find(id => id !== auth.currentUser?.uid) || chatId.split('_')[0];
    navigate(`/chat/${receiverId}`, { state: { capturedImage } });
  };

  const retake = () => {
    setCapturedImage(null);
    startCamera();
  };

  const handleGalleryClick = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          setCapturedImage(event.target?.result as string);
          if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="h-full bg-black flex flex-col relative overflow-hidden">
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
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
              <button 
                onClick={() => navigate(-1)}
                className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all"
              >
                <X size={24} />
              </button>
              <button 
                onClick={() => setFlash(!flash)}
                className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all"
              >
                {flash ? <Zap size={24} className="text-yellow-400 fill-yellow-400" /> : <ZapOff size={24} />}
              </button>
            </div>

            {/* Camera View */}
            <div className="flex-1 relative flex items-center justify-center">
              {error ? (
                <div className="p-8 text-center">
                  <p className="text-white/70 mb-6 font-medium">{error}</p>
                  <button 
                    onClick={startCamera}
                    className="px-6 py-3 bg-primary text-white rounded-2xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <video 
                  ref={videoRef}
                  autoPlay 
                  playsInline 
                  muted
                  className={`w-full h-full object-cover ${isFrontCamera ? 'scale-x-[-1]' : ''}`}
                />
              )}
            </div>

            {/* Bottom Controls */}
            <div className="absolute bottom-0 inset-x-0 p-10 flex justify-between items-center z-10 bg-gradient-to-t from-black/50 to-transparent">
              <button 
                onClick={handleGalleryClick}
                className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
              >
                <ImageIcon size={28} />
              </button>

              <button 
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center active:scale-90 transition-all"
              >
                <div className="w-16 h-16 bg-white rounded-full" />
              </button>

              <button 
                onClick={toggleCamera}
                className="p-3 bg-white/10 backdrop-blur-md rounded-full text-white hover:bg-white/20 transition-all"
              >
                <RefreshCw size={28} />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="preview"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full flex flex-col relative"
          >
            <img src={capturedImage} className="w-full h-full object-cover" alt="Preview" />
            
            <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-center z-10 bg-gradient-to-b from-black/50 to-transparent">
              <button 
                onClick={retake}
                className="p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-all flex items-center gap-2 px-4"
              >
                <RotateCcw size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Retake</span>
              </button>
            </div>

            <div className="absolute bottom-0 inset-x-0 p-10 flex justify-center items-center z-10 bg-gradient-to-t from-black/50 to-transparent">
              <button 
                onClick={handleSend}
                disabled={isSending}
                className="flex items-center gap-3 bg-primary text-white px-8 py-4 rounded-full font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/40 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSending ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send size={20} />
                    <span>Send to Chat</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
