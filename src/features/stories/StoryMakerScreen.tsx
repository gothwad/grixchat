import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Check, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ImageService } from '../../services/ImageService.ts';

export default function StoryMakerScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (!image || !auth.currentUser) return;

    setLoading(true);
    try {
      const url = await ImageService.uploadImage(image, (p) => setUploadProgress(p));
      
      await addDoc(collection(db, "stories"), {
        userId: auth.currentUser.uid,
        username: auth.currentUser.displayName || 'User',
        photoURL: auth.currentUser.photoURL || '',
        imageUrl: url,
        timestamp: serverTimestamp(),
        viewers: []
      });

      navigate('/');
    } catch (error) {
      console.error("Error creating story:", error);
      alert("Failed to share story.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0">
        <button onClick={() => navigate(-1)} className="text-white">
          <X size={28} />
        </button>
        <h2 className="text-white font-bold">Add to Story</h2>
        <div className="w-7" />
      </div>

      {/* Preview Area */}
      <div className="flex-1 relative flex items-center justify-center bg-zinc-900 overflow-hidden">
        {previewUrl ? (
          <img src={previewUrl} className="w-full h-full object-contain" />
        ) : (
          <div className="flex flex-col items-center gap-4 text-zinc-500">
            <Camera size={64} />
            <p className="text-sm">Select a photo for your story</p>
          </div>
        )}

        {loading && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="text-white animate-spin" size={48} />
            <p className="text-white font-bold">{uploadProgress}%</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 shrink-0 flex items-center justify-center gap-8">
        {!previewUrl ? (
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-lg"
          >
            <ImageIcon size={32} />
          </button>
        ) : (
          <>
            <button 
              onClick={() => { setImage(null); setPreviewUrl(null); }}
              className="w-14 h-14 bg-zinc-800 rounded-full flex items-center justify-center text-white"
            >
              <X size={28} />
            </button>
            <button 
              onClick={handleUpload}
              disabled={loading}
              className="w-14 h-14 bg-blue-500 rounded-full flex items-center justify-center text-white shadow-lg"
            >
              <Check size={28} />
            </button>
          </>
        )}
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileSelect} 
      />
    </div>
  );
}
