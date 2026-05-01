import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Send, 
  X, 
  Image as ImageIcon, 
  CheckCircle2, 
  Youtube,
  Link as LinkIcon,
  Type,
  FileText,
  Layout,
  Clock,
  Hash,
  Loader2
} from 'lucide-react';
import SettingHeader from '../../../components/layout/SettingHeader.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../../../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../../providers/AuthProvider';

const TUBE_CATEGORIES = ['All', 'Music', 'Gaming', 'Mixes', 'Live', 'Comedy', 'Programming', 'News', 'Education', 'Vlogs'];

export default function TubeUploadScreen() {
  const navigate = useNavigate();
  const { user, userData } = useAuth();
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    category: 'All',
    duration: '',
    tags: ''
  });
  
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleThumbnailSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
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

  const extractYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleUpload = async () => {
    if (!user) return;
    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }
    if (!formData.youtubeUrl.trim() || !extractYoutubeId(formData.youtubeUrl)) {
      alert("Please enter a valid YouTube URL");
      return;
    }
    if (!thumbnailFile) {
      alert("Please upload a thumbnail image");
      return;
    }

    setIsUploading(true);
    try {
      const thumbnailUrl = await uploadToImgBB(thumbnailFile);
      
      const videoData = {
        userId: user.uid,
        userName: userData?.fullName || user.displayName || 'Anonymous',
        userAvatar: userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=random`,
        youtubeUrl: formData.youtubeUrl,
        thumbnail: thumbnailUrl,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        views: 0,
        likes: 0,
        createdAt: serverTimestamp(),
        duration: formData.duration || '0:00',
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
      };

      await addDoc(collection(db, 'tube_videos'), videoData);
      
      setShowSuccess(true);
      setTimeout(() => {
        navigate('/reels/grixtube');
      }, 2000);
    } catch (error: any) {
      console.error("Error uploading tube video:", error);
      alert(error.message || "Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--text-primary)]">
      <SettingHeader 
        title="Upload to Tube" 
        rightElement={
          <button onClick={() => navigate(-1)} className="p-2">
            <X size={24} />
          </button>
        }
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="max-w-2xl mx-auto space-y-6 pb-20 text-blue-500">
          
          {/* Thumbnail Section */}
          <div 
            onClick={() => thumbnailInputRef.current?.click()}
            className="aspect-video w-full rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden relative group"
          >
            {thumbnailPreview ? (
              <img src={thumbnailPreview} className="w-full h-full object-cover" alt="Thumbnail Preview" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-secondary)]">
                <ImageIcon size={40} className="group-hover:text-blue-500 transition-colors" />
                <span className="font-bold">Upload Thumbnail</span>
                <span className="text-xs opacity-60">High quality image for your video cover</span>
              </div>
            )}
            <input 
              type="file" 
              ref={thumbnailInputRef} 
              onChange={handleThumbnailSelect} 
              className="hidden" 
              accept="image/*" 
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            {/* YouTube URL */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center gap-3 mb-2">
                <Youtube size={20} className="text-red-500" />
                <span className="text-sm font-bold">YouTube URL</span>
              </div>
              <input 
                type="text"
                placeholder="https://www.youtube.com/watch?v=..."
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({...formData, youtubeUrl: e.target.value})}
                className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 font-medium"
              />
            </div>

            {/* Title */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center gap-3 mb-2">
                <Type size={20} className="text-blue-500" />
                <span className="text-sm font-bold">Video Title</span>
              </div>
              <input 
                type="text"
                placeholder="Give your video a catchy title"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 font-medium"
              />
            </div>

            {/* Description */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center gap-3 mb-2">
                <FileText size={20} className="text-emerald-500" />
                <span className="text-sm font-bold">Description</span>
              </div>
              <textarea 
                placeholder="Tell viewers what your video is about"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 font-medium min-h-[100px] resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-2">
                  <Layout size={20} className="text-purple-500" />
                  <span className="text-sm font-bold">Category</span>
                </div>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none font-medium"
                >
                  {TUBE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              {/* Duration */}
              <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
                <div className="flex items-center gap-3 mb-2">
                  <Clock size={20} className="text-orange-500" />
                  <span className="text-sm font-bold">Duration (MM:SS)</span>
                </div>
                <input 
                  type="text"
                  placeholder="e.g. 10:45"
                  value={formData.duration}
                  onChange={(e) => setFormData({...formData, duration: e.target.value})}
                  className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 font-medium"
                />
              </div>
            </div>

            {/* Tags */}
            <div className="bg-[var(--bg-card)] rounded-2xl p-4 border border-[var(--border-color)]">
              <div className="flex items-center gap-3 mb-2">
                <Hash size={20} className="text-pink-500" />
                <span className="text-sm font-bold">Tags (comma separated)</span>
              </div>
              <input 
                type="text"
                placeholder="vlog, music, technology"
                value={formData.tags}
                onChange={(e) => setFormData({...formData, tags: e.target.value})}
                className="w-full bg-transparent text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-secondary)]/40 font-medium"
              />
            </div>
          </div>

          <button 
            onClick={handleUpload}
            disabled={isUploading}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all ${
              isUploading 
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
              : 'bg-blue-500 text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isUploading ? <><Loader2 size={18} className="animate-spin" /> Publishing...</> : <><Send size={18} /> Publish Video</>}
          </button>

        </div>
      </div>

      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center text-center p-8"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 12 }}
              className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle2 size={48} />
            </motion.div>
            <h2 className="text-2xl font-black text-zinc-900 mb-2">VIDEO PUBLISHED!</h2>
            <p className="text-zinc-500 text-sm italic">Sharing your content with the world.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
