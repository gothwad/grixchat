import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  signInWithPopup,
  sendEmailVerification,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../../../services/firebase';

export const authService = {
  async login(email: string, pass: string) {
    return signInWithEmailAndPassword(auth, email, pass);
  },

  async signup(email: string, pass: string, fullName: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    
    await updateProfile(user, { displayName: fullName });
    await sendEmailVerification(user);
    
    return user;
  },

  async loginWithGoogle() {
    return signInWithPopup(auth, googleProvider);
  },

  async logout() {
    return signOut(auth);
  },

  async createUserProfile(uid: string, data: any) {
    return setDoc(doc(db, "users", uid), {
      ...data,
      createdAt: new Date(),
      isOnline: true,
      lastSeen: new Date()
    });
  },

  async getUserProfile(uid: string) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? docSnap.data() : null;
  }
};
