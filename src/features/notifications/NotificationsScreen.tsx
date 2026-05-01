import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, writeBatch } from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { Bell, UserPlus, ArrowLeft, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { toDate } from '../../utils/dateUtils.ts';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!auth.currentUser) return;

    // Use a simpler query that doesn't require composite index
    // We filter 'type' client-side below
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Filter for follow/system notifications client-side and sort
      const list = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((notif: any) => ["follow", "system"].includes(notif.type))
        .sort((a: any, b: any) => {
          const timeA = a.createdAt?.seconds || (a.createdAt?.toMillis ? a.createdAt.toMillis() / 1000 : 0);
          const timeB = b.createdAt?.seconds || (b.createdAt?.toMillis ? b.createdAt.toMillis() / 1000 : 0);
          return timeB - timeA;
        });
      
      setNotifications(list);
      setLoading(false);

      // Mark unread as read (for the specific types we care about here)
      const unread = snapshot.docs.filter(d => {
        const data = d.data();
        return data.read === false && ["follow", "system"].includes(data.type);
      });

      if (unread.length > 0) {
        const batch = writeBatch(db);
        unread.forEach(d => {
          batch.update(doc(db, "notifications", d.id), { read: true });
        });
        batch.commit().catch(err => console.error("Error marking read:", err));
      }
    }, (error) => {
      console.error("Firestore Notifications Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans">
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)]/30 shrink-0 sticky top-0 bg-[var(--bg-main)] z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-[var(--text-primary)]/5">
          <ArrowLeft size={24} />
        </button>
        <div className="ml-4 flex items-center gap-2">
          <Bell size={20} className="text-blue-500" />
          <span className="font-bold text-lg text-[var(--text-primary)]">Notifications</span>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-8 h-8 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">Checking Alerts...</p>
          </div>
        ) : notifications.length > 0 ? (
          <div className="space-y-3">
            {notifications.map((notif) => (
              <motion.div 
                key={notif.id} 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => navigate(`/user/${notif.fromUserId}`)}
                className="flex items-center gap-4 p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-sm cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="relative shrink-0">
                  <img 
                    src={notif.fromUserAvatar || DEFAULT_LOGO} 
                    className="w-11 h-11 rounded-full object-cover border border-[var(--border-color)]/20" 
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shadow-md border-2 border-[var(--bg-card)]">
                    <UserPlus size={10} className="text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[var(--text-primary)] leading-tight">
                    <span className="font-bold">{notif.fromUserName}</span>{' '}
                    <span className="font-medium text-[var(--text-secondary)]">{notif.text}</span>
                  </p>
                  <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase mt-1 tracking-tight">
                    {notif.createdAt ? toDate(notif.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center py-20 px-10 text-center opacity-40">
            <Bell size={64} className="text-[var(--text-secondary)] mb-6 stroke-[1.5]" />
            <h3 className="text-lg font-bold">Inbox Empty</h3>
            <p className="text-xs mt-2 font-medium">When you get followed or updated, they will appear here.</p>
            <button 
              onClick={() => navigate('/search-user')}
              className="mt-8 flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
            >
              <Search size={18} />
              Discover People
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
