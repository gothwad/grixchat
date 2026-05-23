import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Plus, Image as ImageIcon, Smile, Sparkles, User, Trash, Compass, MapPin, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { storage } from '../../services/StorageService';
import { LocalDataCache } from '../../services/LocalDataCache';

export interface VibeComment {
  id: string;
  user_name: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export interface VibeType {
  id: string;
  user_id: string;
  user_name: string;
  avatar_url?: string;
  content: string;
  media_url?: string;
  bg_gradient?: string;
  location?: string;
  likes_count: number;
  liked_by_me?: boolean;
  comments: VibeComment[];
  created_at: string;
}

// Memory fallback to ensure beautiful and premium offline-first/iframe execution
const SEED_VIBES: VibeType[] = [
  {
    id: 'm1',
    user_id: 'seeder1',
    user_name: 'Ananya Sharma',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    content: 'Chasing sunsets in beautiful Rishikesh! The vibes here are unmatched. 🌅🧘‍♀️ #traveldiaries #peace',
    media_url: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=600',
    location: 'Rishikesh, India',
    likes_count: 42,
    liked_by_me: false,
    comments: [
      { id: 'c1', user_name: 'Rahul Sen', content: 'So beautiful! Adding this to my bucket list.', created_at: new Date(Date.now() - 3600000 * 2).toISOString() }
    ],
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    id: 'm2',
    user_id: 'seeder2',
    user_name: 'Kabir Mehta',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    content: 'Coding late at night with my favorite lofi tracks... 💻🎧 Code is typing, app is running!',
    bg_gradient: 'from-purple-900 via-indigo-900 to-slate-900',
    likes_count: 18,
    liked_by_me: true,
    comments: [],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  }
];

const PRESET_GRADIENTS = [
  'from-pink-500 via-red-500 to-yellow-500',
  'from-purple-600 to-indigo-600',
  'from-green-400 to-blue-500',
  'from-yellow-200 via-pink-200 to-pink-400',
  'from-purple-900 via-indigo-900 to-slate-900',
  'from-emerald-500 to-teal-700',
];

export default function VibeScreen() {
  const { user } = useAuth();
  const [vibes, setVibes] = useState<VibeType[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showNewVibeSheet, setShowNewVibeSheet] = useState(false);
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);

  // Fetch or fall back to cached/seeded vibes
  useEffect(() => {
    const fetchVibes = async () => {
      setLoading(true);
      if (!supabase) {
        setVibes(SEED_VIBES);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('moments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          const stored = storage.getItem('grix_memory_vibes');
          if (stored) {
            setVibes(JSON.parse(stored));
          } else {
            setVibes(SEED_VIBES);
          }
        } else {
          const parsed = data.map((item: any) => ({
            ...item,
            comments: Array.isArray(item.comments) ? item.comments : [],
            liked_by_me: item.liked_users ? item.liked_users.includes(user?.id) : false
          }));
          setVibes(parsed);
          storage.setItem('grix_memory_vibes', JSON.stringify(parsed));
        }
      } catch (e) {
        console.warn('Supabase offline or storage blocked, using pure Memory State', e);
        setVibes(SEED_VIBES);
      } finally {
        setLoading(false);
      }
    };

    fetchVibes();
  }, [user?.id]);

  const saveVibesState = (updatedList: VibeType[]) => {
    setVibes(updatedList);
    try {
      storage.setItem('grix_memory_vibes', JSON.stringify(updatedList));
    } catch (e) {
      // Ignore if iframe environment blocks localStorage
    }
  };

  const handleCreateVibe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !mediaUrlInput.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Grix Vibe';
    const myAvatar = user?.user_metadata?.avatar_url || '';

    const newVibe: VibeType = {
      id: 'v_' + Math.random().toString(36).substr(2, 9),
      user_id: user?.id || 'offline_user',
      user_name: myUserName,
      avatar_url: myAvatar,
      content: textInput,
      media_url: selectedGradient ? undefined : (mediaUrlInput || undefined),
      bg_gradient: selectedGradient || undefined,
      location: locationInput || undefined,
      likes_count: 0,
      liked_by_me: false,
      comments: [],
      created_at: new Date().toISOString(),
    };

