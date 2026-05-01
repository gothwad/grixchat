import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  ShieldAlert, 
  UserX, 
  Info,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  Bell,
  Settings,
  QrCode,
  ChevronRight,
  Edit3,
  UserPlus,
  UserCheck,
  LockKeyhole,
  PlusSquare,
  X,
  Loader2,
  Clapperboard,
  UserSquare2,
  Bookmark
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { toDate } from '../../utils/dateUtils.ts';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, onSnapshot, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import ProfileContent from './components/ProfileContent.tsx';
import { motion, AnimatePresence } from 'motion/react';
import PostCard from '../home/components/PostCard.tsx';

export default function UserProfileScreen() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('posts');
  const [showMenu, setShowMenu] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  useEffect(() => {
    if (!userId) return;

    // Listen to target user data for real-time counts
    const unsubscribeUser = onSnapshot(doc(db, "users", userId), (docSnap) => {
      if (docSnap.exists()) {
        setUser(docSnap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching user:", error);
      setLoading(false);
    });

    // Check if blocked and following (listen to current user data)
    let unsubscribeMe: any;
    if (auth.currentUser) {
      unsubscribeMe = onSnapshot(doc(db, "users", auth.currentUser.uid), (myDocSnap) => {
        if (myDocSnap.exists()) {
          const myData = myDocSnap.data();
          setCurrentUserData(myData);
          setIsBlocked(myData.blockedUsers?.includes(userId) || false);
          setIsFollowing(myData.following?.includes(userId) || false);
        }
      });
    }

    // Fetch user posts
    const fetchPosts = async () => {
      const q = query(collection(db, "posts"), where("userId", "==", userId));
      const snaps = await getDocs(q);
      setPosts(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchPosts();

    return () => {
      unsubscribeUser();
      if (unsubscribeMe) unsubscribeMe();
    };
  }, [userId]);

  const handleToggleFollow = async () => {
    if (!auth.currentUser || !userId || followLoading) return;
    setFollowLoading(true);
    
    try {
      const myDocRef = doc(db, "users", auth.currentUser.uid);
      const targetDocRef = doc(db, "users", userId);
      const newFollowState = !isFollowing;
      
      // Update my following list
      await updateDoc(myDocRef, {
        following: newFollowState ? arrayUnion(userId) : arrayRemove(userId)
      });
      
      // Update target user's followers list
      await updateDoc(targetDocRef, {
        followers: newFollowState ? arrayUnion(auth.currentUser.uid) : arrayRemove(auth.currentUser.uid)
      });

      // Add Notification if following
      if (newFollowState) {
        await addDoc(collection(db, "notifications"), {
          userId: userId,
          fromUserId: auth.currentUser.uid,
          fromUserName: currentUserData?.fullName || 'User',
          fromUserAvatar: currentUserData?.photoURL || '',
          type: 'follow',
          text: 'started following you',
          read: false,
          createdAt: serverTimestamp()
        });
      }
      
      setIsFollowing(newFollowState);
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleToggleBlock = async () => {
    if (!auth.currentUser || !userId) return;
    
    try {
      const myDocRef = doc(db, "users", auth.currentUser.uid);
      const newBlockedState = !isBlocked;
      
      await updateDoc(myDocRef, {
        blockedUsers: newBlockedState ? arrayUnion(userId) : arrayRemove(userId)
      });
      
      setIsBlocked(newBlockedState);
      setShowMenu(false);
    } catch (error) {
      console.error("Error toggling block:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-main)] p-6 text-center">
        <p className="text-[var(--text-secondary)] mb-4">User not found or has been removed.</p>
        <button onClick={() => navigate(-1)} className="text-[var(--primary)] font-bold">Go Back</button>
      </div>
    );
  }

  const isPrivate = user.profileType === 'private' && !isFollowing && auth.currentUser?.uid !== userId;

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex justify-between items-center z-50 shrink-0 relative border-b border-[var(--border-color)] shadow-sm rounded-b-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={22} className="text-[var(--header-text)]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[var(--header-text)] tracking-tight">{user.fullName || 'GrixChat User'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <Bell size={22} className="text-[var(--header-text)] opacity-80" />
          </button>
          <button 
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical size={22} className="text-[var(--header-text)] opacity-80" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="px-4 pt-6">
          {/* Profile Picture & Stats Row */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600">
                <div className="w-full h-full rounded-full border-2 border-[var(--bg-card)] overflow-hidden bg-[var(--bg-main)]">
                  <img 
                    src={user.hidePhoto ? DEFAULT_LOGO : (user.photoURL || DEFAULT_LOGO)} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                </div>
              </div>
            </div>

            {/* Stats Box (Single) */}
            <div className="flex-1 bg-[var(--box-bg)] rounded-xl p-2 flex justify-between items-center min-h-[60px]">
              <button 
                onClick={() => !isPrivate && navigate(`/user/${userId}/followers`)}
                className={`flex flex-col items-center flex-1 active:scale-95 transition-all ${isPrivate ? 'opacity-50 cursor-default' : ''}`}
              >
                <span className="text-sm font-bold text-[var(--box-text)]">{user.followers?.length || 0}</span>
                <span className="text-[10px] text-[var(--box-text)] opacity-80 uppercase font-bold tracking-wider">Followers</span>
              </button>
              <button 
                onClick={() => !isPrivate && navigate(`/user/${userId}/following`)}
                className={`flex flex-col items-center flex-1 active:scale-95 transition-all ${isPrivate ? 'opacity-50 cursor-default' : ''}`}
              >
                <span className="text-sm font-bold text-[var(--box-text)]">{user.following?.length || 0}</span>
                <span className="text-[10px] text-[var(--box-text)] opacity-80 uppercase font-bold tracking-wider">Following</span>
              </button>
            </div>
          </div>

          {/* 4 Boxes Layout */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {/* Name & Username Box */}
            <div className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col justify-center min-h-[60px]">
              <h2 className="text-[13px] font-bold leading-tight truncate">
                {user.fullName || 'GrixChat User'}
              </h2>
              <p className="text-[11px] opacity-80 truncate">
                @{user.username || 'username'}
              </p>
            </div>

            {/* Bio Box */}
            <div className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col justify-center min-h-[60px]">
              <p className="text-[11px] leading-tight line-clamp-3">
                {user.bio || 'Available'}
              </p>
            </div>

            {/* Follow Button Box */}
            <button 
              onClick={handleToggleFollow}
              disabled={followLoading}
              className={`bg-[var(--box-bg)] text-[var(--box-text)] px-4 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-all text-left flex items-center justify-between ${isFollowing ? 'opacity-90' : ''}`}
            >
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
              {followLoading && <Loader2 size={14} className="animate-spin" />}
            </button>

            {/* Message Box */}
            <button 
              onClick={() => navigate(`/chat/${userId}`)}
              className="bg-[var(--box-bg)] text-[var(--box-text)] px-4 py-3 rounded-xl text-[13px] font-bold active:scale-[0.98] transition-all text-left"
            >
              Message
            </button>
          </div>
        </div>

        {/* Profile Content (Tabs & Grid) */}
        {isPrivate ? (
          <div className="bg-[var(--bg-card)] p-10 flex flex-col items-center text-center mt-4 border-y border-[var(--border-color)]">
            <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center text-[var(--text-secondary)] mb-4">
              <LockKeyhole size={32} />
            </div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-tight mb-2">This Account is Private</h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              Follow this account to see their photos, videos and profile details.
            </p>
          </div>
        ) : (
          <div className="px-4">
            {/* Tabs Strip */}
            <div className="flex bg-[var(--box-bg)] rounded-xl mb-4 overflow-hidden h-[46px] items-stretch">
              <button 
                onClick={() => setActiveFilter('posts')}
                className={`flex-1 flex justify-center items-center transition-colors ${activeFilter === 'posts' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              >
                <Clapperboard size={20} />
              </button>
              <button 
                onClick={() => setActiveFilter('tagged')}
                className={`flex-1 flex justify-center items-center transition-colors ${activeFilter === 'tagged' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              >
                <UserSquare2 size={20} />
              </button>
              <button 
                onClick={() => setActiveFilter('saved')}
                className={`flex-1 flex justify-center items-center transition-colors ${activeFilter === 'saved' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              >
                <Bookmark size={20} />
              </button>
            </div>
            <ProfileContent posts={posts} activeTab={activeFilter} />
          </div>
        )}

        {/* Branding Footer */}
        <div className="py-12 flex flex-col items-center gap-1 opacity-40">
          <span className="text-[var(--text-secondary)] text-sm font-medium">from</span>
          <span className="text-[var(--text-primary)] text-[10px] font-black tracking-[0.3em] uppercase">Gothwad technologies</span>
          <span className="text-[var(--text-secondary)] text-[8px] uppercase tracking-tighter mt-1">made in india</span>
        </div>
      </div>

      {/* Action Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/40 z-[60]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-3xl z-[70] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Options</h3>
                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full">
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={handleToggleBlock}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] rounded-2xl transition-colors text-red-600"
                >
                  <UserX size={20} />
                  <span className="font-bold">{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] rounded-2xl transition-colors text-orange-600"
                >
                  <ShieldAlert size={20} />
                  <span className="font-bold">Report User</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
