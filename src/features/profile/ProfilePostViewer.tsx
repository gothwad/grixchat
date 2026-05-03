import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc,
  onSnapshot, 
  orderBy 
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import PostCard from '../home/components/PostCard.tsx';

export default function ProfilePostViewer() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const startPostId = searchParams.get('postId');
  const tab = searchParams.get('tab') || 'posts';
  
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const postRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch current user data for PostCard
    const unsubscribeMe = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    });

    const fetchPosts = async () => {
      setLoading(true);
      try {
        let q;
        if (tab === 'posts') {
          q = query(
            collection(db, "posts"), 
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
          );
        } else if (tab === 'reels') {
          q = query(
            collection(db, "reels"), 
            where("userUid", "==", userId),
            orderBy("createdAt", "desc")
          );
        } else if (tab === 'tube') {
          q = query(
            collection(db, "tube_videos"), 
            where("userId", "==", userId),
            orderBy("createdAt", "desc")
          );
        } else if (tab === 'saved') {
            const userDoc = await getDoc(doc(db, "users", userId!));
            const userData = userDoc.data();
            const savedIds = userData?.savedPosts || [];
            
            if (savedIds.length > 0) {
              q = query(collection(db, "posts"), where("__name__", "in", savedIds.slice(0, 10)));
            } else {
              setPosts([]);
              setLoading(false);
              return;
            }
        } else {
          setLoading(false);
          return;
        }

        const snapshot = await getDocs(q);
        const fetchedPosts = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          // Normalize fields for PostCard
          return {
            id: doc.id,
            ...data,
            imageUrl: data.imageUrl || data.cover || data.thumbnail || data.url,
            userName: data.userName || data.authorName || 'User',
            userAvatar: data.userAvatar || data.authorAvatar || '',
            caption: data.caption || data.title || data.description || '',
            userId: data.userId || data.userUid || ''
          };
        });
        setPosts(fetchedPosts);
      } catch (err) {
        console.error("Error fetching viewer posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
    return () => unsubscribeMe();
  }, [userId, tab]);

  // Scroll to the start post once loaded
  useEffect(() => {
    if (!loading && startPostId && postRefs.current[startPostId]) {
      postRefs.current[startPostId]?.scrollIntoView({ behavior: 'auto' });
    }
  }, [loading, startPostId]);

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex items-center gap-3 z-50 shrink-0 border-b border-[var(--border-color)]">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div className="flex flex-col">
          <h1 className="text-[15px] font-bold text-[var(--header-text)] capitalize">{tab}</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {loading ? (
          <div className="h-40 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)]" />
          </div>
        ) : posts.length > 0 ? (
          <div className="flex flex-col gap-2">
            {posts.map((post) => (
              <div 
                key={post.id} 
                ref={el => postRefs.current[post.id] = el}
                className="pt-2"
              >
                <PostCard post={post} currentUserData={currentUserData} />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)]">
            <p className="text-sm font-bold">No posts found</p>
          </div>
        )}
      </div>
    </div>
  );
}
