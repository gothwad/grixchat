import React, { useState, useEffect, useRef } from 'react';
import { MoreVertical, Heart, MessageCircle, Send, Music, Camera, ChevronLeft, Loader2, Volume2, VolumeX, Play } from 'lucide-react';
import TabBottom from '../../components/layout/TabBottom.tsx';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, onSnapshot, updateDoc, doc, increment, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';

export default function ReelsScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(15));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReels(reelsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLike = async (reel: any) => {
    if (!user) return;
    const isLiked = reel.likedBy?.includes(user.uid);
    const reelRef = doc(db, 'reels', reel.id);
    
    try {
      if (isLiked) {
        await updateDoc(reelRef, {
          likes: increment(-1),
          likedBy: arrayRemove(user.uid)
        });
      } else {
        await updateDoc(reelRef, {
          likes: increment(1),
          likedBy: arrayUnion(user.uid)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-black text-white">
        <Loader2 className="w-10 h-10 animate-spin text-blue-500 mb-4" />
        <span className="text-xs font-black uppercase tracking-widest opacity-50">Loading Reels...</span>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-black text-white relative overflow-hidden w-full font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full transition-all">
            <ChevronLeft size={28} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tight">Reels</h2>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setMuted(!muted)}
            className="p-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10"
          >
            {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
          <button onClick={() => navigate('/reels/create')} className="p-2.5 bg-white/10 backdrop-blur-md rounded-full border border-white/10">
            <Camera size={24} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar bg-zinc-900">
        {reels.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
              <Camera size={40} className="text-zinc-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">No Reels Yet</h3>
            <p className="text-zinc-500 text-sm mb-8 max-w-xs">Be the first one to share a short video with the world!</p>
            <button 
              onClick={() => navigate('/reels/create')}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              Create Reel
            </button>
          </div>
        ) : (
          reels.map((reel) => (
            <div key={reel.id} className="h-full w-full snap-start relative bg-zinc-950 flex items-center justify-center overflow-hidden">
              {/* Media Content */}
              {reel.videoUrl ? (
                <video
                  ref={el => videoRefs.current[reel.id] = el}
                  src={reel.videoUrl}
                  className="w-full h-full object-cover"
                  loop
                  muted={muted}
                  autoPlay
                  playsInline
                />
              ) : reel.youtubeId ? (
                <iframe
                  src={`https://www.youtube.com/embed/${reel.youtubeId}?autoplay=1&controls=0&loop=1&playlist=${reel.youtubeId}&modestbranding=1&rel=0&iv_load_policy=3&showinfo=0&mute=${muted ? 1 : 0}`}
                  className="w-full h-full border-0 pointer-events-none scale-[1.3]"
                  allow="autoplay; encrypted-media"
                  title="Reel Video"
                />
              ) : (
                <img src={reel.cover} className="w-full h-full object-cover opacity-50 blur-sm" alt="Thumbnail" />
              )}
              
              {/* Overlays */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80 z-20 pointer-events-none" />

              {/* Side Actions */}
              <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-30">
                <div className="flex flex-col items-center gap-1">
                  <motion.button 
                    whileTap={{ scale: 1.3 }}
                    onClick={() => handleLike(reel)}
                    className={`p-3 rounded-full transition-all ${reel.likedBy?.includes(user?.uid) ? 'text-red-500' : 'text-white'}`}
                  >
                    <Heart size={32} fill={reel.likedBy?.includes(user?.uid) ? "currentColor" : "none"} strokeWidth={2.5} />
                  </motion.button>
                  <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">
                    {reel.hideLikes ? '--' : (reel.likes || 0)}
                  </span>
                </div>
                
                <div className={`flex flex-col items-center gap-1 ${reel.allowComments === false ? 'opacity-30 pointer-events-none' : ''}`}>
                  <button onClick={() => navigate(`/reels/${reel.id}`)} className="p-3 text-white">
                    <MessageCircle size={32} strokeWidth={2.5} />
                  </button>
                  <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">
                    {reel.allowComments === false ? '' : (reel.comments || 0)}
                  </span>
                </div>

                <button className="p-3 text-white">
                  <Send size={32} strokeWidth={2.5} />
                </button>

                <button className="p-3 text-white">
                  <MoreVertical size={28} />
                </button>

                <div className="w-10 h-10 rounded-xl border-2 border-white/30 overflow-hidden rotate-12 shadow-xl animate-spin-slow">
                  <img src={reel.cover || reel.userAvatar} className="w-full h-full object-cover" alt="Audio" />
                </div>
              </div>

              {/* Bottom Info */}
              <div className="absolute left-4 bottom-24 right-20 z-30">
                <div className="flex items-center gap-3 mb-4">
                  <button 
                    onClick={() => navigate(`/user/${reel.userUid}`)}
                    className="relative group transition-transform active:scale-95"
                  >
                    <img 
                      src={reel.userAvatar} 
                      className="w-11 h-11 rounded-full border-2 border-white shadow-xl"
                      alt="User"
                    />
                    <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-blue-500 rounded-full border-2 border-black flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    </div>
                  </button>
                  <span className="font-black text-[15px] uppercase tracking-tight drop-shadow-md">{reel.userName}</span>
                  <button className="bg-white text-black px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-all shadow-lg active:scale-95">
                    Follow
                  </button>
                </div>
                
                <div className="flex flex-col gap-1 mb-4">
                  <p className="text-sm font-bold leading-relaxed drop-shadow-lg text-white/95">
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

                {reel.location && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-white/70 mb-4 truncate">
                    <span className="opacity-50 tracking-widest">AT</span> {reel.location}
                  </div>
                )}
                
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl w-fit px-4 py-2 rounded-2xl border border-white/20">
                  <Music size={16} className="text-white" />
                  <div className="overflow-hidden w-[140px]">
                    <motion.div 
                      animate={{ x: [-100, 140] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                      className="whitespace-nowrap text-[10px] font-black uppercase tracking-widest opacity-80"
                    >
                      {reel.audio || 'Original Audio'}
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <TabBottom />
    </div>
  );
}

