import React, { useState, useEffect } from 'react';
import { Star, Search, UserPlus, Loader2, X } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { auth, db } from '../../services/firebase.ts';
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

export default function FavoritesScreen() {
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), async (snap) => {
      if (snap.exists()) {
        const favoriteIds = snap.data().favorites || [];
        
        // Fetch details for each favorite user
        const details = await Promise.all(favoriteIds.map(async (uid: string) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            return { uid, ...userSnap.data() };
          }
          return { uid, username: 'Unknown User' };
        }));
        
        setFavorites(details);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleRemoveFavorite = async (uid: string) => {
    if (!auth.currentUser) return;
    setRemovingId(uid);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        favorites: arrayRemove(uid)
      });
    } catch (error) {
      console.error("Error removing favorite:", error);
    } finally {
      setRemovingId(null);
    }
  };

  const filteredFavorites = favorites.filter(fav => 
    fav.username?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    fav.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-hidden">
        <SettingHeader title="Favorites" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-hidden font-sans">
      <SettingHeader title="Favorites" />
      
      <div className="p-4 flex-1 flex flex-col overflow-hidden">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
          <input 
            type="text" 
            placeholder="Search favorites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl py-2.5 pl-10 pr-4 text-sm font-medium focus:outline-none focus:border-[var(--primary)] transition-colors text-[var(--text-primary)]"
          />
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar">
          {filteredFavorites.length > 0 ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden mb-8">
              {filteredFavorites.map((user, index) => (
                <div 
                  key={user.uid}
                  className={`flex items-center justify-between px-6 py-4 ${
                    index !== filteredFavorites.length - 1 ? 'border-b border-[var(--border-color)]/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img 
                      src={user.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      className="w-10 h-10 rounded-full object-cover"
                      alt=""
                    />
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-primary)]">
                        {user.fullName || user.username}
                      </h4>
                      <p className="text-[11px] text-[var(--text-secondary)]">@{user.username}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleRemoveFavorite(user.uid)}
                    disabled={removingId === user.uid}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X size={18} />
                  </button>
                </div>
              ))}
            </div>
          ) : searchTerm ? (
             <div className="text-center py-10 opacity-50">
                <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">No matching favorites</p>
             </div>
          ) : (
            <div className="flex flex-col items-center text-center py-10">
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mb-4">
                <Star size={32} className="text-zinc-900" />
              </div>
              <h2 className="text-lg font-black text-[var(--text-primary)] mb-2">No favorites yet</h2>
              <p className="text-xs text-[var(--text-secondary)] mb-8 max-w-xs">
                Posts from your favorites will appear higher in feed. We don't send notifications when you add or remove people.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
