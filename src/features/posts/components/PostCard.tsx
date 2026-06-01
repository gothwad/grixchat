import React, { useState } from 'react';
import { Heart, Send, Loader2, MoreHorizontal } from 'lucide-react';
import { Post } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../lib/supabase';
import { chatService } from '../../chat/services/chatService';

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
  onAddComment?: (postId: string, text: string) => void;
  currentUserId?: string;
}

export default function PostCard({ post, onLike, currentUserId }: PostCardProps) {
  const [isHeartAnimating, setIsHeartAnimating] = useState(false);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isSendingDM, setIsSendingDM] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const handleLikeClick = () => {
    setIsHeartAnimating(true);
    onLike(post.id);
    setTimeout(() => setIsHeartAnimating(false), 600);
  };

  const handleSendDirectMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const recipientId = post.user?.uid || post.user_id;
    if (!directMessageText.trim() || !supabase || !currentUserId || !recipientId) return;

    setIsSendingDM(true);
    try {
      // 1. Get or create direct conversation with the author
      const conversationId = await chatService.getOrCreateDirectConversation(currentUserId, recipientId);
      if (!conversationId) {
        throw new Error("Could not start conversation session");
      }

      // 2. Build reply content with reference of the post caption
      const replyPrefix = post.caption ? `"${post.caption.substring(0, 30)}${post.caption.length > 30 ? '...' : ''}"` : 'Image';
      const msgContent = `[Story/Post Reply to ${replyPrefix}]: ${directMessageText.trim()}`;

      // 3. Send message with post image as context media
      await chatService.sendMessage(conversationId, currentUserId, msgContent, {
        url: post.image_url,
        type: 'image'
      });

      setDirectMessageText('');
      setSentSuccess(true);
      setTimeout(() => setSentSuccess(false), 3000);
    } catch (err) {
      console.error("Failed to send post DM reply in PostCard:", err);
      alert("Failed to send direct reply. Please try again.");
    } finally {
      setIsSendingDM(false);
    }
  };

  const initials = post.user?.fullName
    ? post.user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : 'U';

  const formattedDate = new Date(post.created_at).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const recipientId = post.user?.uid || post.user_id;

  return (
    <div className="w-full bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 mb-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between p-3 shrink-0">
        <div className="flex items-center gap-2.5">
          {post.user?.avatarUrl ? (
            <img 
              src={post.user.avatarUrl} 
              alt={post.user.fullName || 'User'} 
              className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]/40"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-[#0494f4]/15 text-[#0494f4] font-black text-xs flex items-center justify-center border border-[#0494f4]/10">
              {initials}
            </div>
          )}
          <div className="text-left">
            <h4 className="text-xs font-bold text-[var(--text-primary)] leading-none mb-0.5">
              {post.user?.fullName || 'Grix User'}
            </h4>
            <span className="text-[10px] font-medium text-[var(--text-secondary)]">
              @{post.user?.username || 'user'} • {formattedDate}
            </span>
          </div>
        </div>
        <button className="p-1.5 hover:bg-[var(--bg-main)] rounded-full transition-colors text-[var(--text-secondary)]">
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Image Block */}
      <div className="w-full relative aspect-square bg-[var(--bg-main)] overflow-hidden select-none cursor-pointer" onDoubleClick={handleLikeClick}>
        <img 
          src={post.image_url} 
          alt="Post source material" 
          className="w-full h-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
        {/* Heart Pop Animation */}
        <AnimatePresence>
          {isHeartAnimating && (
            <motion.div 
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [1, 1.3, 0.9, 1], opacity: [0, 0.9, 0.9, 0] }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="absolute inset-0 m-auto w-24 h-24 flex items-center justify-center pointer-events-none drop-shadow-2xl z-10"
            >
              <Heart fill="#0494f4" className="text-[#0494f4] w-20 h-20" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      <div className="p-3 pb-2 flex items-center gap-4 text-[var(--text-primary)]">
        <button 
          onClick={handleLikeClick}
          className="flex items-center gap-1.5 group font-bold text-xs"
        >
          <Heart 
            size={22} 
            className={`transition-transform duration-200 group-active:scale-125 ${
              post.is_liked_by_me 
                ? 'text-[#0494f4] fill-[#0494f4]' 
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`} 
          />
          <span className={post.is_liked_by_me ? 'text-[#0494f4]' : 'text-[var(--text-secondary)]'}>
            {post.likes_count}
          </span>
        </button>
      </div>

      {/* Caption & Metadata */}
      {post.caption && (
        <div className="px-3 pb-3 text-left">
          <p className="text-xs text-[var(--text-primary)] leading-normal break-words">
            <span className="font-extrabold mr-1.5">@{post.user?.username || 'user'}</span>
            {post.caption}
          </p>
        </div>
      )}

      {/* Instagram/WhatsApp-style Direct Message Quick Reply box */}
      {currentUserId && recipientId && recipientId !== currentUserId && (
        <form onSubmit={handleSendDirectMessage} className="border-t border-[var(--border-color)]/30 bg-[var(--bg-main)]/10 px-3 py-2 flex gap-2 items-center relative">
          <input 
            type="text" 
            placeholder={sentSuccess ? "Sent successfully! ✓" : "Reply directly to author..."}
            value={directMessageText}
            onChange={(e) => setDirectMessageText(e.target.value)}
            disabled={isSendingDM || sentSuccess}
            className={`flex-1 bg-[var(--bg-card)] border border-[var(--border-color)]/60 rounded-full px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none placeholder-[var(--text-secondary)]/50 focus:border-[#0494f4]/40 transition-all ${
              sentSuccess ? 'text-green-500 font-bold border-green-500/30 bg-green-500/5' : ''
            }`}
          />
          <button 
            type="submit" 
            disabled={!directMessageText.trim() || isSendingDM || sentSuccess}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              sentSuccess 
                ? 'bg-green-500 text-white' 
                : 'bg-[#0494f4]/15 hover:bg-[#0494f4]/25 text-[#0494f4]'
            } disabled:opacity-40`}
          >
            {isSendingDM ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <Send size={13} />
            )}
          </button>
        </form>
      )}
    </div>
  );
}
