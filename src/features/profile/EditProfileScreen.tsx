import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { storage } from '../../services/StorageService';
import { ImageService } from '../../services/ImageService';
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function EditProfileScreen() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Form States
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [photoURL, setPhotoURL] = useState('');

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  useEffect(() => {
    const fetchUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, "users", auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setFullName(data.fullName || '');
          setUsername(data.username || '');
          setBio(data.bio || 'Available');
          setNickname(data.nickname || '');
          setEmail(data.email || auth.currentUser.email || '');
          setPhoneNumber(data.phoneNumber || '');
          setPhotoURL(data.photoURL || DEFAULT_LOGO);
        }
      }
    };
    fetchUserData();
  }, []);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const url = await ImageService.uploadImage(file);
      setPhotoURL(url);
    } catch (err: any) {
      console.error("Image upload failed:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !userData) return;
    setLoading(true);
    setError(null);

    const trimmedUsername = username.trim().toLowerCase();

    try {
      // Username uniqueness check
      if (trimmedUsername !== userData.username) {
        const q = query(collection(db, "users"), where("username", "==", trimmedUsername));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const isTakenByOther = querySnapshot.docs.some(doc => doc.id !== auth.currentUser?.uid);
          if (isTakenByOther) {
            throw new Error("This username is already taken. Please try another one.");
          }
        }
      }

      const userRef = doc(db, "users", auth.currentUser.uid);
      const updateData = {
        fullName: fullName.trim(),
        username: trimmedUsername,
        bio: bio.trim() || 'Available',
        nickname: nickname.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        photoURL: photoURL
      };

      await updateDoc(userRef, updateData);

      // Update local storage cache
      const cachedData = storage.getItem(`user_data_${auth.currentUser.uid}`);
      if (cachedData) {
        try {
          const parsed = JSON.parse(cachedData);
          const updatedCache = { ...parsed, ...updateData };
          storage.setItem(`user_data_${auth.currentUser.uid}`, JSON.stringify(updatedCache));
        } catch (e) {
          console.warn('Error updating cached profile data');
        }
      }

      navigate('/profile');
    } catch (err: any) {
      console.error("Error updating profile:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field: string, label: string, value: string, setter: (v: string) => void, isTextArea: boolean = false, type: string = 'text') => {
    return (
      <div className="space-y-2">
        <label className="text-xs font-bold text-[var(--text-primary)] ml-1">{label}</label>
        {isTextArea ? (
          <textarea
            value={value}
            onChange={(e) => setter(e.target.value)}
            rows={3}
            className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-secondary)]/50 resize-none"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        ) : (
          <input 
            type={type}
            value={value}
            onChange={(e) => setter(e.target.value)}
            className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 transition-all placeholder:text-[var(--text-secondary)]/50"
            placeholder={`Enter your ${label.toLowerCase()}`}
          />
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      <SettingHeader 
        title="Edit Profile" 
        rightElement={
          <button 
            onClick={handleSave}
            disabled={loading || uploading}
            className="text-[var(--header-text)] font-bold text-sm active:scale-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Done'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Hidden File Input */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleImageChange}
          accept="image/*"
          className="hidden"
        />

        {/* Profile Picture Section */}
        <div className="py-8 flex flex-col items-center">
          <div className="relative group">
            <div className="w-24 h-24 rounded-full overflow-hidden border border-[var(--border-color)] relative bg-[var(--bg-card)]">
              <img 
                src={photoURL || DEFAULT_LOGO} 
                className={`w-full h-full object-cover transition-opacity ${uploading ? 'opacity-30' : 'opacity-100'}`}
                referrerPolicy="no-referrer"
                alt="Profile"
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 size={24} className="text-[var(--primary)] animate-spin" />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-black/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
            >
              <Camera size={24} className="text-white" />
            </button>
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-3 text-sm font-bold text-[var(--primary)] active:opacity-70 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Change profile photo'}
          </button>
        </div>

        <div className="px-8 pb-12 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-600">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{error}</p>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-5">
            {renderField('fullName', 'Name', fullName, setFullName)}
            {renderField('nickname', 'Nickname', nickname, setNickname)}
            {renderField('username', 'Username', username, setUsername)}
            {renderField('bio', 'Bio', bio, setBio, true)}
            
            <div className="pt-4">
              <h3 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] mb-4 ml-1">Private Information</h3>
              <div className="space-y-5">
                {renderField('email', 'Email Address', email, setEmail, false, 'email')}
                {renderField('phoneNumber', 'Phone Number', phoneNumber, setPhoneNumber, false, 'tel')}
              </div>
            </div>
          </div>

          {/* Footer Branding */}
          <div className="pt-12 flex flex-col items-center gap-1 opacity-40">
            <span className="text-[var(--text-secondary)] text-[10px] font-medium uppercase tracking-widest">Powered by</span>
            <span className="text-[var(--text-primary)] font-black tracking-[0.3em] uppercase text-[9px]">Gothwad technologies</span>
          </div>
        </div>
      </div>
    </div>
  );
}
