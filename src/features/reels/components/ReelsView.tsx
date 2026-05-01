import React, { useEffect, useState } from 'react';
import { Play, Heart, MessageCircle, Share2, Music, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';

export default function ReelsView() {
  const navigate = useNavigate();
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'reels'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reelsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setReels(reelsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching reels:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-10">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 pb-24 px-0.5 pt-0.5">
      <div className="grid grid-cols-3 gap-0.5">
        {reels.map((reel) => (
          <div 
            key={reel.id} 
            onClick={() => navigate(`/reels/watch/${reel.id}`)}
            className="aspect-[9/16] bg-[var(--bg-chat)] relative overflow-hidden group border border-[var(--border-color)]/20 cursor-pointer"
          >
            <img 
              src={reel.cover} 
              className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-500" 
              referrerPolicy="no-referrer"
              alt="Reel Cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex flex-col justify-end p-3">
              <div className="flex items-center gap-1.5 text-white/95">
                <Play size={12} fill="currentColor" className="drop-shadow-lg" />
                <span className="text-[10px] font-black tracking-widest uppercase drop-shadow-lg">
                  {typeof reel.likes === 'number' ? reel.likes : 0}
                </span>
              </div>
            </div>
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20">
                <Play size={20} fill="white" className="text-white ml-1" />
              </div>
            </div>
          </div>
        ))}

        {reels.length === 0 && (
          <div className="col-span-3 py-20 text-center">
            <p className="text-[var(--text-secondary)] text-sm font-bold uppercase tracking-widest opacity-50">No reels yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
