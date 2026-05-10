import React, { useState, useEffect } from 'react';
import { VolumeX, Loader2, X } from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { auth, db } from '../../services/firebase.ts';
import { doc, onSnapshot, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';

export default function MutedAccountsScreen() {
  const [mutedUsers, setMutedUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [unmutingId, setUnmutingId] = useState<string | null>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), async (snap) => {
      if (snap.exists()) {
        const mutedIds = snap.data().mutedUsers || [];
        
        // Fetch details for each muted user
        const details = await Promise.all(mutedIds.map(async (uid: string) => {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            return { uid, ...userSnap.data() };
          }
          return { uid, username: 'Unknown User' };
        }));
        
        setMutedUsers(details);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUnmute = async (uid: string) => {
    if (!auth.currentUser) return;
    setUnmutingId(uid);
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        mutedUsers: arrayRemove(uid)
      });
    } catch (error) {
      console.error("Error unmuting user:", error);
    } finally {
      setUnmutingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-hidden">
        <SettingHeader title="Muted accounts" />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col bg-[var(--bg-main)] h-full overflow-hidden font-sans">
      <SettingHeader title="Muted accounts" />
      
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {mutedUsers.length > 0 ? (
          <div className="py-4">
            <p className="px-6 mb-4 text-[11px] text-[var(--text-secondary)] font-medium uppercase tracking-widest">
              MUTED ACCOUNTS ({mutedUsers.length})
            </p>
            <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
              {mutedUsers.map((user, index) => (
                <div 
                  key={user.uid}
                  className={`flex items-center justify-between px-6 py-4 ${
                    index !== mutedUsers.length - 1 ? 'border-b border-[var(--border-color)]/30' : ''
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
                    onClick={() => handleUnmute(user.uid)}
                    disabled={unmutingId === user.uid}
                    className="text-xs font-bold text-blue-500 hover:text-blue-600 disabled:opacity-50"
                  >
                    {unmutingId === user.uid ? 'Working...' : 'Unmute'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center py-20">
            <div className="w-20 h-20 bg-zinc-100 rounded-full flex items-center justify-center mb-6">
              <VolumeX size={40} className="text-zinc-900" />
            </div>
            <h2 className="text-xl font-black text-[var(--text-primary)] mb-2">No muted accounts</h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8 max-w-xs">
              When you mute someone, you won't see their posts or stories in your feed. They won't know you've muted them.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
