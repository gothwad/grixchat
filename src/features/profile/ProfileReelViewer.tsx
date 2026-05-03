import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, Play } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { motion } from 'motion/react';

export default function ProfileReelViewer() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startReelId = searchParams.get('reelId');
  
  const [reels, setReels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const reelRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchReels = async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, "reels"), 
          where("userUid", "==", userId),
          orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const fetchedReels = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
        setReels(fetchedReels);
      } catch (err) {
        console.error("Error fetching viewer reels:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReels();
  }, [userId]);

  // Scroll to the start reel once loaded
  useEffect(() => {
    if (!loading && startReelId && reelRefs.current[startReelId]) {
      reelRefs.current[startReelId]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, startReelId]);

  return (
    <div className="h-full flex flex-col bg-black overflow-hidden font-sans">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 px-4 h-14 flex items-center gap-3 z-50 shrink-0 bg-gradient-to-b from-black/60 to-transparent">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={22} className="text-white" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-white capitalize">Reels</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto snap-y snap-mandatory no-scrollbar pb-10">
        {loading ? (
          <div className="h-[200px] flex items-center justify-center bg-black">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
          </div>
        ) : reels.length > 0 ? (
          <div className="flex flex-col">
            {reels.map((reel) => (
              <div 
                key={reel.id} 
                ref={el => reelRefs.current[reel.id] = el}
                className="h-screen w-full snap-start relative bg-zinc-900"
                onClick={() => navigate(`/reels/watch/${reel.id}`)}
              >
                <img 
                  src={reel.cover || reel.videoUrl} 
                  className="w-full h-full object-cover" 
                  alt="Reel"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                    <Play className="text-white fill-current" size={32} />
                  </div>
                </div>
                <div className="absolute bottom-20 left-4 right-4 text-white">
                  <p className="text-sm font-bold line-clamp-2">{reel.caption}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-white">
            <p className="text-sm font-bold">No reels found</p>
          </div>
        )}
      </div>
    </div>
  );
}

