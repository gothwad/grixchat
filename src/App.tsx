import React, { useEffect, useState } from 'react';
import { APP_CONFIG } from './config/appConfig';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LockService } from './services/LockService.ts';
import { CacheService } from './services/CacheService.ts';
import NotificationHandler from './components/NotificationHandler.tsx';
import DesktopSidebar from './components/layout/DesktopSidebar';
import IncomingCallNotification from './components/incoming-call/IncomingCallNotification.tsx';
import { motion } from 'motion/react';
import { useAuth } from './providers/AuthProvider';
import { ErrorBoundary } from 'react-error-boundary';
import SplashScreen from './components/SplashScreen';

function ErrorFallback({ error }: { error: any }) {
  return (
    <div className="h-[100dvh] flex flex-col items-center justify-center bg-[var(--bg-main)] p-6 text-center">
      <div className="w-16 h-16 bg-red-100/10 text-red-600 rounded-full flex items-center justify-center mb-4">
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 2 }}>
          <img src={APP_CONFIG.LOGO_URL} className="w-10 h-10 object-contain grayscale opacity-50" alt="Error" />
        </motion.div>
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6 max-w-xs">{error.message}</p>
      <button 
        onClick={() => window.location.href = '/'}
        className="bg-emerald-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
      >
        Restart App
      </button>
    </div>
  );
}

import ProfileTab from './features/profile/ProfileTab';

// Lazy Loading Features & Screens
const ChatsTab = React.lazy(() => import('./features/chat/ChatsTab'));
const ChatLayout = React.lazy(() => import('./features/chat/ChatLayout'));
const ChatScreen = React.lazy(() => import('./features/chat/ChatScreen'));
const MessagesListScreen = React.lazy(() => import('./features/chat/MessagesListScreen'));
const HideChatScreen = React.lazy(() => import('./features/chat/HideChatScreen'));
const ArchivedChatScreen = React.lazy(() => import('./features/chat/ArchivedChatScreen'));
const HideChatSettings = React.lazy(() => import('./features/chat/HideChatSettings'));
const SearchUserScreen = React.lazy(() => import('./features/chat/SearchUserScreen'));
const GrixAIScreen = React.lazy(() => import('./features/chat/GrixAIScreen'));
const ChatSettingsScreen = React.lazy(() => import('./features/chat/ChatSettingsScreen'));

const SearchTab = React.lazy(() => import('./features/search/SearchTab'));

const StoryMakerScreen = React.lazy(() => import('./features/stories/StoryMakerScreen'));
const StoryWatcherScreen = React.lazy(() => import('./features/stories/StoryWatcherScreen'));
const NotificationsScreen = React.lazy(() => import('./features/notifications/NotificationsScreen.tsx'));
const LikeNotificationsScreen = React.lazy(() => import('./features/notifications/LikeNotificationsScreen.tsx'));

// ProfileTab directly imported above
const EditProfileScreen = React.lazy(() => import('./features/profile/EditProfileScreen'));
const UserProfileScreen = React.lazy(() => import('./features/profile/UserProfileScreen'));
const GrixAIProfile = React.lazy(() => import('./features/profile/GrixAIProfile'));


const CallsTab = React.lazy(() => import('./features/call/CallsTab'));
const GroupsTab = React.lazy(() => import('./features/chat/GroupsTab'));
const CameraTab = React.lazy(() => import('./features/camera/CameraTab'));

const PrivacySettingsScreen = React.lazy(() => import('./features/settings/PrivacySettingsScreen'));
const AppPreferencesScreen = React.lazy(() => import('./features/settings/AppPreferencesScreen'));
// SettingsScreen directly imported above
const AccountSettingsScreen = React.lazy(() => import('./features/settings/AccountSettingsScreen'));
const NotificationsSettingsScreen = React.lazy(() => import('./features/settings/NotificationsSettingsScreen'));
const HelpScreen = React.lazy(() => import('./features/settings/HelpScreen'));
const AppInfoScreen = React.lazy(() => import('./features/settings/AppInfoScreen'));
const GithubScreen = React.lazy(() => import('./features/github/GithubScreen'));
const TimeSpentScreen = React.lazy(() => import('./features/settings/TimeSpentScreen'));
const FavoritesScreen = React.lazy(() => import('./features/settings/FavoritesScreen'));
const BlockedAccountsScreen = React.lazy(() => import('./features/settings/BlockedAccountsScreen'));
const MutedAccountsScreen = React.lazy(() => import('./features/settings/MutedAccountsScreen'));
const DataUsageScreen = React.lazy(() => import('./features/settings/DataUsageScreen'));
const NewGroupScreen = React.lazy(() => import('./features/chat/NewGroupScreen'));
const GroupSettingsScreen = React.lazy(() => import('./features/chat/GroupSettingsScreen'));

