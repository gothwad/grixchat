import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs,
  where
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { ArrowLeft, Search, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function ShareScreen() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch following users to share with
    const fetchFriends = async () => {
      const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
      if (userDoc.exists()) {
        const following = userDoc.data().following || [];
        if (following.length > 0) {
          const q = query(collection(db, "users"), where("__name__", "in", following.slice(0, 10)));
          const snaps = await getDocs(q);
          setUsers(snaps.docs.map(d => ({ id: d.id, ...d.data() })));
        }
      }
      setLoading(false);
    };

    fetchFriends();
  }, []);

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0 || !postId) return;
    setSending(true);

    try {
      // In a real app, this would send a message to each user with the post link
      // For now, we simulate sending
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate back
      navigate(-1);
    } catch (err) {
      console.error("Error sharing post:", err);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)]/30 shrink-0 sticky top-0 bg-[var(--bg-main)] z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5">
          <ArrowLeft size={24} />
        </button>
        <span className="ml-4 font-bold text-lg">Send to</span>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 shadow-sm">
          <Search size={18} className="text-[var(--text-secondary)] mr-3" />
          <input 
            type="text" 
            placeholder="Search people..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pt-0">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div 
                key={user.id}
                onClick={() => handleToggleUser(user.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              >
                <img 
                  src={user.photoURL || DEFAULT_LOGO} 
                  className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)]/20" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.fullName || 'User'}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">@{user.username}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedUsers.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'border-[var(--border-color)]'}`}>
                  {selectedUsers.includes(user.id) && <CheckCircle2 size={16} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center opacity-40 text-center">
            <Search size={48} className="mb-4" />
            <p className="text-sm font-bold">No friends found</p>
            <p className="text-[10px] mt-1">Follow people to share posts with them.</p>
          </div>
        )}
      </div>

      {/* Send Button */}
      {selectedUsers.length > 0 && (
        <div className="p-4 border-t border-[var(--border-color)]/30 bg-[var(--bg-main)]">
          <button 
            onClick={handleShare}
            disabled={sending}
            className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                Send to {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
