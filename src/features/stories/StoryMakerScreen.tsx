import React, { useState, useRef } from 'react';
import { X, Camera, Image as ImageIcon, Check, Loader2, PenTool, Music, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { ImageService } from '../../services/ImageService.ts';
import TextStoryEditor from './components/TextStoryEditor';
import MusicSearchSheet from './components/MusicSearchSheet';
import { Track } from './utils/musicData';

type CreatorMode = 'choose' | 'text' | 'image';

export default function StoryMakerScreen() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user: authUser } = useAuth();
  
  // Modes and previews
  const [mode, setMode] = useState<CreatorMode>('choose');
  const [image, setImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Music loops properties
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showMusicSheet, setShowMusicSheet] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setMode('image');
    }
  };

  const handleUploadImageStory = async () => {
    if (!image || !authUser || !supabase) return;

    setLoading(true);
    try {
      const url = await ImageService.uploadImage(image, (p) => setUploadProgress(p), 'stories');
      
      const { error } = await supabase.from('stories').insert({
        user_id: authUser.id,
        media_url: url,
        type: 'image',
        music_title: selectedTrack?.title || null,
        music_artist: selectedTrack?.artist || null,
        music_url: selectedTrack?.url || null
      } as any);

      if (error) throw error;
      navigate('/chats');
    } catch (error) {
      console.error("Error creating image story:", error);
      alert("Failed to share story.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostTextStory = async (text: string, bgColor: string, fontClass: string, track: Track | null) => {
    if (!authUser || !supabase) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('stories').insert({
        user_id: authUser.id,
        type: 'text',
        text_content: text,
        bg_color: bgColor,
        filter_applied: fontClass, // using filter_applied field to store font style to keep database backward-compatible
        music_title: track?.title || null,
        music_artist: track?.artist || null,
        music_url: track?.url || null
      } as any);

      if (error) throw error;
      navigate('/chats');
    } catch (error) {
      console.error("Error creating text story:", error);
      alert("Failed to share text story.");
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'text') {
    return (
      <TextStoryEditor
        onCancel={() => setMode('choose')}
        onPostTextStory={handlePostTextStory}
        onOpenMusicSelector={() => setShowMusicSheet(true)}
        selectedTrack={selectedTrack}
        onRemoveTrack={() => setSelectedTrack(null)}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-[#090d16] text-white z-50 flex flex-col font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-16 shrink-0 border-b border-white/5 bg-black/20">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/10 rounded-full cursor-pointer">
          <X size={24} />
        </button>
        <span className="text-sm font-black uppercase tracking-widest text-[#0494f4]">Add to Stories</span>
        <div className="w-8" />
      </div>

      {/* Main Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
        {mode === 'choose' ? (
          <div className="w-full max-w-sm flex flex-col gap-5">
            <h3 className="text-center font-black text-xl mb-4 text-white">
              Create a Story
            </h3>

            {/* Write a text story */}
            <button 
              onClick={() => setMode('text')}
              className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] border border-white/5 rounded-2xl transition-all cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shadow-md">
                <PenTool size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-[14px] text-white block">Write Text Status</span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Share thoughts with colors, fonts, and music.</span>
              </div>
            </button>

            {/* Filter camera option */}
            <button 
              onClick={() => navigate('/camera')}
              className="flex items-center gap-4 p-4 bg-white/[0.03] hover:bg-white/[0.08] active:scale-[0.98] border border-white/5 rounded-2xl transition-all cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shadow-md">
                <Sparkles size={22} strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-[14px] text-white block">Lens Filter Camera</span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Use Snapchat filter effects to snap a selfie.</span>
              </div>
            </button>

            {/* Select from Files */}
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-4 p-4 bg-[#0494f4]/5 hover:bg-[#0494f4]/15 active:scale-[0.98] border border-[#0494f4]/20 rounded-2xl transition-all cursor-pointer text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-[#0494f4]/25 text-[#0494f4] flex items-center justify-center shadow-md">
                <ImageIcon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-extrabold text-[14px] text-white block">Gallery Photo</span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Upload a photo from your local files list.</span>
              </div>
            </button>
          </div>
        ) : (
          /* Preview state for Selected Image */
          <div className="w-full h-full flex flex-col justify-between items-center bg-zinc-950/40 rounded-3xl p-4 overflow-hidden border border-white/5 relative">
            <div className="flex-1 w-full max-h-[80%] flex items-center justify-center relative rounded-2xl overflow-hidden bg-black/60">
              <img src={previewUrl || ''} className="w-full h-full object-contain" alt="" />
              
              {selectedTrack && (
                <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md rounded-full py-1.5 px-3.5 flex items-center gap-1.5 border border-white/10 z-10 max-w-[200px]">
                  <Music size={11} className="text-[#0494f4] animate-spin" />
                  <span className="text-[9px] font-black text-white truncate">
                    {selectedTrack.title}
                  </span>
                </div>
              )}
            </div>

            {/* Image Editor Action Bars */}
            <div className="absolute top-8 right-8 flex flex-col gap-2">
              <button 
                onClick={() => setShowMusicSheet(true)}
                className={`p-3 rounded-full transition-all cursor-pointer border ${
                  selectedTrack ? 'bg-[#0494f4] text-white border-[#0494f4]' : 'bg-black/40 text-white border-white/10 hover:bg-black/60'
                }`}
                title="Attach audio loop"
              >
                <Music size={18} />
              </button>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center gap-3">
                <Loader2 className="text-[#0494f4] animate-spin" size={44} />
                <span className="text-[11px] font-mono tracking-wider text-zinc-400 uppercase font-bold">Uploading {uploadProgress}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload/cancel buttons for image mode */}
      {mode === 'image' && !loading && (
        <div className="p-6 bg-black/20 border-t border-white/5 flex items-center justify-center gap-6 shrink-0">
          <button 
            onClick={() => { setImage(null); setPreviewUrl(null); setMode('choose'); }}
            className="w-14 h-14 bg-zinc-800 hover:bg-zinc-700/80 rounded-full flex items-center justify-center text-white transition-all cursor-pointer"
          >
            <X size={26} />
          </button>
          <button 
            onClick={handleUploadImageStory}
            className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Check size={26} strokeWidth={3} />
          </button>
        </div>
      )}

      {/* Hidden file input for Photo Gallery upload */}
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept="image/*" 
        onChange={handleFileSelect} 
      />

      {/* Music Selector Bottom Sheet overlay */}
      {showMusicSheet && (
        <MusicSearchSheet 
          selectedTrack={selectedTrack} 
          onSelectTrack={setSelectedTrack} 
          onClose={() => setShowMusicSheet(false)} 
        />
      )}
    </div>
  );
}
