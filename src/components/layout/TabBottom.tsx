import React, { useEffect, useState } from 'react';
import { MessageCircle, Compass, LayoutGrid, UserCircle, Clapperboard, Home, Play } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';

export default function TabBottom() {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "messages"),
      where("receiverId", "==", auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unread = snapshot.docs.filter(doc => doc.data().isRead === false);
      setUnreadCount(unread.length);
    });

    return () => unsubscribe();
  }, []);
  
  const navItems = [
    { icon: Home, path: '/', label: 'Home', activeColor: 'text-[var(--header-text)]' },
    { icon: Clapperboard, path: '/reels', label: 'Reels', activeColor: 'text-[var(--header-text)]' },
    { icon: MessageCircle, path: '/chats', label: 'Chats', badge: unreadCount, activeColor: 'text-[var(--header-text)]' },
    { icon: null, path: '/tube', label: 'Tube', activeColor: 'text-[var(--header-text)]' },
    { icon: UserCircle, path: '/profile', label: 'Profile', activeColor: 'text-[var(--header-text)]' },
  ];

  return (
    <div className="w-full bg-[var(--header-bg)] px-2 h-16 flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] shrink-0 border-t border-[var(--border-color)] pb-safe rounded-t-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className="relative flex flex-col items-center justify-center h-full min-w-[64px] transition-all duration-300 group"
          >
            <div className="relative flex flex-col items-center">
              <motion.div 
                animate={{ 
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0
                }}
                className={`transition-colors duration-300 ${isActive ? item.activeColor : 'text-[var(--header-text)]/50 group-hover:text-[var(--header-text)]'}`}
              >
                {item.label === 'Tube' ? (
                  <div className="relative flex items-center justify-center h-6 w-6">
                    <svg 
                      width="24" 
                      height="24" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth={isActive ? 2.5 : 2} 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="transition-all duration-300"
                    >
                      <rect 
                        x="2" 
                        y="5" 
                        width="20" 
                        height="14" 
                        rx="3" 
                        fill={isActive ? 'currentColor' : 'none'} 
                        fillOpacity={isActive ? 0.15 : 0}
                      />
                      <path d="m10 9 5 3-5 3V9z" />
                    </svg>
                  </div>
                ) : (
                  Icon && <Icon 
                    size={24} 
                    strokeWidth={isActive ? 2.5 : 2}
                    fill={isActive ? 'currentColor' : 'none'}
                    fillOpacity={isActive ? 0.15 : 0}
                  />
                )}
              </motion.div>
              
              {item.badge !== undefined && item.badge > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[var(--header-bg)] shadow-sm z-10"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </motion.div>
              )}
            </div>
            
            <span className={`text-[10px] mt-1 font-bold transition-all duration-300 ${isActive ? 'text-[var(--header-text)] opacity-100' : 'text-[var(--header-text)]/50 opacity-70 group-hover:opacity-100'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