const LoginScreen = React.lazy(() => import('./features/auth/LoginScreen'));
const SignupScreen = React.lazy(() => import('./features/auth/SignupScreen'));
const ForgotPasswordScreen = React.lazy(() => import('./features/auth/ForgotPasswordScreen'));
const VerifyEmailScreen = React.lazy(() => import('./features/auth/VerifyEmailScreen'));
const CompleteProfileScreen = React.lazy(() => import('./features/auth/CompleteProfileScreen'));

const PrivacyPolicyScreen = React.lazy(() => import('./features/legal/PrivacyPolicyScreen'));
const TermsAndConditionsScreen = React.lazy(() => import('./features/legal/TermsAndConditionsScreen'));

const AppLockScreen = React.lazy(() => import('./features/lock/AppLockScreen'));
const SetupLockScreen = React.lazy(() => import('./features/lock/SetupLockScreen'));
const VerifyLockScreen = React.lazy(() => import('./features/lock/VerifyLockScreen'));
const GlobalLockScreen = React.lazy(() => import('./features/lock/GlobalLockScreen'));

const CallScreen = React.lazy(() => import('./features/call/CallScreen'));

import { storage } from './services/StorageService.ts';
import MainLayout from './components/layout/MainLayout.tsx';
import { LayoutProvider } from './contexts/LayoutContext.tsx';
import { NavProvider } from './contexts/NavContext.tsx';

const ImagePreviewScreen = React.lazy(() => import('./features/chat/ImagePreviewScreen'));

