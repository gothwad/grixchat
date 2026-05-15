import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, Heart, Loader2 } from 'lucide-react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db, auth } from '../../../services/firebase.ts';
import { toDate } from '../../../utils/dateUtils.ts';

interface CommentSheetProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  currentUserData: any;
  collectionName?: string;
}

export default function CommentSheet({ postId, isOpen, onClose, currentUserData, collectionName = 'posts' }: CommentSheetProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!postId || !isOpen) return;

    setLoading(true);
    const q = query(
      collection(db, collectionName, postId, 'comments'),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(list);
      setLoading(false);
    });

    return () => unsub();
  }, [postId, isOpen, collectionName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !auth.currentUser || submitting) return;

    setSubmitting(true);
    try {
      await addDoc(collection(db, collectionName, postId, 'comments'), {
        userId: auth.currentUser.uid,
        userName: currentUserData?.fullName || 'User',
        userAvatar: currentUserData?.photoURL || '',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
        likes: 0
      });

      // Update comment count on parent doc
      await updateDoc(doc(db, collectionName, postId), {
        comments: increment(1)
      });

      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.05 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 z-[200] backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ 
              type: 'spring', 
              damping: 40, 
              stiffness: 1200, 
              mass: 0.2, 
              restDelta: 0.001 
            }}
            className="fixed bottom-0 left-0 right-0 h-[80dvh] bg-[var(--bg-card)] z-[201] rounded-t-[32px] border-t border-[var(--border-color)] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Handle */}
            <div className="w-full flex justify-center py-2">
              <div className="w-10 h-1 bg-[var(--border-color)] rounded-full opacity-40" />
            </div>

            {/* Header */}
            <div className="px-6 py-1 flex items-center justify-between border-b border-[var(--border-color)]/20">
              <h3 className="text-[20px] leading-[18px] font-black text-[var(--text-primary)] tracking-tight">Comments</h3>
              <button 
                onClick={onClose}
                className="p-1.5 hover:bg-[var(--bg-main)] rounded-full transition-colors text-[var(--text-secondary)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 no-scrollbar">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="animate-spin text-blue-500" />
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <img 
                      src={comment.userAvatar || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                      className="w-9 h-9 rounded-full object-cover shrink-0 border border-[var(--border-color)]/20"
                      alt={comment.userName}
                    />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[var(--text-primary)]">{comment.userName}</span>
                        <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-tighter">
                          {comment.createdAt ? toDate(comment.createdAt)?.toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--text-primary)] leading-relaxed">
                        {comment.text}
                      </p>
                      <div className="flex items-center gap-4 pt-1">
                        <button className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-blue-500 transition-colors uppercase tracking-widest">Reply</button>
                        <div className="flex items-center gap-1">
                          <Heart size={12} className="text-[var(--text-secondary)]" />
                          <span className="text-[11px] font-bold text-[var(--text-secondary)]">{comment.likes || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="w-16 h-16 bg-[var(--bg-main)] rounded-full flex items-center justify-center text-[var(--text-secondary)]">
                    <Send size={32} className="opacity-20 translate-x-1 -translate-y-1 rotate-12" />
                  </div>
                  <p className="text-sm font-bold text-[var(--text-secondary)]">Be the first to comment</p>
                  <p className="text-xs text-[var(--text-secondary)]/60">Share your thoughts on this post</p>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 safe-bottom border-t border-[var(--border-color)]/30 bg-[var(--bg-card)]">
              <form 
                onSubmit={handleSubmit}
                className="flex items-center gap-3 bg-[var(--bg-main)] rounded-2xl px-4 py-2 border border-[var(--border-color)]/30 focus-within:border-blue-500/50 transition-all shadow-sm"
              >
                <img 
                  src={currentUserData?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'} 
                  className="w-8 h-8 rounded-full object-cover shrink-0"
                />
                <input 
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 bg-transparent border-none text-sm text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:ring-0 py-2 outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="text-blue-500 font-bold text-sm disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
                >
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : 'Post'}
                </button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
