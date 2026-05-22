import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { ArrowLeft, Send, Heart, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow } from 'date-fns';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function CommentsScreen() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState<any[]>([]);
  const [post, setPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const { user: authUser, userData: currentUserData } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postId || !authUser || !supabase) return;

    // Fetch post details
    const fetchPost = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          users:user_id(username, photo_url, full_name)
        `)
        .eq('id', postId)
        .single();
      
      if (data) {
        setPost({
          id: data.id,
          ...data,
          userName: data.users?.full_name || data.users?.username || 'User',
          userAvatar: data.users?.photo_url || DEFAULT_LOGO,
          userId: data.user_id
        });
      }
    };
    fetchPost();

    // Fetch comments
    const fetchComments = async () => {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          users:user_id(username, photo_url, full_name)
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });
      
      if (data) {
        setComments(data.map(c => ({
          ...c,
          userName: c.users?.full_name || c.users?.username || 'User',
          userAvatar: c.users?.photo_url || DEFAULT_LOGO
        })));
      }
      setLoading(false);
    };
    fetchComments();

    // Subscribe to new comments
    const channel = supabase
      .channel(`comments:${postId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'comments', 
        filter: `post_id=eq.${postId}` 
      }, async (payload) => {
        // Fetch user data for the new comment
        const { data: userData } = await supabase
          .from('users')
          .select('full_name, username, photo_url')
          .eq('id', payload.new.user_id)
          .single();
        
        const newC = {
          ...payload.new,
          userName: userData?.full_name || userData?.username || 'User',
          userAvatar: userData?.photo_url || DEFAULT_LOGO
        };
        setComments(prev => [...prev, newC]);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId, authUser?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId || !authUser || !supabase) return;

    const commentText = newComment.trim();
    setNewComment('');

    try {
      // 1. Add comment
      const { data: newC, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: authUser.id,
          text: commentText
        })
        .select()
        .single();
      
      if (error) throw error;

      // 2. Update post comment count (increment handled by database trigger or manual update)
      // For now manual update as we don't have triggers set up in supabase_schema.sql for it
      const { error: updateError } = await (supabase as any).rpc('increment_comments_count', { row_id: postId });
      // If RPC fails (not defined), try manual update
      if (updateError) {
        await supabase
          .from('posts')
          .update({ comments_count: (post?.comments_count || 0) + 1 } as any)
          .eq('id', postId);
      }

      // 3. Add Notification for post owner
      if (post && post.user_id !== authUser.id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          from_user_id: authUser.id,
          type: 'comment',
          post_id: postId,
          text: `commented: ${commentText}`,
          is_read: false
        });
      }

    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)]/30 shrink-0 sticky top-0 bg-[var(--bg-main)] z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5">
          <ArrowLeft size={24} />
        </button>
        <span className="ml-4 font-bold text-lg">Comments</span>
      </div>

      {/* Post Context (Optional) */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6 pb-24">
        {post && (
          <div className="flex gap-3 pb-6 border-b border-[var(--border-color)]/20">
            <img 
              src={post.userAvatar || DEFAULT_LOGO} 
              className="w-10 h-10 rounded-full object-cover border border-[var(--border-color)]/10" 
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{post.userName}</span>
                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                  {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : 'Now'}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{post.caption}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {comments.map((comment, index) => (
              <motion.div 
                key={comment.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex gap-3 group"
              >
                <img 
                  src={comment.userAvatar || DEFAULT_LOGO} 
                  className="w-8 h-8 rounded-full object-cover bg-zinc-100" 
                />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">{comment.userName}</span>
                      <span className="text-[10px] text-[var(--text-secondary)] font-bold">
                        {comment.created_at ? formatDistanceToNow(new Date(comment.created_at), { addSuffix: true }) : '...'}
                      </span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 text-[var(--text-secondary)] p-1">
                      <Heart size={12} />
                    </button>
                  </div>
                  <p className="text-sm bg-[var(--bg-card)]/50 p-2.5 rounded-2xl rounded-tl-none border border-[var(--border-color)]/10">
                    {comment.text}
                  </p>
                </div>
              </motion.div>
            ))}
            <div ref={scrollRef} />
            {comments.length === 0 && !loading && (
              <div className="py-20 flex flex-col items-center justify-center opacity-40">
                <MessageSquareIcon size={48} className="mb-4" />
                <p className="text-sm font-bold">No comments yet</p>
                <p className="text-[10px] mt-1">Be the first one to say something!</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border-color)]/30 bg-[var(--bg-main)] absolute bottom-0 left-0 right-0 z-20">
        <form onSubmit={handleSubmit} className="flex items-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-1.5 pl-4 pr-1.5 shadow-sm">
          <input 
            type="text" 
            placeholder="Write a comment..." 
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-transparent py-2.5 outline-none text-sm font-medium"
          />
          <button 
            disabled={!newComment.trim()}
            className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center disabled:opacity-50 disabled:bg-zinc-400 transition-all active:scale-90"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}

function MessageSquareIcon({ size, className }: { size: number, className: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
