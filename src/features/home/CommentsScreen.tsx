import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp, 
  doc, 
  getDoc,
  updateDoc,
  increment
} from 'firebase/firestore';
import { auth, db } from '../../services/firebase.ts';
import { ArrowLeft, Send, Heart, MoreHorizontal, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toDate } from '../../utils/dateUtils.ts';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function CommentsScreen() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [comments, setComments] = useState<any[]>([]);
  const [post, setPost] = useState<any>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!postId || !auth.currentUser) return;

    // Fetch user data
    const fetchUser = async () => {
      const uDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
      if (uDoc.exists()) setCurrentUserData(uDoc.data());
    };
    fetchUser();

    // Fetch post details
    const fetchPost = async () => {
      const pDoc = await getDoc(doc(db, "posts", postId));
      if (pDoc.exists()) setPost({ id: pDoc.id, ...pDoc.data() });
    };
    fetchPost();

    // Fetch comments
    const q = query(
      collection(db, "posts", postId, "comments"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setComments(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !postId || !auth.currentUser) return;

    const commentText = newComment.trim();
    setNewComment('');

    try {
      const commentRef = collection(db, "posts", postId, "comments");
      await addDoc(commentRef, {
        postId,
        userId: auth.currentUser.uid,
        userName: currentUserData?.fullName || 'User',
        userAvatar: currentUserData?.photoURL || '',
        text: commentText,
        createdAt: serverTimestamp()
      });

      // Update post comment count
      await updateDoc(doc(db, "posts", postId), {
        comments: increment(1)
      });

      // Add Notification for post owner
      if (post && post.userId !== auth.currentUser.uid) {
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          fromUserId: auth.currentUser.uid,
          fromUserName: currentUserData?.fullName || 'User',
          fromUserAvatar: currentUserData?.photoURL || '',
          type: 'comment',
          postId,
          text: `commented: ${commentText}`,
          read: false,
          createdAt: serverTimestamp()
        });
      }

      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
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
                  {post.createdAt ? toDate(post.createdAt)?.toLocaleDateString() : 'Now'}
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
                        {comment.createdAt ? toDate(comment.createdAt)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
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