export default function App() {
  const { user, userData, loading: authLoading, isAuthReady } = useAuth();
  const [splashLoading, setSplashLoading] = useState(true);
  const location = useLocation();

  // Centralized Document Title Management
  useEffect(() => {
    const titles: { [key: string]: string } = {
      '/': 'Chats',
      '/chats': 'Chats',
      '/calls': 'Calls',
      '/reels': 'Reels',
      '/groups': 'Groups',
      '/profile': 'Profile',
      '/settings': 'Settings',
      '/login': 'Login',
      '/signup': 'Sign up',
      '/notifications': 'Notifications',
      '/create': 'New Post',
      '/stories/create': 'New Story',
      '/reels/create': 'New Reel',
      '/search': 'Search',
      '/grix-ai': 'Grix AI',
      '/verify-email': 'Verify Email',
      '/complete-profile': 'Complete Profile',
      '/forgot-password': 'Reset Password',
      '/app-lock': 'App Lock',
      '/privacy-policy': 'Privacy Policy',
      '/terms': 'Terms & Conditions',
      '/app-preferences': 'Preferences',
      '/app-info': 'About GrixChat',
      '/help': 'Help Center'
    };
    
    const path = location.pathname;
    let pageTitle = titles[path];

    // Handle dynamic paths
    if (!pageTitle) {
      if (path.startsWith('/user/')) pageTitle = 'User Profile';
      else if (path.startsWith('/chat/')) pageTitle = 'Chat';
      else if (path.startsWith('/stories/view/')) pageTitle = 'Story';
      else if (path.startsWith('/posts/')) pageTitle = 'Post';
    }
    
    const suffix = 'GrixChat';
    if (pageTitle && path !== '/') {
      document.title = `${pageTitle} • ${suffix}`;
    } else {
      document.title = suffix;
    }
  }, [location]);

  const [isUnlocked, setIsUnlocked] = useState(false);
  const [initialLockCheckDone, setInitialLockCheckDone] = useState(false);

  useEffect(() => {
    if (isAuthReady) {
      const lockData = LockService.getLockDataFromProfile(userData);
      if (!lockData.isEnabled) {
        setIsUnlocked(true);
      }
      setInitialLockCheckDone(true);
    }
  }, [isAuthReady, userData]);

  useEffect(() => {
    const loadCount = parseInt(storage.getItem('loadCount') || '0');
    storage.setItem('loadCount', (loadCount + 1).toString());
    console.log(`App Load Count: ${loadCount + 1}`);
    console.log(`Current Auth State: ${user ? 'Logged In' : 'Logged Out'}`);
    console.log(`Auth Ready: ${isAuthReady}`);
    
    CacheService.clearOldCache();
  }, [user]);

  // Dynamic theme-color meta tag sync
  useEffect(() => {
    const isDark = (userData?.preferences?.theme || 'light') === 'dark';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      // Light: #ffffff, Dark: #202124
      const color = isDark ? '#202124' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
  }, [userData?.preferences?.theme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  // Global Back Button Handler for Mobile
  useEffect(() => {
    if (window.history.length === 1) {
      window.history.pushState({ entry: 1 }, '');
    }
    const handlePopState = () => {};
    window.addEventListener('popstate', handlePopState);
    
    // Disable Context Menu Globally
    const handleContextMenu = (e: MouseEvent) => {
      // Allow context menu on input and textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const loading = !isAuthReady || authLoading || splashLoading;

  if (loading || !initialLockCheckDone) {
    return (
      <SplashScreen />
    );
  }

  if (!isUnlocked) {
    return <GlobalLockScreen onUnlock={() => setIsUnlocked(true)} />;
  }

  // Guard Logic
  const needsVerification = user && !user.email_confirmed_at && !(user.app_metadata?.providers || []).some((p: string) => ['google', 'github'].includes(p));
  const needsProfileCompletion = user && isAuthReady && (!userData || !userData.username);

  if (user && isAuthReady) {
    const isPublicRoute = ['/login', '/signup', '/forgot-password', '/privacy-policy', '/terms', '/complete-profile', '/verify-email'].includes(location.pathname);
    
    if (!isPublicRoute) {
      if (needsVerification) return <Navigate to="/verify-email" replace />;
      if (needsProfileCompletion) return <Navigate to="/complete-profile" replace />;
    }
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <NavProvider>
        <LayoutProvider>
          <div className="app-container">
            {user && <IncomingCallNotification />}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
              {user && <NotificationHandler />}
              <div className="flex-1 h-full relative overflow-hidden">
              <React.Suspense fallback={
                  <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
                    <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                }>
                  <Routes>
                    {/* Main Layout Routes */}
                    <Route element={<MainLayout />}>
                      <Route path="/" element={
                        !user ? <Navigate to="/login" /> : 
                        needsVerification ? <Navigate to="/verify-email" /> :
                        needsProfileCompletion ? <Navigate to="/complete-profile" /> :
                        <ChatsTab />
                      } />
                      <Route path="/chats" element={<Navigate to="/" replace />} />
                      <Route path="/chats/archived" element={user ? <ArchivedChatScreen /> : <Navigate to="/login" />} />
                      <Route path="/chats/hidden" element={user ? <HideChatScreen /> : <Navigate to="/login" />} />
                      <Route path="/chats/hidden/settings" element={user ? <HideChatSettings /> : <Navigate to="/login" />} />
                      <Route path="/groups" element={user ? <GroupsTab /> : <Navigate to="/login" />} />
                      <Route path="/search" element={user ? <SearchTab /> : <Navigate to="/login" />} />
                      <Route element={<ChatLayout />}>
                        <Route path="/chat/grix-ai" element={user ? <GrixAIScreen /> : <Navigate to="/login" />} />
                        <Route path="/chat/:id" element={user ? <ChatScreen /> : <Navigate to="/login" />} />
                        <Route path="/chat/:id/settings" element={user ? <ChatSettingsScreen /> : <Navigate to="/login" />} />
                      </Route>
                      <Route path="/calls" element={user ? <CallsTab /> : <Navigate to="/login" />} />
                      <Route path="/profile" element={user ? <ProfileTab /> : <Navigate to="/login" />} />
                    </Route>
    
                    {/* Other Routes */}
                    <Route path="/verify-email" element={
                      user && !user.email_confirmed_at ? <VerifyEmailScreen /> : <Navigate to="/" />
                    } />
                    <Route path="/complete-profile" element={
                      user && (!userData || !userData.username) ? <CompleteProfileScreen /> : <Navigate to="/" />
                    } />
                    <Route path="/camera" element={user ? <CameraTab /> : <Navigate to="/login" />} />
                    <Route path="/call/:id" element={user ? <CallScreen /> : <Navigate to="/login" />} />
                    <Route path="/notifications" element={user ? <NotificationsScreen /> : <Navigate to="/login" />} />
                    <Route path="/notifications/likes" element={user ? <LikeNotificationsScreen /> : <Navigate to="/login" />} />
                    <Route path="/stories/create" element={user ? <StoryMakerScreen /> : <Navigate to="/login" />} />
                    <Route path="/stories/view/:userId" element={user ? <StoryWatcherScreen /> : <Navigate to="/login" />} />
                    <Route path="/settings" element={<Navigate to="/profile" replace />} />
                    <Route path="/edit-profile" element={user ? <EditProfileScreen /> : <Navigate to="/login" />} />
                    <Route path="/privacy-settings" element={user ? <PrivacySettingsScreen /> : <Navigate to="/login" />} />
                    <Route path="/app-preferences" element={user ? <AppPreferencesScreen /> : <Navigate to="/login" />} />
                    <Route path="/account-settings" element={user ? <AccountSettingsScreen /> : <Navigate to="/login" />} />
                    <Route path="/app-lock" element={user ? <AppLockScreen /> : <Navigate to="/login" />} />
                    <Route path="/setup-lock/:type" element={user ? <SetupLockScreen /> : <Navigate to="/login" />} />
                    <Route path="/verify-lock" element={user ? <VerifyLockScreen /> : <Navigate to="/login" />} />
                    <Route path="/notifications-settings" element={user ? <NotificationsSettingsScreen /> : <Navigate to="/login" />} />
                    <Route path="/data-usage" element={user ? <DataUsageScreen /> : <Navigate to="/login" />} />
                    <Route path="/help" element={user ? <HelpScreen /> : <Navigate to="/login" />} />
                    <Route path="/app-info" element={user ? <AppInfoScreen /> : <Navigate to="/login" />} />
                    <Route path="/github" element={user ? <GithubScreen /> : <Navigate to="/login" />} />
                    <Route path="/time-spent" element={user ? <TimeSpentScreen /> : <Navigate to="/login" />} />
                    <Route path="/favorites" element={user ? <FavoritesScreen /> : <Navigate to="/login" />} />
                    <Route path="/blocked-accounts" element={user ? <BlockedAccountsScreen /> : <Navigate to="/login" />} />
                    <Route path="/muted-accounts" element={user ? <MutedAccountsScreen /> : <Navigate to="/login" />} />
                    <Route path="/new-group" element={user ? <NewGroupScreen /> : <Navigate to="/login" />} />
                    <Route path="/group-settings/:id" element={user ? <GroupSettingsScreen /> : <Navigate to="/login" />} />
                    <Route path="/login" element={!user ? <LoginScreen /> : <Navigate to="/" />} />
                    <Route path="/signup" element={!user ? <SignupScreen /> : <Navigate to="/" />} />
                    <Route path="/forgot-password" element={!user ? <ForgotPasswordScreen /> : <Navigate to="/" />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicyScreen />} />
                    <Route path="/terms" element={<TermsAndConditionsScreen />} />
                    <Route path="/messages" element={user ? <MessagesListScreen /> : <Navigate to="/login" />} />
                    <Route path="/search-user" element={<Navigate to="/search" replace />} />
                    <Route path="/user/:id" element={user ? <UserProfileScreen /> : <Navigate to="/login" />} />
                    <Route path="/chat/preview" element={user ? <ImagePreviewScreen /> : <Navigate to="/login" />} />
                    <Route path="/profile/grix-ai" element={user ? <GrixAIProfile /> : <Navigate to="/login" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </React.Suspense>
              </div>
            </div>
          </div>
        </LayoutProvider>
      </NavProvider>
    </ErrorBoundary>
  );
}
