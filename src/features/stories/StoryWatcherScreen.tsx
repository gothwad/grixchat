import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from '../../services/firebase.ts';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StoryWatcherScreen() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [stories, setStories] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const q = query(
      collection(db, "stories"),
      where("userId", "==", userId)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort by timestamp
      list.sort((a: any, b: any) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
      setStories(list);
      setLoading(false);
      
      if (list.length === 0) {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (stories[currentIndex] && auth.currentUser) {
      const storyId = stories[currentIndex].id;
      const viewers = stories[currentIndex].viewers || [];
      if (!viewers.includes(auth.currentUser.uid)) {
        updateDoc(doc(db, "stories", storyId), {
          viewers: arrayUnion(auth.currentUser.uid)
        });
      }
    }
  }, [currentIndex, stories]);

  // Auto-advance
  useEffect(() => {
    if (stories.length > 0) {
      const timer = setTimeout(() => {
        handleNext();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, stories]);

  const handleNext = () => {
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      navigate('/');
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
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
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Progress Bars */}
      <div className="absolute top-4 left-0 right-0 px-2 flex gap-1 z-20">
        {stories.map((_, idx) => (
          <div key={idx} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-white transition-all duration-[5000ms] ease-linear ${idx < currentIndex ? 'w-full' : idx === currentIndex ? 'w-full' : 'w-0'}`}
              style={{ transitionDuration: idx === currentIndex ? '5000ms' : '0ms' }}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-8 left-0 right-0 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img 
            src={currentStory?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
            className="w-10 h-10 rounded-full border border-white/20"
            referrerPolicy="no-referrer"
          />
          <span className="text-white font-bold text-sm">{currentStory?.username}</span>
        </div>
        <button onClick={() => navigate('/')} className="text-white">
          <X size={28} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.img 
            key={currentStory?.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            src={currentStory?.imageUrl} 
            className="w-full h-full object-contain"
          />
        </AnimatePresence>

        {/* Navigation Overlays */}
        <div className="absolute inset-0 flex">
          <div className="flex-1" onClick={handlePrev} />
          <div className="flex-1" onClick={handleNext} />
        </div>
      </div>
    </div>
  );
}
