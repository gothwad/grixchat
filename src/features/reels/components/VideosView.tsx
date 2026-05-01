import React from 'react';
import { Play, Clock, MoreVertical, Share2, Heart } from 'lucide-react';

export default function VideosView() {
  return (
    <div className="flex-1 pb-10 px-4 pt-4">
      <div className="flex flex-col gap-6">
        {[1, 2, 3].map((video) => (
          <div key={video} className="bg-[var(--bg-card)] rounded-3xl overflow-hidden shadow-sm border border-[var(--border-color)]">
            <div className="aspect-video bg-zinc-900 relative group">
              <img 
                src={`https://picsum.photos/seed/video${video}/800/450`} 
                className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/30 group-hover:scale-110 transition-transform">
                  <Play size={24} fill="currentColor" />
                </div>
              </div>
              <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white uppercase tracking-widest">
                12:45
              </div>
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-chat)] overflow-hidden">
                    <img src={`https://picsum.photos/seed/user${video}/100/100`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] leading-tight">Amazing Travel Vlog: Exploring the Unknown {video}</h4>
                    <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-1">User {video} • 1.2M views • 2 days ago</p>
                  </div>
                </div>
                <button className="text-[var(--text-secondary)]">
                  <MoreVertical size={18} />
                </button>
              </div>
              
              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border-color)]">
                <button className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Heart size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">12K</span>
                </button>
                <button className="flex items-center gap-2 text-[var(--text-secondary)]">
                  <Share2 size={18} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Share</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
