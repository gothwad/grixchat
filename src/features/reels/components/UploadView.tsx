import React from 'react';
import { Camera, Image as ImageIcon, Video, Clapperboard, Plus, ArrowRight } from 'lucide-react';

export default function UploadView() {
  const uploadOptions = [
    { id: 'story', name: 'Story', icon: Camera, color: 'bg-blue-500', description: 'Share a moment' },
    { id: 'post', name: 'Post', icon: ImageIcon, color: 'bg-orange-500', description: 'Share a photo' },
    { id: 'reel', name: 'Reel', icon: Clapperboard, color: 'bg-purple-500', description: 'Share a short video' },
    { id: 'video', name: 'Video', icon: Video, color: 'bg-emerald-500', description: 'Share a long video' },
  ];

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar pb-10 px-4 pt-4">
      <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-zinc-200 relative overflow-hidden mb-8">
        <div className="relative z-10">
          <h2 className="text-2xl font-black italic tracking-tight mb-2">Create Content</h2>
          <p className="text-zinc-400 text-xs font-bold uppercase tracking-[0.2em] opacity-80">Share your world with everyone</p>
          <div className="mt-6 flex gap-2">
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">Instant Upload</div>
            <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">HD Quality</div>
          </div>
        </div>
        <Plus className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 rotate-12" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {uploadOptions.map((option) => (
          <div key={option.id} className="bg-white rounded-[2rem] p-6 shadow-sm border border-zinc-100 flex flex-col gap-4 group cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]">
            <div className={`w-12 h-12 ${option.color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${option.color.split('-')[1]}-100 group-hover:rotate-6 transition-transform`}>
              <option.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">{option.name}</p>
              <h4 className="text-sm font-black text-zinc-900 tracking-tight flex items-center justify-between">
                {option.description}
                <ArrowRight size={14} className="text-zinc-300 group-hover:text-zinc-900 transition-colors" />
              </h4>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-zinc-50 rounded-[2rem] p-6 border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-4 py-12">
        <div className="w-16 h-16 bg-zinc-200 rounded-full flex items-center justify-center text-zinc-400">
          <Plus size={32} />
        </div>
        <div className="text-center">
          <h4 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Drag & Drop</h4>
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">or click to browse files</p>
        </div>
      </div>
    </div>
  );
}
