import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider, setPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase, ref, onValue, set, onDisconnect, serverTimestamp as rtdbTimestamp } from "firebase/database";
import { getMessaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Debug Config (Sanitized)
if (typeof window !== 'undefined') {
  console.log('Firebase Config Loaded:', {
    projectId: firebaseConfig.projectId,
    hasApiKey: !!firebaseConfig.apiKey,
    hasMessagingId: !!firebaseConfig.messagingSenderId,
    hasAppId: !!firebaseConfig.appId
  });
}

// Export services
export const auth = getAuth(app);

// Safe persistence check
const getSafePersistence = () => {
  try {
    // Accessing window.localStorage itself can throw in some iframe contexts
    if (typeof window !== 'undefined' && window.localStorage) {
      return browserLocalPersistence;
    }
  } catch (e) {
    console.warn("LocalStorage access denied, falling back to session/memory persistence.");
  }
  
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return browserSessionPersistence;
    }
  } catch (e) {
    // Fallback to memory
  }
  
  return inMemoryPersistence;
};

// Set persistence explicitly to local with fallback
setPersistence(auth, getSafePersistence()).catch((err) => {
  console.error("Auth persistence error:", err);
});

export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);

// Messaging may not be supported in some environments (like iframes)
export const messagingPromise = (async () => {
  try {
    if (typeof window === 'undefined') return null;
    
    console.log('Checking FCM support...');
    const supported = await isSupported();
    console.log('FCM Supported:', supported);
    
    if (supported) {
      const messaging = getMessaging(app);
      console.log('FCM Messaging initialized');
      return messaging;
    } else {
      console.warn('FCM is not supported in this browser environment. (Usually due to iframe, insecure origin, or unsupported browser)');
    }
  } catch (e) {
    console.error('Error initializing Firebase Messaging:', e);
  }
  return null;
})();

// Presence Logic
export const setupPresence = (uid: string) => {
  const statusRef = ref(rtdb, `/status/${uid}`);
  const connectedRef = ref(rtdb, '.info/connected');

  onValue(connectedRef, (snap) => {
    if (snap.val() === false) return;

    onDisconnect(statusRef).set({
      state: 'offline',
      last_changed: rtdbTimestamp(),
    }).then(() => {
      set(statusRef, {
        state: 'online',
        last_changed: rtdbTimestamp(),
      });
    });
  });
};

export default app;
