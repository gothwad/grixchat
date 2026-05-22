import React, { useState, useEffect, useRef } from 'react';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Share2, 
  Bookmark,
  Send,
  Play,
  Volume2,
  VolumeX,
  Clapperboard,
  Edit2,
  Trash2,
  Info,
  AlertTriangle,
  EyeOff,
  UserMinus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../lib/supabase';
import { profileService } from '../../profile/services/profileService';
import { useAuth } from '../../../providers/AuthProvider.tsx';
import { formatDistanceToNow } from 'date-fns';

interface VideoPostCardProps {
  video: any;
  currentUserData: any;
  isActive: boolean;
  onCommentClick?: (videoId: string) => void;
}

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function VideoPostCard({ video, currentUserData, isActive, onCommentClick }: VideoPostCardProps) {
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(video.likesCount || 0);
  const [isSaved, setIsSaved] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const isOwner = authUser?.uid === video.userId;

  useEffect(() => {
    if (authUser && Array.isArray(video.likedBy)) {
      setIsLiked(video.likedBy.includes(authUser.uid));
    }
    if (Array.isArray(currentUserData?.savedVideos)) {
      setIsSaved(currentUserData.savedVideos.includes(video.id));
    }
    if (Array.isArray(currentUserData?.following) && video.userId) {
      setIsFollowing(currentUserData.following.includes(video.userId));
    }
  }, [video, currentUserData, authUser]);

  const handleLike = async () => {
    if (!authUser || !supabase) return;
    
    try {
      if (isLiked) {
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        await supabase.from('tube_videos').update({ 
          likes_count: Math.max(0, (video.likesCount || 1) - 1)
        } as any).eq('id', video.id);
      } else {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        await supabase.from('tube_videos').update({ 
          likes_count: (video.likesCount || 0) + 1
        } as any).eq('id', video.id);

        if (video.userId !== authUser.uid) {
          await supabase.from('notifications').insert({
            user_id: video.userId,
            from_user_id: authUser.uid,
            type: 'like',
            post_id: video.id,
            text: 'liked your video'
          } as any);
        }
      }
    } catch (err) {
      console.error("Error liking video:", err);
      setIsLiked(!isLiked);
    }
  };

  const handleSave = async () => {
    if (!authUser || !supabase) return;
    try {
      const currentSaved = currentUserData?.savedVideos || [];
      let newSaved;
      if (isSaved) {
        setIsSaved(false);
        newSaved = currentSaved.filter((id: string) => id !== video.id);
      } else {
        setIsSaved(true);
        newSaved = [...currentSaved, video.id];
      }
      await supabase.from('users').update({ saved_videos: newSaved } as any).eq('id', authUser.uid);
    } catch (err) {
      console.error("Error saving video:", err);
    }
  };

  const handleCommentOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick(video.id);
    } else {
      navigate(`/tube/watch/${video.id}`);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!authUser || video.userId === authUser.uid) return;

    try {
      if (isFollowing) {
        await profileService.unfollowUser(authUser.id, video.userId);
        setIsFollowing(false);
      } else {
        await profileService.followUser(authUser.id, video.userId);
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const extractYoutubeId = (url: string) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const youtubeId = extractYoutubeId(video.youtubeUrl);

  return (
    <div className="flex flex-col border-b border-[var(--border-color)]/20 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3" onClick={() => navigate(`/user/${video.userId}`)}>
          <div className="w-9 h-9 rounded-full p-[1px] bg-gradient-to-tr from-blue-500 to-purple-500">
            <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden">
              <img src={video.userAvatar || DEFAULT_LOGO} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 leading-none">
              <span className="text-[13px] font-bold text-[var(--text-primary)]">{video.userName}</span>
              <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
              <button onClick={handleFollow} className={`text-[12px] font-bold ${isFollowing ? 'text-[var(--text-secondary)]' : 'text-blue-500'}`}>
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)] mt-0.5">
              <Clapperboard size={10} className="text-blue-500" />
              <span className="font-medium">Tube Video</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowOptions(true)} className="p-2 text-[var(--text-secondary)]">
          <MoreVertical size={18} />
        </button>
      </div>

      {/* Video Preview / Player */}
      <div className="relative aspect-video bg-black overflow-hidden sm:rounded-none">
        {isActive && youtubeId ? (
          <iframe 
            width="100%" 
            height="100%" 
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <div className="w-full h-full cursor-pointer" onClick={() => navigate(`/tube/watch/${video.id}`)}>
            <img src={video.thumbnail} className="w-full h-full object-cover opacity-90" alt={video.title} />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10">
              <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
                <Play className="text-white fill-current translate-x-0.5" size={28} />
              </div>
            </div>
            <span className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-[10px] font-black rounded uppercase tracking-wider">
              {video.duration || '0:00'}
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike} 
            className={`${isLiked ? 'text-red-500' : 'text-[var(--text-primary)]'} transition-transform active:scale-125`}
          >
            <Heart size={24} fill={isLiked ? "currentColor" : "none"} />
          </button>
          <button 
            onClick={handleCommentOpen} 
            className="text-[var(--text-primary)] hover:opacity-70 transition-opacity"
          >
            <MessageCircle size={24} />
          </button>
          <button 
            onClick={() => navigate(`/posts/${video.id}/share`)}
            className="text-[var(--text-primary)] hover:opacity-70 transition-opacity"
          >
            <Send size={24} />
          </button>
        </div>
        <button 
          onClick={handleSave}
          className={`transition-all active:scale-125 text-[var(--text-primary)]`}
        >
          <Bookmark size={24} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Meta */}
      <div className="px-4 space-y-0.5">
        {likeCount > 0 && (
          <p className="text-[13px] font-bold text-[var(--text-primary)] mb-0.5">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-[var(--text-primary)] whitespace-nowrap">{video.userName}</span>
          <p className="text-[13px] font-bold text-[var(--text-primary)] truncate flex-1">{video.title}</p>
        </div>
        
        <p className="text-[13px] text-[var(--text-primary)] line-clamp-2 leading-relaxed opacity-90">
          {video.description}
        </p>

        <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--text-secondary)]">
          <span className="uppercase tracking-tighter">
            {video.createdAt ? formatDistanceToNow(new Date(video.createdAt), { addSuffix: true }) : 'just now'}
          </span>
        </div>

        {video.comments > 0 && (
          <button 
            onClick={handleCommentOpen}
            className="text-[13px] text-[var(--text-secondary)] mt-1 font-medium hover:underline block"
          >
            View all {video.comments} comments
          </button>
        )}
      </div>

      {/* Quick Comment Input */}
      <div className="px-4 mt-2 flex items-center gap-2 opacity-80">
        <img 
          src={currentUserData?.photoURL || DEFAULT_LOGO} 
          className="w-5 h-5 rounded-full object-cover border border-[var(--border-color)]/10" 
        />
        <button 
          onClick={handleCommentOpen}
          className="flex-1 text-left text-[12px] text-[var(--text-secondary)] py-1"
        >
          Add a comment...
        </button>
      </div>

      {/* Options Context Menu */}
      <AnimatePresence>
        {showOptions && (
          <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowOptions(false)}>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className="w-full max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-2">
                {isOwner ? (
                  <>
                    <button onClick={() => { navigate(`/tube/edit/${video.id}`); setShowOptions(false); }} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-black/5 text-[15px] font-bold">
                      <Edit2 size={20} className="text-blue-500" /> Edit Video
                    </button>
                    <button onClick={() => setShowOptions(false)} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-black/5 text-[15px] font-bold text-red-500">
                      <Trash2 size={20} /> Delete Video
                    </button>
                  </>
                ) : (
                  <>
                    <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-black/5 text-[15px] font-bold text-red-500">
                      <AlertTriangle size={20} /> Report
                    </button>
                    <button className="w-full flex items-center gap-4 px-4 py-4 hover:bg-black/5 text-[15px] font-bold">
                      <Info size={20} className="text-zinc-500" /> About channel
                    </button>
                    {isFollowing && (
                      <button onClick={handleFollow} className="w-full flex items-center gap-4 px-4 py-4 hover:bg-black/5 text-[15px] font-bold text-red-500">
                        <UserMinus size={20} /> Unfollow
                      </button>
                    )}
                  </>
                )}
                <button onClick={() => setShowOptions(false)} className="w-full py-4 text-[14px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] border-t border-[var(--border-color)]/10">
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
