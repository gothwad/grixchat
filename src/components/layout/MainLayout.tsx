import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNav from './TopNav.tsx';
import TabBottom from './TabBottom.tsx';
import ResourcesNav, { TabType } from './ResourcesNav.tsx';
import { useNav } from '../../contexts/NavContext.tsx';
import { motion, AnimatePresence } from 'motion/react';

// Paths where BottomNav should be visible
const TAB_PATHS = ['/', '/chats', '/hub', '/reels', '/profile', '/notifications', '/tube'];

export default function MainLayout() {
  const location = useLocation();
  const { isResourcesNavOpen, setIsResourcesNavOpen } = useNav();
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const isChatScreen = location.pathname.startsWith('/chat/');
  const showBottomNav = TAB_PATHS.includes(location.pathname);
  
  // Paths where TopNav should be visible
  const showTopNav = TAB_PATHS.includes(location.pathname);

  // Determine current tab for ResourcesNav
  const getTab = (path: string): TabType | null => {
    if (path === '/chats') return 'chats';
    return null;
  };

  const currentTab = getTab(location.pathname);

  // Reset visibility on tab change - Keep it open by default only on main tabs
  useEffect(() => {
    if (TAB_PATHS.includes(location.pathname)) {
      setIsResourcesNavOpen(true);
    } else {
      setIsResourcesNavOpen(false);
    }
  }, [location.pathname, setIsResourcesNavOpen]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {showTopNav && <TopNav />}
      
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-hidden relative no-scrollbar ${isChatScreen ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
      >
        {showTopNav && (
          <AnimatePresence>
            {currentTab && isResourcesNavOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="overflow-hidden shrink-0"
              >
                <ResourcesNav tab={currentTab} />
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <Outlet />
      </div>
      {showBottomNav && <TabBottom />}
    </div>
  );
}
