import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, limit, getDocs, where, doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../../services/firebase.ts';
import { Search, X, ArrowLeft, UserPlus, Check, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfile {
  uid: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline?: boolean;
}

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
  key?: any;
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

export default function SearchUserScreen() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestedUsers, setSuggestedUsers] = useState<UserProfile[]>([]);
  const [newUsers, setNewUsers] = useState<UserProfile[]>([]);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to current user's following list
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setFollowingIds(snap.data().following || []);
      }
    });

    fetchInitialUsers();
    return () => unsub();
  }, []);

  const fetchInitialUsers = async () => {
    try {
      setLoading(true);
      // Fetch New Users (New on GrixChat)
      const newUsersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(10)
      );
      const newUsersSnap = await getDocs(newUsersQuery);
      const newUsersList = newUsersSnap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid);
      setNewUsers(newUsersList);

      // Fetch Suggested Users
      const suggestedQuery = query(
        collection(db, 'users'),
        limit(20)
      );
      const suggestedSnap = await getDocs(suggestedQuery);
      const suggestedList = suggestedSnap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid)
        .slice(0, 10);
      setSuggestedUsers(suggestedList);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleSearch = async () => {
    try {
      const q = query(
        collection(db, 'users'),
        where('username', '>=', searchTerm.toLowerCase()),
        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
        limit(20)
      );
      const snap = await getDocs(q);
      const results = snap.docs
        .map(doc => doc.data() as UserProfile)
        .filter(u => u.uid !== auth.currentUser?.uid);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const handleToggleFollow = async (targetUserId: string, currentlyFollowing: boolean) => {
    if (!auth.currentUser || followLoadingId) return;
    setFollowLoadingId(targetUserId);

    try {
      const myDocRef = doc(db, 'users', auth.currentUser.uid);
      const targetDocRef = doc(db, 'users', targetUserId);

      await updateDoc(myDocRef, {
        following: currentlyFollowing ? arrayRemove(targetUserId) : arrayUnion(targetUserId)
      });

      await updateDoc(targetDocRef, {
        followers: currentlyFollowing ? arrayRemove(auth.currentUser.uid) : arrayUnion(auth.currentUser.uid)
      });
    } catch (error) {
      console.error('Error toggling follow:', error);
    } finally {
      setFollowLoadingId(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-card)] overflow-hidden">
      {/* Search Header */}
      <div className="bg-[var(--header-bg)] px-4 h-14 flex items-center gap-3 z-50 shrink-0 border-b border-[var(--border-color)] shadow-sm rounded-b-2xl">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--header-text)]"
        >
          <ArrowLeft size={22} />
        </button>
        
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search size={18} className="text-[var(--header-text)] opacity-60" />
          </div>
          <input 
            type="text"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
            className="w-full bg-white/10 border-none rounded-xl py-2 pl-10 pr-4 text-sm text-[var(--header-text)] placeholder:text-[var(--header-text)]/50 focus:ring-2 focus:ring-white/20 transition-all outline-none"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-3 flex items-center text-[var(--header-text)] opacity-60"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <button 
          onClick={() => navigate(-1)}
          className="text-sm font-bold text-[var(--header-text)] px-2"
        >
          Cancel
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Loading Users...</p>
          </div>
        ) : searchTerm ? (
          <div className="flex flex-col">
            <div className="px-4 py-3 bg-[var(--bg-main)]/50">
              <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Search Results</h3>
            </div>
            {searchResults.length > 0 ? (
              searchResults.map(user => (
                <UserItem 
                  key={user.uid} 
                  user={user} 
                  navigate={navigate} 
                  isFollowing={followingIds.includes(user.uid)}
                  onToggleFollow={handleToggleFollow}
                  followLoading={followLoadingId === user.uid}
                />
              ))
            ) : (
              <div className="py-20 text-center">
                <p className="text-sm text-[var(--text-secondary)] font-medium">No users found for "{searchTerm}"</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Suggested For You */}
            <div className="px-4 py-3 bg-[var(--bg-main)]/50 flex justify-between items-center">
              <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">Suggested For You</h3>
            </div>
            <div className="flex flex-col divide-y divide-[var(--border-color)]/30">
              {suggestedUsers.map(user => (
                <UserItem 
                  key={user.uid} 
                  user={user} 
                  navigate={navigate} 
                  isFollowing={followingIds.includes(user.uid)}
                  onToggleFollow={handleToggleFollow}
                  followLoading={followLoadingId === user.uid}
                />
              ))}
            </div>

            {/* New on GrixChat */}
            <div className="px-4 py-3 bg-[var(--bg-main)]/50 mt-4">
              <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest">New on GrixChat</h3>
            </div>
            <div className="flex flex-col divide-y divide-[var(--border-color)]/30">
              {newUsers.map(user => (
                <UserItem 
                  key={user.uid} 
                  user={user} 
                  navigate={navigate} 
                  isFollowing={followingIds.includes(user.uid)}
                  onToggleFollow={handleToggleFollow}
                  followLoading={followLoadingId === user.uid}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