    if (supabase && user) {
      try {
        await supabase.from('moments').insert({
          id: newVibe.id,
          user_id: newVibe.user_id,
          user_name: newVibe.user_name,
          avatar_url: newVibe.avatar_url,
          content: newVibe.content,
          media_url: newVibe.media_url,
          bg_gradient: newVibe.bg_gradient,
          location: newVibe.location,
          likes_count: 0,
          created_at: newVibe.created_at
        });
      } catch (err) {
        console.warn('Supabase DB error, fallback to state model', err);
      }
    }

    const updated = [newVibe, ...vibes];
    saveVibesState(updated);

    // Reset Creation Sheet inputs
    setTextInput('');
    setMediaUrlInput('');
    setLocationInput('');
    setSelectedGradient(null);
    setShowMediaInput(false);
    setShowNewVibeSheet(false);
  };

  const handleLike = async (vibeId: string) => {
    const updated = vibes.map((item) => {
      if (item.id === vibeId) {
        const liked = !item.liked_by_me;
        return {
          ...item,
          liked_by_me: liked,
          likes_count: liked ? item.likes_count + 1 : Math.max(0, item.likes_count - 1),
        };
      }
      return item;
    });

    saveVibesState(updated);

    if (supabase && user) {
      try {
        const item = updated.find(v => v.id === vibeId);
        if (item) {
          await supabase.from('moments').update({
            likes_count: item.likes_count
          } as any).eq('id', vibeId);
        }
      } catch (err) {
        console.warn('Supabase DB error liking vibe', err);
      }
    }
  };

  const handleAddComment = async (vibeId: string) => {
    if (!commentText.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Grixer';
    const newComment: VibeComment = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      user_name: myUserName,
      content: commentText,
      created_at: new Date().toISOString(),
    };

    const updated = vibes.map((item) => {
      if (item.id === vibeId) {
        return {
          ...item,
          comments: [...item.comments, newComment],
        };
      }
      return item;
    });

    saveVibesState(updated);

    if (supabase) {
      try {
        const item = updated.find(v => v.id === vibeId);
        if (item) {
          await supabase.from('moments').update({
            comments: item.comments
          } as any).eq('id', vibeId);
        }
      } catch (err) {
        console.warn('Supabase error inserting comment', err);
      }
    }

    setCommentText('');
    setActiveCommentBox(null);
  };

  const handleDeleteVibe = async (vibeId: string) => {
    if (window.confirm('Delete this vibe check permanently?')) {
      const updated = vibes.filter(v => v.id !== vibeId);
      saveVibesState(updated);

      if (supabase) {
        try {
          await supabase.from('moments').delete().eq('id', vibeId);
        } catch (e) {
          console.warn('Supabase error deleting vibe', e);
        }
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] text-[var(--box-text)] pb-24 overflow-y-auto no-scrollbar font-sans">
      {/* Vibe Header */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-chat)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-500 animate-pulse" />
          <h2 className="text-base font-black tracking-tight text-[var(--text-primary)]">Grix Vibe Check</h2>
        </div>
        <button 
          onClick={() => setShowNewVibeSheet(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-full text-xs font-black tracking-wider shadow-md hover:opacity-90 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={14} /> SHARE VIBE
        </button>
      </div>

      {/* Creation form */}
      <AnimatePresence>
        {showNewVibeSheet && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="m-4 p-4 rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] shadow-xl relative"
          >
            <h3 className="text-xs font-black tracking-wider uppercase text-pink-500 mb-3 flex items-center gap-1.5">
              <Compass size={14} className="text-rose-500" /> What's Your Current Vibe?
            </h3>
            <form onSubmit={handleCreateVibe} className="space-y-3.5">
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Share clean thoughts, current mood, or updates..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-rose-450 text-[var(--text-primary)] placeholder:opacity-50"
              />

              {/* Gradient card style builder */}
              <div className="space-y-1.5">
                <label className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">Accent Cards Gradients</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedGradient(null)}
                    className={`px-3 py-1 text-[10px] uppercase tracking-wider rounded-full border transition-all ${!selectedGradient ? 'border-rose-400 bg-rose-500/10 font-black' : 'border-[var(--border-color)]'}`}
                  >
                    Plain text
                  </button>
                  {PRESET_GRADIENTS.map((grad, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setSelectedGradient(grad);
                        setMediaUrlInput('');
                      }}
                      className={`w-7 h-7 rounded-full bg-gradient-to-tr ${grad} border transition-all ${selectedGradient === grad ? 'scale-110 ring-2 ring-rose-400 border-white' : 'opacity-80'}`}
                    />
                  ))}
                </div>
              </div>

              {/* Image attachment support url input */}
              {!selectedGradient && (
                <div>
                  <button
                    type="button"
                    onClick={() => setShowMediaInput(!showMediaInput)}
                    className="flex items-center gap-1 px-1 py-1 text-[10px] text-zinc-400 hover:text-rose-400 transition-colors uppercase font-black tracking-wider"
                  >
                    <ImageIcon size={13} /> {showMediaInput ? 'Hide attachment' : 'Attach premium photo url'}
                  </button>
                  {showMediaInput && (
                    <input
                      type="url"
                      placeholder="Paste beautiful unsplash image link..."
                      value={mediaUrlInput}
                      onChange={(e) => setMediaUrlInput(e.target.value)}
                      className="mt-1.5 w-full text-xs p-2.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none text-[var(--text-primary)] focus:ring-1 focus:ring-rose-400"
                    />
                  )}
                </div>
              )}

              {/* Geo Location tags */}
              <div className="flex items-center gap-2">
                <MapPin size={13} className="text-pink-500" />
                <input
                  type="text"
                  placeholder="Your lifestyle location status (e.g. Pune, India)"
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="w-full text-xs py-1.5 bg-transparent border-b border-[var(--border-color)]/60 focus:border-rose-400 focus:outline-none text-[var(--text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowNewVibeSheet(false)}
                  className="px-4 py-1.5 text-[10px] hover:bg-[var(--bg-main)] rounded-full text-zinc-500 font-extrabold uppercase tracking-wider"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  className="px-5 py-1.5 text-[10px] bg-rose-500 text-white rounded-full font-black uppercase tracking-wider shadow-md hover:bg-rose-600 transition-colors cursor-pointer animate-fade-in"
                >
                  Publish Moment
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Vibing Main Stream Cards Layout */}
      <div className="px-4 py-2 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-zinc-500 gap-2">
            <Loader2 className="animate-spin text-rose-500" size={24} />
            <p className="text-[11px] font-black uppercase tracking-widest mt-1">Spinning client stream cache...</p>
          </div>
        ) : vibes.length === 0 ? (
          <div className="text-center p-12 text-zinc-500 border border-[var(--border-color)]/20 rounded-xl bg-[var(--bg-card)]">
            <Sparkles size={32} className="mx-auto text-zinc-650 mb-2 opacity-50" />
            <p className="text-xs font-black uppercase tracking-wider text-[var(--text-primary)]">Be the first player</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-1">Click share vibe button to state your daily status.</p>
          </div>
        ) : (
          vibes.map((vibe) => (
            <motion.div
              layout
              key={vibe.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] overflow-hidden shadow-sm"
            >
              {/* Header profile info */}
              <div className="p-3.5 flex items-center justify-between border-b border-[var(--border-color)]/35">
                <div className="flex items-center gap-2.5">
                  {vibe.avatar_url ? (
                    <img 
                      src={vibe.avatar_url} 
                      className="w-8.5 h-8.5 rounded-full object-cover border border-[var(--border-color)]" 
                      alt="avatar" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-8.5 h-8.5 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                      <User size={15} />
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-black text-[var(--text-primary)] tracking-wide">{vibe.user_name}</h4>
                    <div className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)] font-medium">
                      <span>{new Date(vibe.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      {vibe.location && (
                        <span className="flex items-center gap-0.5 text-pink-500 font-bold">
                          • <MapPin size={9} /> {vibe.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {vibe.user_id === user?.id && (
                  <button 
                    onClick={() => handleDeleteVibe(vibe.id)} 
                    className="text-zinc-500 hover:text-rose-500 hover:bg-rose-550/10 p-2 rounded-full transition-all cursor-pointer"
                  >
                    <Trash size={13} />
                  </button>
                )}
              </div>

              {/* Solid gradient cards vs Lifestyle photo text cards */}
              {vibe.bg_gradient ? (
                <div className={`p-8 bg-gradient-to-tr ${vibe.bg_gradient} text-center flex items-center justify-center min-h-[160px] text-white`}>
                  <p className="text-sm font-black tracking-wide leading-relaxed drop-shadow-md whitespace-pre-wrap select-all">{vibe.content}</p>
                </div>
              ) : (
                <div className="px-4 py-3.5 space-y-3">
                  <p className="text-xs text-[var(--text-primary)] leading-relaxed font-medium whitespace-pre-wrap break-words">{vibe.content}</p>
                  {vibe.media_url && (
                    <div className="rounded-xl overflow-hidden bg-zinc-950 aspect-video relative max-h-[320px] border border-[var(--border-color)]/40 shadow-inner">
                      <img 
                        src={vibe.media_url} 
                        className="w-full h-full object-cover select-none" 
                        referrerPolicy="no-referrer" 
                        alt="Moment Visual content" 
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Interactions / Likes + Comments */}
              <div className="px-4 py-2 border-t border-[var(--border-color)]/35 bg-[var(--bg-main)]/10 flex items-center justify-between text-[var(--text-secondary)] select-none">
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => handleLike(vibe.id)}
                    className={`flex items-center gap-1.5 p-1.5 hover:bg-rose-500/10 hover:text-rose-500 rounded-lg transition-colors cursor-pointer font-black text-[11px] ${vibe.liked_by_me ? 'text-rose-500 font-black' : ''}`}
                  >
                    <Heart size={16} className={vibe.liked_by_me ? 'fill-rose-500 text-rose-500' : ''} />
                    <span>{vibe.likes_count}</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentBox(activeCommentBox === vibe.id ? null : vibe.id)}
                    className="flex items-center gap-1.5 p-1.5 hover:bg-sky-500/10 hover:text-sky-400 rounded-lg transition-colors cursor-pointer font-black text-[11px]"
                  >
                    <MessageCircle size={16} />
                    <span>{vibe.comments?.length || 0}</span>
                  </button>
                </div>
              </div>

              {/* Comments Section list and submit row */}
              {activeCommentBox === vibe.id && (
                <div className="bg-[var(--bg-main)]/45 p-3.5 border-t border-[var(--border-color)]/35 space-y-3">
                  {vibe.comments && vibe.comments.length > 0 && (
                    <div className="space-y-2.5 max-h-48 overflow-y-auto no-scrollbar pr-1 pb-1">
                      {vibe.comments.map((comment) => (
                        <div key={comment.id} className="text-xs bg-[var(--bg-chat)] p-2.5 rounded-xl border border-[var(--border-color)]/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-extrabold text-[var(--text-primary)]">{comment.user_name}</span>
                            <span className="text-[8px] text-[var(--text-secondary)] opacity-60">
                              {new Date(comment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-secondary)] font-medium leading-relaxed">{comment.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add fresh comment input row */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Write comment..."
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAddComment(vibe.id);
                      }}
                      className="flex-1 text-xs px-3 py-2 bg-[var(--bg-main)] rounded-xl border border-[var(--border-color)] focus:outline-none focus:ring-1 focus:ring-rose-400 text-[var(--text-primary)]"
                    />
                    <button 
                      onClick={() => handleAddComment(vibe.id)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white p-2 rounded-xl active:scale-95 transition-transform cursor-pointer"
                    >
                      <Send size={14} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
