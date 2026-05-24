import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import TopNav from './TopNav.tsx';
import TabBottom from './TabBottom.tsx';
import ResourcesNav, { TabType } from './ResourcesNav.tsx';
import { useNav } from '../../contexts/NavContext.tsx';
import PWAInstallPrompt from './PWAInstallPrompt.tsx';
import { useAuth } from '../../providers/AuthProvider';

// Lazy loading our 5 tabs for keep-alive container
const ChatsTab = React.lazy(() => import('../../features/chat/ChatsTab'));
const CallsTab = React.lazy(() => import('../../features/call/CallsTab'));
const GroupsTab = React.lazy(() => import('../../features/chat/GroupsTab'));
const SearchTab = React.lazy(() => import('../../features/search/SearchTab'));
const ProfileTab = React.lazy(() => import('../../features/profile/ProfileTab'));

// Paths where BottomNav should be visible
const TAB_PATHS = ['/', '/chats', '/calls', '/reels', '/profile', '/notifications', '/search', '/groups'];
const MAIN_TABS = ['/', '/groups', '/search', '/calls', '/profile'];

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
        <Suspense fallback={
          <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          {/* Keep-Alive Tabs: once loaded, we keep them persistent and mounted */}
          {visitedTabs['/'] && (
            <div className={location.pathname === '/' ? 'h-full w-full' : 'hidden'}>
              <ChatsTab />
            </div>
          )}
          
          {visitedTabs['/calls'] && (
            <div className={location.pathname === '/calls' ? 'h-full w-full' : 'hidden'}>
              <CallsTab />
            </div>
          )}
          
          {visitedTabs['/groups'] && (
            <div className={location.pathname === '/groups' ? 'h-full w-full' : 'hidden'}>
              <GroupsTab />
            </div>
          )}
          
          {visitedTabs['/search'] && (
            <div className={location.pathname === '/search' ? 'h-full w-full' : 'hidden'}>
              <SearchTab />
            </div>
          )}
          
          {visitedTabs['/profile'] && (
            <div className={location.pathname === '/profile' ? 'h-full w-full' : 'hidden'}>
              <ProfileTab />
            </div>
          )}
        </Suspense>

        {/* Regular Routes render inside Outlet ONLY when not a main tab */}
        {!isMainTab && <Outlet />}
      </div>
      
      {showBottomNav && <TabBottom />}
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </div>
  );
}
