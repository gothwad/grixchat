import React, { useState, useRef } from 'react';
import { Image as ImageIcon, MapPin, ChevronRight, User, Music, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { collection, addDoc, serverTimestamp, doc, onSnapshot } from 'firebase/firestore';
import { ImageService } from '../../services/ImageService.ts';
import SettingHeader from '../../components/layout/SettingHeader';

export default function CreatePostScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userData, setUserData] = useState<any>(null);

  React.useEffect(() => {
    if (auth.currentUser) {
      const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (s) => {
        setUserData(s.data());
      });
      return () => unsub();
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleShare = async () => {
    if (!image || !auth.currentUser) return;

    setLoading(true);
    try {
      const url = await ImageService.uploadImage(image, (p) => setUploadProgress(p));
      
      await addDoc(collection(db, "posts"), {
        userId: auth.currentUser.uid,
        userName: userData?.username || auth.currentUser.displayName || 'User',
        userAvatar: userData?.photoURL || '',
        imageUrl: url,
        caption,
        location,
        likes: 0,
        comments: 0,
        createdAt: serverTimestamp()
      });

      navigate('/');
    } catch (error) {
      console.error("Error sharing post:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader 
        title="New post" 
        rightElement={
          <button 
            onClick={handleShare}
            disabled={loading || !image}
            className="text-[var(--header-text)] font-black text-xs uppercase tracking-[0.2em] px-4 py-2 hover:bg-black/5 rounded-xl transition-all disabled:opacity-30"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Share'}
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {loading && (
          <div className="bg-blue-50/5 px-6 py-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Uploading {uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        )}

        <div className="max-w-xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Post Content */}
          <div className="flex gap-4 p-4 bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] items-start">
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-chat)] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden shrink-0 shadow-sm"
            >
              {previewUrl ? (
                <img src={previewUrl} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)]">
                  <ImageIcon size={20} className="text-blue-500" />
                  <span className="text-[8px] font-black uppercase tracking-tight text-center">Set Image</span>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
            </div>
            <div className="flex-1 min-h-[96px]">
              <textarea 
                placeholder="Write a caption..."
                className="w-full h-full bg-transparent p-1 text-sm font-medium text-[var(--text-primary)] focus:outline-none resize-none placeholder:text-[var(--text-secondary)]/40"
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-color)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] hover:bg-black/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <MapPin size={18} className="text-[var(--text-secondary)]" />
                <input 
                  type="text" 
                  placeholder="Add location" 
                  className="text-sm font-medium focus:outline-none bg-transparent flex-1 placeholder:text-[var(--text-secondary)]/40"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
            </div>
            
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-color)] hover:bg-black/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <User size={18} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Tag people</span>
              </div>
              <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
            </div>

            <div className="flex items-center justify-between px-5 py-4 hover:bg-black/5 cursor-pointer transition-colors">
              <div className="flex items-center gap-4">
                <Music size={18} className="text-[var(--text-secondary)]" />
                <span className="text-sm font-medium text-[var(--text-primary)]">Add music</span>
              </div>
              <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
            </div>
          </div>

          <div className="p-4">
            <p className="text-[10px] font-bold text-[var(--text-secondary)]/60 text-center uppercase tracking-widest leading-relaxed">
              Your post will be shared with your followers and appear on your profile.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
