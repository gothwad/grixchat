import React, { useState } from 'react';
import { Palette, Type, Music, Smile, Send, Trash2 } from 'lucide-react';
import { Track } from '../utils/musicData';

interface TextStoryEditorProps {
  onPostTextStory: (text: string, bgColor: string, font: string, track: Track | null) => void;
  onCancel: () => void;
  onOpenMusicSelector: () => void;
  selectedTrack: Track | null;
  onRemoveTrack: () => void;
}

const BG_PRESETS = [
  'linear-gradient(135deg, #120c1f 0%, #3e1b75 100%)',
  'linear-gradient(135deg, #0e1e38 0%, #0a4d80 100%)',
  'linear-gradient(135deg, #510825 0%, #aa143f 100%)',
  'linear-gradient(135deg, #1c0a35 0%, #c41e5e 100%)',
  'linear-gradient(135deg, #004b3a 0%, #008f6b 100%)',
  'linear-gradient(135deg, #522d00 0%, #a66200 100%)',
  '#111111',
  '#090d16'
];

const FONTS = [
  { name: 'Modern Sans', class: 'font-sans' },
  { name: 'Brutalist Mono', class: 'font-mono' },
  { name: 'Serif Elegant', class: 'font-serif' },
  { name: 'Space Tech', class: 'font-sans tracking-wide uppercase font-black' }
];

export default function TextStoryEditor({ 
  onPostTextStory, 
  onCancel, 
  onOpenMusicSelector,
  selectedTrack,
  onRemoveTrack
}: TextStoryEditorProps) {
  const [text, setText] = useState('');
  const [bgIndex, setBgIndex] = useState(0);
  const [fontIndex, setFontIndex] = useState(0);

  const handleToggleBg = () => {
    setBgIndex((prev) => (prev + 1) % BG_PRESETS.length);
  };

  const handleToggleFont = () => {
    setFontIndex((prev) => (prev + 1) % FONTS.length);
  };

  const currentBg = BG_PRESETS[bgIndex];
  const currentFont = FONTS[fontIndex];

  return (
    <div 
      style={{ background: currentBg }}
      className="fixed inset-0 z-50 flex flex-col font-sans transition-all duration-300"
    >
      {/* Top Controls */}
      <div className="flex items-center justify-between px-5 h-16 shrink-0 z-10 bg-gradient-to-b from-black/40 to-transparent">
        <button 
          onClick={onCancel}
          className="text-white font-extrabold text-sm uppercase tracking-wider bg-black/20 hover:bg-black/40 px-3.5 py-1.5 rounded-xl transition-all"
        >
          Cancel
        </button>
        
        <div className="flex items-center gap-2">
          {/* Font Toggler */}
          <button 
            onClick={handleToggleFont}
            className="p-3 bg-black/20 hover:bg-black/45 rounded-full text-white transition-all cursor-pointer flex items-center justify-center"
            title="Change Font Style"
          >
            <Type size={20} />
          </button>

          {/* Background Toggler */}
          <button 
            onClick={handleToggleBg}
            className="p-3 bg-black/20 hover:bg-black/45 rounded-full text-white transition-all cursor-pointer flex items-center justify-center"
            title="Change Background Preset"
          >
            <Palette size={20} />
          </button>

          {/* Music Toggler */}
          <button 
            onClick={onOpenMusicSelector}
            className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
              selectedTrack ? 'bg-[#0494f4] text-white animate-pulse' : 'bg-black/20 hover:bg-black/45 text-white'
            }`}
            title="Add Music Loop"
          >
            <Music size={20} />
          </button>
        </div>
      </div>

      {/* Main Large Text Input Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <textarea
          value={text}
          onChange={(e) => {
            if (e.target.value.length <= 160) {
              setText(e.target.value);
            }
          }}
          placeholder="Type whatever you're thinking..."
          className={`w-full max-w-md bg-transparent border-none outline-none text-white text-center font-black placeholder:text-white/40 leading-snug resize-none text-[28px] ${currentFont.class}`}
          rows={5}
          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
          maxLength={160}
          autoFocus
        />
        
        {/* Character Count */}
        <p className="text-[10px] text-white/50 font-mono mt-4 uppercase tracking-widest font-black">
          {text.length} / 160 characters
        </p>
      </div>

      {/* Footer Details: Active Track Indicator & Post button */}
      <div className="p-6 shrink-0 flex flex-col gap-4 bg-gradient-to-t from-black/40 to-transparent z-10">
        {selectedTrack && (
          <div className="self-center bg-black/50 backdrop-blur-md rounded-2xl p-2 px-3.5 flex items-center gap-2 border border-white/10 shadow-lg max-w-[280px]">
            <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
              <img src={selectedTrack.coverUrl} className="w-full h-full object-cover" alt="" />
            </div>
            <div className="flex-1 min-w-0 pr-1 text-left">
              <span className="text-[11px] font-black text-white truncate block leading-snug">
                {selectedTrack.title}
              </span>
              <span className="text-[9px] text-zinc-400 font-bold block truncate">
                {selectedTrack.artist}
              </span>
            </div>
            <button 
              onClick={onRemoveTrack}
              className="p-1 hover:bg-white/10 rounded-full text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}

        {/* Action Button Row */}
        <div className="flex justify-center">
          <button 
            onClick={() => onPostTextStory(text, currentBg, currentFont.class, selectedTrack)}
            disabled={!text.trim()}
            className="flex items-center gap-2 bg-[#0494f4] hover:bg-[#0381d6] text-white disabled:opacity-50 disabled:scale-100 px-8 py-3.5 rounded-full font-black uppercase tracking-[0.2em] shadow-lg shadow-[#0494f4]/25 active:scale-95 transition-all cursor-pointer text-xs"
          >
            <Send size={15} />
            <span>Share to Story</span>
          </button>
        </div>
      </div>
    </div>
  );
}
