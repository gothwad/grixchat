import React, { useEffect, useState } from 'react';
import { 
  Grid,
  Bookmark,
  UserSquare,
  Camera,
  Clapperboard,
  Upload,
  Pencil
} from 'lucide-react';
import { auth, db } from '../../services/firebase.ts';
import { doc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function ProfileTab() {
  const [userData, setUserData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts');
  const navigate = useNavigate();

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  useEffect(() => {
    if (!auth.currentUser) return;

    const docRef = doc(db, "users", auth.currentUser.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });

    return () => unsubscribe();
  }, []);

  // Fetch posts based on active tab
  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchContent = async () => {
      if (activeTab === 'posts') {
        const q = query(collection(db, "posts"), where("userId", "==", auth.currentUser?.uid));
        const snapshot = await getDocs(q);
        setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } else if (activeTab === 'saved') {
        if (userData?.savedPosts && userData.savedPosts.length > 0) {
          // Firestore 'in' query has limit of 10-30 depending on version
          const savedIds = userData.savedPosts.slice(0, 10); 
          const q = query(collection(db, "posts"), where("__name__", "in", savedIds));
          const snapshot = await getDocs(q);
          setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } else {
          setPosts([]);
        }
      } else {
        setPosts([]);
      }
    };
    
    fetchContent();
  }, [activeTab, userData?.savedPosts]);

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar">
      <div className="flex-1 pb-24">
        {/* Profile Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-6 mb-6">
            {/* Profile Picture */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full p-0.5 bg-[#375a7f]">
                <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden bg-zinc-100">
                  <img 
                    src={userData?.photoURL || DEFAULT_LOGO} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                </div>
              </div>
              <button 
                onClick={() => navigate('/edit-profile')}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[var(--primary)] text-white rounded-full border-2 border-[var(--bg-main)] flex items-center justify-center shadow-sm"
              >
                <Pencil size={12} />
              </button>
            </div>

            {/* Bio Box (Fixed height to match profile pic 80px) */}
            <div className="flex-1 bg-[var(--box-bg)] rounded-xl p-3 flex flex-col justify-center h-20 overflow-hidden">
              <p className="text-[12px] leading-tight text-[var(--box-text)] font-medium line-clamp-3">
                {userData?.bio || 'Available'}
              </p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {/* Name & Username Box */}
            <div className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col justify-center min-h-[60px] col-span-2">
              <h2 className="text-[14px] font-bold leading-tight truncate">
                {userData?.fullName || 'GrixChat User'}
              </h2>
              <p className="text-[12px] opacity-80 truncate">
                @{userData?.username || 'username'}
              </p>
            </div>

            {/* Followers Box */}
            <button 
              onClick={() => navigate(`/user/${auth.currentUser?.uid}/followers`)}
              className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col items-center justify-center min-h-[60px] active:scale-[0.98] transition-all"
            >
              <span className="text-sm font-bold">{userData?.followers?.length || 0}</span>
              <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Followers</span>
            </button>

            {/* Following Box */}
            <button 
              onClick={() => navigate(`/user/${auth.currentUser?.uid}/following`)}
              className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col items-center justify-center min-h-[60px] active:scale-[0.98] transition-all"
            >
              <span className="text-sm font-bold">{userData?.following?.length || 0}</span>
              <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Following</span>
            </button>
          </div>

          {/* Tabs Strip */}
          <div className="flex bg-[var(--box-bg)] rounded-xl mb-4 overflow-hidden h-[46px] items-stretch">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'posts' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
            >
              <Clapperboard size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('tagged')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'tagged' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
            >
              <UserSquare size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'saved' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
            >
              <Bookmark size={20} />
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div key={post.id} className="aspect-square bg-zinc-100 relative group overflow-hidden">
                <img 
                  src={post.imageUrl || `https://picsum.photos/seed/${post.id}/400/400`} 
                  className="w-full h-full object-cover"
                  alt="Post"
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="w-16 h-16 rounded-full border-2 border-[var(--text-secondary)] flex items-center justify-center mb-4">
                <Camera size={32} />
              </div>
              <p className="text-sm font-bold">No posts yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


