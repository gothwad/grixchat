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
  Trash2,
  Youtube
} from 'lucide-react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { ImageService } from '../../services/ImageService';
import { SupabaseStorageService } from '../../services/SupabaseStorageService';

export default function ReelsMakerScreen() {
  const navigate = useNavigate();
  const { user: authUser, userData } = useAuth();
  const videoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<'upload' | 'youtube'>('upload');
  const [formData, setFormData] = useState({
    caption: '',
    description: '',
    location: '',
    mentions: '',
    youtubeUrl: '',
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

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const handleYoutubeUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, youtubeUrl: url }));
    const id = extractYoutubeId(url);
    if (id) {
      setVideoPreview(`https://img.youtube.com/vi/${id}/maxresdefault.jpg`);
      // Also set cover if not already set
      if (!coverPreview) {
        setCoverPreview(`https://img.youtube.com/vi/${id}/hqdefault.jpg`);
      }
    }
  };

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

  const handlePost = async () => {
    if (mode === 'upload' && !videoFile) {
      alert("Please select a video.");
      return;
    }

    if (mode === 'youtube' && !extractYoutubeId(formData.youtubeUrl)) {
      alert("Please enter a valid YouTube URL.");
      return;
    }

    if (!coverFile && !coverPreview) {
      alert("Please select a cover image.");
      return;
    }

    if (!authUser || !supabase) return;

    setIsPosting(true);
    setUploadProgress(10); 

    try {
      setUploadProgress(20);
      let coverUrl = coverPreview;
      
      // Only upload to Supabase if it's a file
      if (coverFile) {
        coverUrl = await ImageService.uploadImage(coverFile, (p) => setUploadProgress(20 + (p * 0.2)), 'reels');
      }
      
      setUploadProgress(40);
      let videoUrl = '';
      let youtubeId = null;

      if (mode === 'upload' && videoFile) {
        videoUrl = await SupabaseStorageService.uploadVideo(videoFile, (p) => setUploadProgress(40 + (p * 0.4)), 'reels');
      } else {
        youtubeId = extractYoutubeId(formData.youtubeUrl);
      }
      
      setUploadProgress(80);

      const mentions = formData.mentions.split(',').map(m => m.trim()).filter(Boolean);

      const { error } = await supabase.from('reels').insert({
        user_id: authUser.id,
        video_url: videoUrl,
        youtube_id: youtubeId,
        thumbnail_url: coverUrl,
        caption: formData.caption,
        description: formData.description,
        location: formData.location,
        mentions,
        likes_count: 0,
        comments_count: 0,
        allow_comments: formData.allowComments,
        hide_likes: formData.hideLikes,
        audio_title: `Original Audio - ${userData?.fullName || 'User'}`
      } as any);

      if (error) throw error;

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
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                const nextMode = mode === 'upload' ? 'youtube' : 'upload';
                setMode(nextMode);
                // Clear previews if switching to keep it clean, or keep them? 
                // Let's clear previews to avoid confusion between upload video and youtube thumb
                setVideoPreview(null);
                setVideoFile(null);
                if (nextMode === 'youtube' && formData.youtubeUrl) {
                  handleYoutubeUrlChange(formData.youtubeUrl);
                }
              }}
              className={`p-2 rounded-full transition-all ${mode === 'youtube' ? 'bg-red-500/10 text-red-500 shadow-sm' : 'hover:bg-black/5 text-[var(--text-secondary)]'}`}
              title={mode === 'upload' ? 'Switch to YouTube URL' : 'Switch to Video Upload'}
            >
              <Youtube size={22} className={mode === 'youtube' ? 'animate-pulse' : ''} />
            </button>
            <button 
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-black/5 transition-all text-[var(--text-secondary)]"
            >
              <X size={24} />
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto py-6 space-y-6">
          
          {/* Section 1: Cover & Description */}
          <div className="flex gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] items-start shadow-sm">
            <div 
              onClick={() => coverInputRef.current?.click()}
              className="relative w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-main)] flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden shrink-0 shadow-sm"
            >
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover" alt="Cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-[var(--text-secondary)]">
                  <ImageIcon size={20} className="text-blue-500" />
                  <span className="text-[9px] font-black uppercase tracking-tight text-center">Cover</span>
                </div>
              )}
              <input type="file" ref={coverInputRef} onChange={handleCoverSelect} className="hidden" accept="image/*" />
            </div>
            <div className="flex-1 min-h-[96px]">
              <textarea 
                placeholder="Detailed description..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full h-full bg-transparent p-1 text-sm font-medium text-[var(--text-primary)] focus:outline-none resize-none placeholder:text-[var(--text-secondary)]/40"
              />
            </div>
          </div>

          {/* Section 2: Video/YouTube & Caption */}
          <div className="flex gap-4 bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-color)] items-start shadow-sm">
            <div 
              onClick={() => mode === 'upload' ? videoInputRef.current?.click() : null}
              className={`relative w-24 h-24 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-zinc-900 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden shrink-0 shadow-sm ${mode === 'youtube' ? 'cursor-default border-red-500/30' : ''}`}
            >
              {videoPreview ? (
                <div className="relative w-full h-full">
                  {mode === 'upload' ? (
                    <video src={videoPreview} className="w-full h-full object-cover" />
                  ) : (
                    <img src={videoPreview} className="w-full h-full object-cover" alt="YouTube Preview" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    {mode === 'upload' ? <Video size={16} className="text-white" /> : <Youtube size={16} className="text-white" />}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-zinc-500">
                  {mode === 'upload' ? <Video size={20} className="text-blue-500" /> : <Youtube size={20} className="text-red-500" />}
                  <span className="text-[9px] font-black uppercase tracking-tight text-center">
                    {mode === 'upload' ? 'Video' : 'YouTube'}
                  </span>
                </div>
              )}
              {mode === 'upload' && <input type="file" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" accept="video/*" />}
            </div>
            <div className="flex-1 space-y-3 min-h-[96px]">
              {mode === 'youtube' && (
                <div className="relative group">
                  <Youtube size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500 transition-transform group-focus-within:scale-110" />
                  <input 
                    type="text"
                    placeholder="https://youtube.com/watch?v=..."
                    value={formData.youtubeUrl}
                    onChange={(e) => handleYoutubeUrlChange(e.target.value)}
                    className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-[var(--text-primary)] focus:outline-none focus:border-red-500 transition-colors shadow-inner"
                  />
                </div>
              )}
              <textarea 
                placeholder="Catchy caption (displays on reel animated)..."
                value={formData.caption}
                onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
                className="w-full h-full bg-transparent p-1 text-sm font-medium text-[var(--text-primary)] focus:outline-none resize-none placeholder:text-[var(--text-secondary)]/40"
              />
            </div>
          </div>

          {/* Metadata Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative">
              <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              <input 
                type="text" placeholder="Location" value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
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

