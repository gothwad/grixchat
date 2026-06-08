import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import TopNav from './TopNav.tsx';
import TabBottom from './TabBottom.tsx';
import ResourcesNav, { TabType } from './ResourcesNav.tsx';
import { useNav } from '../../contexts/NavContext.tsx';
import PWAInstallPrompt from './PWAInstallPrompt.tsx';
import { useAuth } from '../../providers/AuthProvider';

// Lazy loading our 5 tabs for keep-alive container
const ChatsTab = React.lazy(() => import('../../features/chat/ChatsTab'));
const GroupsTab = React.lazy(() => import('../../features/chat/GroupsTab'));
const SearchTab = React.lazy(() => import('../../features/search/SearchTab'));
const CallsTab = React.lazy(() => import('../../features/call/CallsTab'));
const ProfileTab = React.lazy(() => import('../../features/profile/ProfileTab'));

// Paths where BottomNav should be visible
const TAB_PATHS = ['/', '/chats', '/groups', '/search', '/calls', '/profile', '/notifications', '/reels'];
const MAIN_TABS = ['/', '/chats', '/groups', '/search', '/calls', '/profile'];

export default function MainLayout() {
  const location = useLocation();
  const { isResourcesNavOpen, setIsResourcesNavOpen } = useNav();
  const { user } = useAuth();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const isChatScreen = location.pathname.startsWith('/chat/');
  const showBottomNav = TAB_PATHS.includes(location.pathname);
  
  // Paths where TopNav should be visible
  const showTopNav = TAB_PATHS.includes(location.pathname);

  // Keep-Alive state
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const path = location.pathname;
    if (user && MAIN_TABS.includes(path)) {
      setVisitedTabs((prev) => {
        if (prev[path]) return prev;
        return { ...prev, [path]: true };
      });
    }
  }, [location.pathname, user]);

  const isMainTab = !!user && MAIN_TABS.includes(location.pathname);

  // Determine current tab for ResourcesNav
  const getTab = (path: string): TabType | null => {
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
      
      {/* Static header bar without any slide heights and delays */}
      {showTopNav && currentTab && isResourcesNavOpen && (
        <div className="shrink-0 z-40 bg-[var(--bg-card)]">
          <ResourcesNav tab={currentTab} />
        </div>
      )}
      
      <div 
        ref={scrollContainerRef}
        className={`flex-1 overflow-x-hidden relative no-scrollbar ${isChatScreen || TAB_PATHS.includes(location.pathname) ? 'overflow-y-hidden' : 'overflow-y-auto'}`}
      >
          {/* Keep-Alive Tabs: once loaded, we keep them persistent and mounted with isolated Suspense boundaries */}
          {(visitedTabs['/'] || visitedTabs['/chats']) && (
            <div 
              className={`h-full w-full absolute inset-0 ${(location.pathname === '/' || location.pathname === '/chats') ? 'visible z-10 pointer-events-auto opacity-100' : 'invisible z-0 pointer-events-none opacity-0'}`}
            >
              <Suspense fallback={null}>
                <ChatsTab />
              </Suspense>
            </div>
          )}

          {visitedTabs['/groups'] && (
            <div 
              className={`h-full w-full absolute inset-0 ${location.pathname === '/groups' ? 'visible z-10 pointer-events-auto opacity-100' : 'invisible z-0 pointer-events-none opacity-0'}`}
            >
              <Suspense fallback={null}>
                <GroupsTab />
              </Suspense>
            </div>
          )}

          {visitedTabs['/search'] && (
            <div 
              className={`h-full w-full absolute inset-0 ${location.pathname === '/search' ? 'visible z-10 pointer-events-auto opacity-100' : 'invisible z-0 pointer-events-none opacity-0'}`}
            >
              <Suspense fallback={null}>
                <SearchTab />
              </Suspense>
            </div>
          )}
          
          {visitedTabs['/calls'] && (
            <div 
              className={`h-full w-full absolute inset-0 ${location.pathname === '/calls' ? 'visible z-10 pointer-events-auto opacity-100' : 'invisible z-0 pointer-events-none opacity-0'}`}
            >
              <Suspense fallback={null}>
                <CallsTab />
              </Suspense>
            </div>
          )}
          
          {visitedTabs['/profile'] && (
            <div 
              className={`h-full w-full absolute inset-0 ${location.pathname === '/profile' ? 'visible z-10 pointer-events-auto opacity-100' : 'invisible z-0 pointer-events-none opacity-0'}`}
            >
              <Suspense fallback={null}>
                <ProfileTab />
              </Suspense>
            </div>
          )}

        {/* Regular Routes render inside Outlet ONLY when not a main tab */}
        {!isMainTab && <Outlet />}
      </div>
      
      {showBottomNav && <TabBottom />}
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
