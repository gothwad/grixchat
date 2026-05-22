import React, { useState, useEffect } from 'react';
import { Heart, MessageCircle, Send, Plus, Image as ImageIcon, Smile, Sparkles, User, Trash, Compass, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export interface MomentComment {
  id: string;
  user_name: string;
  avatar_url?: string;
  content: string;
  created_at: string;
}

export interface MomentType {
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
  comments: MomentComment[];
  created_at: string;
}

// In-Memory fallback data to ensure perfect execution if local storage or tables are blocked in iframe
const SEED_MOMENTS: MomentType[] = [
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

export default function MomentsView() {
  const { user } = useAuth();
  const [moments, setMoments] = useState<MomentType[]>([]);
  const [textInput, setTextInput] = useState('');
  const [selectedGradient, setSelectedGradient] = useState<string | null>(null);
  const [mediaUrlInput, setMediaUrlInput] = useState('');
  const [showMediaInput, setShowMediaInput] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [showNewMomentSheet, setShowNewMomentSheet] = useState(false);
  const [activeCommentBox, setActiveCommentBox] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');

  // Hydrate from DB or Seed Data gracefully
  useEffect(() => {
    const fetchMoments = async () => {
      if (!supabase) {
        setMoments(SEED_MOMENTS);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('moments')
          .select('*')
          .order('created_at', { ascending: false });

        if (error || !data || data.length === 0) {
          // Fallback to local memory feed (which is fully functional)
          const stored = localStorage.getItem('grix_memory_moments');
          if (stored) {
            setMoments(JSON.parse(stored));
          } else {
            setMoments(SEED_MOMENTS);
          }
        } else {
          // Parse comments properly if saved in JSON formatted columns, or map accordingly
          const parsed = data.map((item: any) => ({
            ...item,
            comments: Array.isArray(item.comments) ? item.comments : [],
            liked_by_me: item.liked_users ? item.liked_users.includes(user?.id) : false
          }));
          setMoments(parsed);
          localStorage.setItem('grix_memory_moments', JSON.stringify(parsed));
        }
      } catch (e) {
        // Safe Catch for environments blocking local storage
        console.warn('LocalStorage/Supabase blocked: using pure Memory State', e);
        setMoments(SEED_MOMENTS);
      }
    };

    fetchMoments();
  }, [user?.id]);

  const saveMomentsState = (updatedList: MomentType[]) => {
    setMoments(updatedList);
    try {
      localStorage.setItem('grix_memory_moments', JSON.stringify(updatedList));
    } catch (e) {
      // Ignored if local storage is disabled
    }
  };

  const handleCreateMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !mediaUrlInput.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'My Grix Vibe';
    const myAvatar = user?.user_metadata?.avatar_url || '';

    const newMoment: MomentType = {
      id: 'm_' + Math.random().toString(36).substr(2, 9),
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

    // Try DB insertion first
    let success = false;
    if (supabase && user) {
      try {
        const { error } = await supabase.from('moments').insert({
          id: newMoment.id,
          user_id: newMoment.user_id,
          user_name: newMoment.user_name,
          avatar_url: newMoment.avatar_url,
          content: newMoment.content,
          media_url: newMoment.media_url,
          bg_gradient: newMoment.bg_gradient,
          location: newMoment.location,
          likes_count: 0,
          created_at: newMoment.created_at
        });
        if (!error) success = true;
      } catch (err) {
        console.warn('Supabase DB error, using state integration', err);
      }
    }

    const updated = [newMoment, ...moments];
    saveMomentsState(updated);

    // Reset Form
    setTextInput('');
    setMediaUrlInput('');
    setLocationInput('');
    setSelectedGradient(null);
    setShowMediaInput(false);
    setShowNewMomentSheet(false);
  };

  const handleLike = async (momentId: string) => {
    const updated = moments.map((item) => {
      if (item.id === momentId) {
        const liked = !item.liked_by_me;
        return {
          ...item,
          liked_by_me: liked,
          likes_count: liked ? item.likes_count + 1 : Math.max(0, item.likes_count - 1),
        };
      }
      return item;
    });

    saveMomentsState(updated);

    // Try to update on Supabase safely
    if (supabase && user) {
      try {
        const item = updated.find(m => m.id === momentId);
        if (item) {
          await supabase.from('moments').update({
            likes_count: item.likes_count
          } as any).eq('id', momentId);
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const handleAddComment = async (momentId: string) => {
    if (!commentText.trim()) return;

    const myUserName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Grixer';
    const newComment: MomentComment = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      user_name: myUserName,
      content: commentText,
      created_at: new Date().toISOString(),
    };

    const updated = moments.map((item) => {
      if (item.id === momentId) {
        return {
          ...item,
          comments: [...item.comments, newComment],
        };
      }
      return item;
    });

    saveMomentsState(updated);

    // Try to update comments in DB
    if (supabase) {
      try {
        const item = updated.find(m => m.id === momentId);
        if (item) {
          await supabase.from('moments').update({
            comments: item.comments
          } as any).eq('id', momentId);
        }
      } catch (err) {
        console.warn(err);
      }
    }

    setCommentText('');
    setActiveCommentBox(null);
  };

  const handleDeleteMoment = async (momentId: string) => {
    if (window.confirm('Delete this moment permanently?')) {
      const updated = moments.filter(m => m.id !== momentId);
      saveMomentsState(updated);

      if (supabase) {
        try {
          await supabase.from('moments').delete().eq('id', momentId);
        } catch (e) {
          console.warn(e);
        }
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg-main)] text-[var(--box-text)] pb-24 overflow-y-auto no-scrollbar">
      {/* Creation trigger */}
      <div className="p-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-chat)]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-400" />
          <h2 className="text-base font-bold tracking-tight">Community Moments</h2>
        </div>
        <button 
          onClick={() => setShowNewMomentSheet(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-full text-xs font-semibold shadow-md active:scale-95 transition-all"
        >
          <Plus size={14} /> Add Moment
        </button>
      </div>

      {showNewMomentSheet && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="m-4 p-4 rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] shadow-xl"
        >
          <h3 className="text-sm font-bold mb-3 flex items-center gap-1">
            <Compass size={14} className="text-rose-500 animate-pulse" /> Express Your Vibe
          </h3>
          <form onSubmit={handleCreateMoment} className="space-y-3">
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="What's your current vibe, thoughts, or exciting updates?"
              rows={3}
              className="w-full text-sm p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:opacity-60"
            />

            {/* Gradient Selector */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-gray-400">Gradient Background Cards</label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedGradient(null)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${!selectedGradient ? 'border-rose-400 bg-rose-500/10 font-bold' : 'border-[var(--border-color)]'}`}
                >
                  No Canvas
                </button>
                {PRESET_GRADIENTS.map((grad, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setSelectedGradient(grad);
                      setMediaUrlInput('');
                    }}
                    className={`w-7 h-7 rounded-full bg-gradient-to-tr ${grad} border transition-all ${selectedGradient === grad ? 'scale-110 ring-2 ring-rose-400' : 'opacity-80 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            {/* URL Image attachment option */}
            {!selectedGradient && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowMediaInput(!showMediaInput)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 font-medium"
                >
                  <ImageIcon size={14} /> {showMediaInput ? 'Hide photo URL input' : 'Add a lifestyle photo URL'}
                </button>
                {showMediaInput && (
                  <input
                    type="url"
                    placeholder="https://example.com/great_picture.jpg"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    className="mt-1.5 w-full text-xs p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none"
                  />
                )}
              </div>
            )}

            {/* Location Optional */}
            <div className="flex items-center gap-2">
              <MapPin size={12} className="text-gray-400" />
              <input
                type="text"
                placeholder="Where are you? (e.g. Goa, India)"
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                className="w-full text-xs p-1 bg-transparent border-b border-[var(--border-color)]/50 focus:border-rose-400 focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewMomentSheet(false)}
                className="px-3 py-1.5 text-xs hover:bg-[var(--bg-main)] rounded-full text-gray-400 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs bg-rose-500 text-white rounded-full font-bold shadow hover:bg-rose-600 transition-colors"
              >
                Share Vibe
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Grid or timeline display */}
      <div className="p-4 space-y-4">
        {moments.map((moment) => (
          <motion.div
            layout
            key={moment.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] overflow-hidden shadow-sm"
          >
            {/* Header info */}
            <div className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {moment.avatar_url ? (
                  <img src={moment.avatar_url} className="w-8 h-8 rounded-full object-cover border border-pink-500/10 animate-fade-in" alt="user avatar" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 border border-rose-500/20">
                    <User size={14} />
                  </div>
                )}
                <div>
                  <h4 className="text-xs font-bold leading-normal">{moment.user_name}</h4>
                  <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-secondary)] opacity-80 leading-none">
                    <span>{new Date(moment.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {moment.location && (
                      <span className="flex items-center gap-0.5 text-pink-400 font-medium font-sans">
                        <MapPin size={9} /> {moment.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {moment.user_id === user?.id && (
                <button onClick={() => handleDeleteMoment(moment.id)} className="text-gray-400 hover:text-rose-500 p-1 rounded-full">
                  <Trash size={13} />
                </button>
              )}
            </div>

            {/* Text and Visual contents */}
            {moment.bg_gradient ? (
              <div className={`p-8 bg-gradient-to-tr ${moment.bg_gradient} text-center flex items-center justify-center min-h-[160px] text-white`}>
                <p className="text-base font-bold font-sans drop-shadow-md whitespace-pre-wrap select-all">{moment.content}</p>
              </div>
            ) : (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-xs text-[var(--box-text)]/90 leading-relaxed whitespace-pre-wrap">{moment.content}</p>
                {moment.media_url && (
                  <div className="rounded-xl overflow-hidden bg-black/5 aspect-video relative max-h-[300px]">
                    <img 
                      src={moment.media_url} 
                      className="w-full h-full object-cover select-none" 
                      referrerPolicy="no-referrer" 
                      alt="Moment Upload" 
                    />
                  </div>
                )}
              </div>
            )}

            {/* Footer Buttons / Like & Comments Interaction */}
            <div className="px-3 py-2 border-t border-[var(--border-color)]/40 bg-[var(--bg-main)]/30 flex items-center justify-between text-[var(--text-secondary)]">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => handleLike(moment.id)}
                  className="flex items-center gap-1 text-xs hover:text-[var(--header-text)] transition-colors group cursor-pointer"
                >
                  <Heart 
                    size={15} 
                    className={`transition-all duration-300 group-active:scale-150 ${moment.liked_by_me ? 'fill-rose-500 text-rose-500 animate-[pulse_0.4s_ease-out_1]' : ''}`} 
                  />
                  <span className={moment.liked_by_me ? 'text-rose-500 font-bold' : ''}>{moment.likes_count}</span>
                </button>
                <button 
                  onClick={() => setActiveCommentBox(activeCommentBox === moment.id ? null : moment.id)}
                  className="flex items-center gap-1 text-xs hover:text-[var(--header-text)] transition-colors cursor-pointer"
                >
                  <MessageCircle size={15} />
                  <span>{moment.comments.length}</span>
                </button>
              </div>
            </div>

            {/* Comments List & Comments add engine inside Card */}
            {moment.comments.length > 0 && (
              <div className="bg-[var(--bg-main)]/20 px-3 py-2 space-y-1.5 border-t border-[var(--border-color)]/20 text-xs text-[var(--box-text)]/80">
                {moment.comments.map((comment) => (
                  <div key={comment.id} className="leading-relaxed py-0.5">
                    <span className="font-bold text-rose-500 mr-1.5">{comment.user_name}:</span>
                    <span>{comment.content}</span>
                  </div>
                ))}
              </div>
            )}

            {activeCommentBox === moment.id && (
              <div className="p-2.5 bg-[var(--bg-chat)] border-t border-[var(--border-color)]/30 flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Drop a beautiful message..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddComment(moment.id)}
                  className="w-full text-xs p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-main)] focus:outline-none focus:ring-1 focus:ring-rose-400 placeholder:opacity-50"
                  autoFocus
                />
                <button 
                  onClick={() => handleAddComment(moment.id)}
                  className="p-2 bg-rose-500 text-white rounded-lg active:scale-95 transition-all text-xs flex justify-center items-center"
                >
                  <Send size={12} />
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {moments.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-widest opacity-60">No community moments posted yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
