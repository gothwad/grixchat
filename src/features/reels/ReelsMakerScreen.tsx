import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  Camera, 
  X, 
  Type, 
  Image as ImageIcon, 
  CheckCircle2, 
  Video, 
  MapPin, 
  Hash, 
  AtSign,
  Loader2,
  Trash2
} from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../providers/AuthProvider';

export default function ReelsMakerScreen() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    caption: '',
    description: '',
    location: '',
    tags: '',
    mentions: '',
    allowComments: true,
    hideLikes: false
  });
  
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  
  const [isPosting, setIsPosting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 100 * 1024 * 1024) {
        alert("Video is too large. Maximum size is 100MB.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const uploadToImgBB = async (file: File) => {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    if (!apiKey) throw new Error("ImgBB API key is missing");

    const formData = new FormData();
    formData.append("image", file);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (!data.success) throw new Error(data.error?.message || "ImgBB upload failed");
    return data.data.url;
  };

  const uploadToCloudinary = async (file: File) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    
    if (!cloudName || !uploadPreset) throw new Error("Cloudinary config is missing");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);
    formData.append("resource_type", "video");

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/video/upload`, {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message || "Cloudinary upload failed");
    return data.secure_url;
  };

  const handlePost = async () => {
    if (!videoFile) {
      alert("Please select a video.");
      return;
    }

    if (!coverFile) {
      alert("Please select a cover image.");
      return;
    }

    if (!user) return;

    setIsPosting(true);
    setUploadProgress(10); 

    try {
      setUploadProgress(20);
      const coverUrl = await uploadToImgBB(coverFile);
      
      setUploadProgress(40);
      const videoUrl = await uploadToCloudinary(videoFile);
      setUploadProgress(80);

      const tags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
      const mentions = formData.mentions.split(',').map(m => m.trim()).filter(Boolean);

      await addDoc(collection(db, 'reels'), {
        userUid: user.uid,
        userName: userData?.fullName || user.displayName || 'Anonymous',
        userAvatar: userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`,
        videoUrl,
        cover: coverUrl,
        caption: formData.caption,
        description: formData.description,
        location: formData.location,
        tags,
        mentions,
        likes: 0,
        likedBy: [],
        comments: 0,
        allowComments: formData.allowComments,
        hideLikes: formData.hideLikes,
        createdAt: serverTimestamp(),
        audio: `Original Audio - ${userData?.fullName || user.displayName || 'User'}`
      });

      setUploadProgress(100);
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/reels');
      }, 2000);
    } catch (error: any) {
      console.error("Error posting reel:", error);
      alert(error.message || "Failed to post reel. Please try again.");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-primary)] overflow-hidden">
      <SettingHeader 
        title="Create Reel" 
        rightElement={
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-black/5 transition-all"
          >
            <X size={24} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto py-6 space-y-6">
          
          {/* Section 1: Cover & Description */}
          <div className="flex gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] items-start">
            <div 
              onClick={() => coverInputRef.current?.click()}
              className="relative w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-main)] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden shrink-0 shadow-sm"
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)]">
                  <ImageIcon size={18} className="text-blue-500" />
                  <span className="text-[8px] font-black uppercase tracking-tight text-center">Cover</span>
                </div>
              )}
              <input type="file" ref={coverInputRef} onChange={handleCoverSelect} className="hidden" accept="image/*" />
            </div>
            <div className="flex-1 min-h-[80px]">
              <textarea 
                placeholder="Detailed description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-full bg-transparent p-1 text-sm font-medium text-[var(--text-primary)] focus:outline-none resize-none placeholder:text-[var(--text-secondary)]/40"
              />
            </div>
          </div>

          {/* Section 2: Video & Caption */}
          <div className="flex gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] items-start">
            <div 
              onClick={() => videoInputRef.current?.click()}
              className="relative w-20 h-20 rounded-xl border-2 border-dashed border-[var(--border-color)] bg-zinc-900 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden shrink-0 shadow-sm"
            >
              {videoPreview ? (
                <div className="relative w-full h-full">
                  <video src={videoPreview} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Video size={14} className="text-white" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  <Video size={18} className="text-blue-500" />
                  <span className="text-[8px] font-black uppercase tracking-tight text-center">Video</span>
                </div>
              )}
              <input type="file" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" accept="video/*" />
            </div>
            <div className="flex-1 min-h-[80px]">
              <textarea 
                placeholder="Catchy caption (on reel)..."
                value={formData.caption}
                onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                className="w-full h-full bg-transparent p-1 text-sm font-medium text-[var(--text-primary)] focus:outline-none resize-none placeholder:text-[var(--text-secondary)]/40"
              />
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" placeholder="Location" value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                className="w-full bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <Hash size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" placeholder="Tags" value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                className="w-full bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="relative">
              <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" placeholder="Mentions" value={formData.mentions}
                onChange={(e) => setFormData(prev => ({ ...prev, mentions: e.target.value }))}
                className="w-full bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Advanced Settings */}
          <div className="bg-[var(--bg-card)] rounded-3xl p-6 border border-[var(--border-color)] space-y-5">
            <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Advanced Settings</h4>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Allow Comments</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Let others join the conversation on this reel.</p>
              </div>
              <button 
                onClick={() => setFormData(prev => ({ ...prev, allowComments: !prev.allowComments }))}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${formData.allowComments ? 'bg-blue-500' : 'bg-zinc-200'}`}
              >
                <motion.div 
                  animate={{ x: formData.allowComments ? 20 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">Hide Like Count</p>
                <p className="text-[11px] text-[var(--text-secondary)]">Only you will see the total number of likes.</p>
              </div>
              <button 
                onClick={() => setFormData(prev => ({ ...prev, hideLikes: !prev.hideLikes }))}
                className={`w-11 h-6 rounded-full transition-colors flex items-center px-1 ${formData.hideLikes ? 'bg-blue-500' : 'bg-zinc-200'}`}
              >
                <motion.div 
                  animate={{ x: formData.hideLikes ? 20 : 0 }}
                  className="w-4 h-4 bg-white rounded-full shadow-sm"
                />
              </button>
            </div>
          </div>

          <button 
            onClick={handlePost}
            disabled={isPosting}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 transition-all ${
              isPosting 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed border border-[var(--border-color)]' 
              : 'bg-blue-500 text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isPosting ? <><Loader2 size={18} className="animate-spin" /> Uploading {uploadProgress}%</> : <><Send size={18} /> Share Reel</>}
          </button>
        </div>
      </div>

      {/* Success Overlay */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-white flex flex-col items-center justify-center text-center p-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tight">Published!</h2>
            <p className="text-zinc-500 text-sm">Your reel has been shared with your followers.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

