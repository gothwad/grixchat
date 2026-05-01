import { useEffect } from 'react';
import { messagingPromise, auth, db } from '../services/firebase.ts';
import { getToken, onMessage } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { useAuth } from '../providers/AuthProvider';

export default function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const initMessaging = async () => {
      console.log('FCM: Initializing...');
      
      const isIframe = window.self !== window.top;
      
      const messaging = await messagingPromise;
      if (!messaging) {
        console.warn('FCM: Messaging instance is null.');
        if (isIframe) {
          console.warn('FCM: Notifications are likely disabled because the app is running inside an iframe. Please open GrixChat in a new tab.');
        }
        return;
      }
      
      if (!auth.currentUser) {
        console.warn('FCM: No authenticated user');
        return;
      }

      if (typeof Notification === 'undefined') {
        console.warn('FCM: Notification API not supported by browser');
        return;
      }

      // Detect iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;

      if (isIOS && !isStandalone) {
        console.warn('On iOS, notifications only work if you "Add to Home Screen" first.');
        // We could show a UI hint here
      }

      try {
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey || vapidKey === "undefined") {
          console.error('VITE_FIREBASE_VAPID_KEY is missing! Notifications will not work.');
          return;
        }

        let registration;
        if ('serviceWorker' in navigator) {
          console.log('Registering Service Worker for FCM...');
          registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
             scope: '/'
          });
          console.log('Service Worker registered successfully');
        } else {
          console.warn('Service Worker is not supported in this browser');
          return;
        }

        // Wait for SW to be active
        let sw = registration.installing || registration.waiting || registration.active;
        if (sw) {
          if (sw.state === 'activated') {
            console.log('SW already active');
          } else {
            sw.addEventListener('statechange', (e: any) => {
              if (e.target.state === 'activated') console.log('SW newly activated');
            });
          }
        }

        await navigator.serviceWorker.ready;

        const permission = await Notification.requestPermission();
        console.log('Notification permission status:', permission);
        
        if (permission === 'granted') {
          console.log('Getting FCM Token...');
          try {
            const token = await getToken(messaging, {
              vapidKey: vapidKey,
              serviceWorkerRegistration: registration
            });

            if (token) {
              console.log('FCM Token received:', token);
              const userRef = doc(db, 'users', auth.currentUser.uid);
              await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
              });
              console.log('FCM Token saved to Firestore');
            } else {
              console.warn('No FCM Token received - possible VAPID key mismatch');
            }
          } catch (tokenError: any) {
            console.error('Error getting FCM token:', tokenError);
            if (tokenError.code === 'messaging/invalid-vapid-key') {
              alert("FCM Error: The VAPID key in your settings is invalid. Please check Firebase Console.");
            }
          }
        } else if (permission === 'denied') {
          console.warn('Notification permission denied by user');
        }
      } catch (error: any) {
        console.error('Error in FCM initialization:', error);
      }

      // Listen for foreground messages
      console.log('Setting up foreground message listener...');
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        if (payload.notification) {
          try {
            new Notification(payload.notification.title || 'New Message', {
              body: payload.notification.body,
              icon: '/logo.png'
            });
          } catch (e) {
            console.warn('Failed to show foreground notification:', e);
          }
        }
      });
      return unsubscribe;
    };

    let unsubscribeFn: (() => void) | undefined;
    if (user) {
      initMessaging().then(unsub => {
        unsubscribeFn = unsub;
      }).catch(err => {
        console.error('initMessaging failed:', err);
      });
    }

    return () => {
      if (unsubscribeFn) {
        console.log('Cleaning up FCM listener');
        unsubscribeFn();
      }
    };
  }, [user]);

  return null;
}
