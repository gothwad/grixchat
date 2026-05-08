import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase.ts';
import { Search, X, ArrowLeft, Loader2, Play, Clapperboard, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline?: boolean;
}

type SearchTab = 'users' | 'videos' | 'reels';

const UserItem = ({ 
  user, 
  navigate, 
  isFollowing, 
  onToggleFollow,
  followLoading 
}: { 
  user: UserProfile; 
  navigate: any; 
  isFollowing: boolean;
  onToggleFollow: (userId: string, isFollowing: boolean) => void;
  followLoading: boolean;
}) => (
  <div 
    onClick={() => navigate(`/user/${user.uid}`)}
    className="flex items-center gap-3 p-4 hover:bg-[var(--bg-main)] transition-colors cursor-pointer group"
  >
    <div className="relative">
      <img 
        src={user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
        alt={user.username}
        className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)] group-hover:scale-105 transition-transform"
        referrerPolicy="no-referrer"
      />
      {user.isOnline && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bg-card)] rounded-full"></div>
      )}
    </div>
    <div className="flex-1 min-w-0">
      <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{user.fullName || user.username}</h4>
      <p className="text-xs text-[var(--text-secondary)] truncate">@{user.username}</p>
    </div>
    <button 
      onClick={(e) => {
        e.stopPropagation();
        onToggleFollow(user.uid, isFollowing);
      }}
      disabled={followLoading}
      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center justify-center min-w-[80px] ${
        isFollowing 
          ? 'bg-[var(--bg-main)] text-[var(--text-primary)] border border-[var(--border-color)]' 
          : 'bg-[var(--primary)] text-white'
      }`}
    >
      {followLoading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : isFollowing ? (
        'Following'
      ) : (
        'Follow'
      )}
    </button>
  </div>
);

const VideoGridItem = ({ video, onClick }: { video: any, onClick: () => void }) => (
  <div onClick={onClick} className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-md group cursor-pointer border border-[var(--border-color)]/20">
    <img src={video.thumbnail} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={video.title} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3">
      <h4 className="text-[11px] font-bold text-white line-clamp-1">{video.title}</h4>
      <p className="text-[9px] text-white/70 line-clamp-1">{video.userName}</p>
    </div>
    <div className="absolute top-2 right-2 px-1 py-0.5 bg-black/60 text-white text-[9px] font-bold rounded">
      {video.duration || '0:00'}
    </div>
    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
        <Play className="text-white fill-current" size={20} />
      </div>
    </div>
  </div>
);

const ReelGridItem = ({ reel, onClick }: { reel: any, onClick: () => void }) => (
  <div onClick={onClick} className="relative aspect-[9/16] bg-black rounded-xl overflow-hidden shadow-md group cursor-pointer border border-[var(--border-color)]/20">
    <img src={reel.videoUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={reel.caption} />
    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
      <div className="flex items-center gap-1.5 overflow-hidden">
        <Play size={10} className="text-white fill-current" />
        <span className="text-[10px] font-bold text-white truncate">{reel.likes || 0}</span>
      </div>
    </div>
  </div>
);

export default function SearchUserScreen() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [loading, setLoading] = useState(true);
  
  const [userResults, setUserResults] = useState<UserProfile[]>([]);
  const [videoResults, setVideoResults] = useState<any[]>([]);
  const [reelResults, setReelResults] = useState<any[]>([]);
  
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setFollowingIds(snap.data().following || []);
      }
    });

    fetchInitialData();
    return () => unsub();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const usersSnap = await getDocs(query(collection(db, 'users'), limit(15)));
      setSuggestedUsers(usersSnap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid));

      const videosSnap = await getDocs(query(collection(db, 'tube_videos'), orderBy('createdAt', 'desc'), limit(12)));
      setVideoResults(videosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const reelsSnap = await getDocs(query(collection(db, 'reels'), orderBy('createdAt', 'desc'), limit(12)));
      setReelResults(reelsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching discovery data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        fetchInitialData();
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, activeTab]);

  const handleSearch = async () => {
    const term = searchTerm.toLowerCase();
    setLoading(true);
    try {
      if (activeTab === 'users') {
        const q = query(collection(db, 'users'), where('username', '>=', term), where('username', '<=', term + '\uf8ff'), limit(20));
        const snap = await getDocs(q);
        setUserResults(snap.docs.map(doc => doc.data() as UserProfile).filter(u => u.uid !== auth.currentUser?.uid));
      } else if (activeTab === 'videos') {
        const q = query(collection(db, 'tube_videos'), where('title', '>=', searchTerm), where('title', '<=', searchTerm + '\uf8ff'), limit(20));
        const snap = await getDocs(q);
        setVideoResults(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      }
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!auth.currentUser || followLoadingId) return;
    setFollowLoadingId(targetUserId);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { following: currentlyFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId) });
      await updateDoc(doc(db, 'users', targetUserId), { followers: currentlyFollowing ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid) });
    } catch (error) { console.error('Error following:', error); } finally { setFollowLoadingId(null); }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      <div className="bg-[var(--bg-card)] px-4 pt-4 pb-2 z-50 shrink-0 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-[var(--text-primary)]">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-60" />
            <input 
              type="text" placeholder={`Search ${activeTab}...`} value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"><X size={18} /></button>}
          </div>
        </div>

        <div className="flex items-center gap-1">
          {(['users', 'videos', 'reels'] as SearchTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 flex flex-col items-center gap-1.5 py-2 transition-all relative group`}
            >
              <div className={`p-1.5 rounded-lg transition-colors ${activeTab === tab ? 'bg-blue-500/10 text-blue-500' : 'text-[var(--text-secondary)] group-hover:bg-black/5'}`}>
                {tab === 'users' && <Users size={18} />}
                {tab === 'videos' && <Play size={18} />}
                {tab === 'reels' && <Clapperboard size={18} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest ${activeTab === tab ? 'text-blue-500' : 'text-[var(--text-secondary)]/60'}`}>
                {tab}
              </span>
              {activeTab === tab && <motion.div layoutId="searchTab" className="absolute bottom-[-8px] left-0 right-0 h-0.5 bg-blue-500" />}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading && !searchTerm ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Searching Paradise...</p>
          </div>
        ) : (
          <div className="p-4">
            {activeTab === 'users' && (
              <div className="space-y-1 flex flex-col">
                <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3 px-4">
                  {searchTerm ? 'Search Results' : 'Suggested For You'}
                </h3>
                {(searchTerm ? userResults : suggestedUsers).map(user => (
                  <UserItem 
                    key={user.uid} user={user} navigate={navigate} 
                    isFollowing={followingIds.includes(user.uid)}
                    onToggleFollow={handleToggleFollow}
                    followLoading={followLoadingId === user.uid}
                  />
                ))}
              </div>
            )}

            {activeTab === 'videos' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-3">
                    {searchTerm ? `Results for "${searchTerm}"` : 'Trending on GrixTube'}
                  </h3>
                </div>
                {videoResults.map(video => (
                  <VideoGridItem 
                    key={video.id} video={video} 
                    onClick={() => navigate(`/tube/watch/${video.id}`)} 
                  />
                ))}
              </div>
            )}

            {activeTab === 'reels' && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">Discover Reels</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {reelResults.map(reel => (
                    <ReelGridItem 
                      key={reel.id} reel={reel} 
                      onClick={() => navigate(`/reels/watch/${reel.id}`)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
