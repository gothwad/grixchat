import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { db } from '../../../services/firebase';

export const profileService = {
  async getProfile(uid: string) {
    const docSnap = await getDoc(doc(db, "users", uid));
    return docSnap.exists() ? docSnap.data() : null;
  },

  async updateProfile(uid: string, data: any) {
    return updateDoc(doc(db, "users", uid), data);
  },

  async followUser(currentUid: string, targetUid: string) {
    await updateDoc(doc(db, "users", currentUid), {
      following: arrayUnion(targetUid)
    });
    await updateDoc(doc(db, "users", targetUid), {
      followers: arrayUnion(currentUid)
    });
  },

  async unfollowUser(currentUid: string, targetUid: string) {
    await updateDoc(doc(db, "users", currentUid), {
      following: arrayRemove(targetUid)
    });
    await updateDoc(doc(db, "users", targetUid), {
      followers: arrayRemove(currentUid)
    });
  },

  async setOnlineStatus(uid: string, isOnline: boolean) {
    return updateDoc(doc(db, "users", uid), {
      isOnline,
      lastSeen: serverTimestamp()
    });
  }
};
