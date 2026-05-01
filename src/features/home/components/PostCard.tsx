import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  MessageCircle, 
  MoreVertical, 
  Share2, 
  Bookmark,
  Send,
  UserPlus,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayUnion, arrayRemove, collection, addDoc, serverTimestamp, onSnapshot, getDoc } from 'firebase/firestore';
import { auth, db } from '../../../services/firebase.ts';
import { toDate } from '../../../utils/dateUtils.ts';

interface PostCardProps {
  post: any;
  currentUserData: any;
  key?: any;
}

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function PostCard({ post, currentUserData }: PostCardProps) {
  const navigate = useNavigate();
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likes || 0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    if (auth.currentUser && post.likedBy) {
      setIsLiked(post.likedBy.includes(auth.currentUser.uid));
    }
    if (currentUserData?.savedPosts) {
      setIsSaved(currentUserData.savedPosts.includes(post.id));
    }
    if (currentUserData?.following && post.userId) {
      setIsFollowing(currentUserData.following.includes(post.userId));
    }
  }, [post, currentUserData]);

  const handleLike = async () => {
    if (!auth.currentUser) return;
    const postRef = doc(db, "posts", post.id);
    
    try {
      if (isLiked) {
        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
        await updateDoc(postRef, {
          likes: Math.max(0, (post.likes || 1) - 1),
          likedBy: arrayRemove(auth.currentUser.uid)
        });
      } else {
        setLikeCount(prev => prev + 1);
        setIsLiked(true);
        await updateDoc(postRef, {
          likes: (post.likes || 0) + 1,
          likedBy: arrayUnion(auth.currentUser.uid)
        });

        // Add Notification
        if (post.userId !== auth.currentUser.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: post.userId,
            fromUserId: auth.currentUser.uid,
            fromUserName: currentUserData?.fullName || 'User',
            fromUserAvatar: currentUserData?.photoURL || '',
            type: 'like',
            postId: post.id,
            text: 'liked your post',
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    } catch (err) {
      console.error("Error liking post:", err);
      // Revert UI on error
      setIsLiked(!isLiked);
      setLikeCount(prev => isLiked ? prev + 1 : Math.max(0, prev - 1));
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) return;
    const userRef = doc(db, "users", auth.currentUser.uid);
    
    try {
      if (isSaved) {
        setIsSaved(false);
        await updateDoc(userRef, {
          savedPosts: arrayRemove(post.id)
        });
      } else {
        setIsSaved(true);
        await updateDoc(userRef, {
          savedPosts: arrayUnion(post.id)
        });
      }
    } catch (err) {
      console.error("Error saving post:", err);
    }
  };

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!auth.currentUser || post.userId === auth.currentUser.uid) return;

    const myUserRef = doc(db, "users", auth.currentUser.uid);
    const targetUserRef = doc(db, "users", post.userId);

    try {
      if (isFollowing) {
        setIsFollowing(false);
        await updateDoc(myUserRef, { following: arrayRemove(post.userId) });
        await updateDoc(targetUserRef, { followers: arrayRemove(auth.currentUser.uid) });
      } else {
        setIsFollowing(true);
        await updateDoc(myUserRef, { following: arrayUnion(post.userId) });
        await updateDoc(targetUserRef, { followers: arrayUnion(auth.currentUser.uid) });

        // Add Notification
        await addDoc(collection(db, "notifications"), {
          userId: post.userId,
          fromUserId: auth.currentUser.uid,
          fromUserName: currentUserData?.fullName || 'User',
          fromUserAvatar: currentUserData?.photoURL || '',
          type: 'follow',
          text: 'started following you',
          read: false,
          createdAt: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  return (
    <div className="flex flex-col border-b border-[var(--border-color)]/20 pb-4">
      {/* Post Header */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2.5" onClick={() => navigate(`/user/${post.userId}`)}>
          <img 
            src={post.userAvatar || DEFAULT_LOGO} 
            className="w-8 h-8 rounded-full object-cover border border-[var(--border-color)]/20" 
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold text-[var(--text-primary)] tracking-tight">{post.userName || 'User'}</span>
              {post.userId !== auth.currentUser?.uid && (
                <>
                  <span className="w-0.5 h-0.5 rounded-full bg-[var(--text-secondary)]/50" />
                  <button 
                    onClick={handleFollow}
                    className={`text-[12px] font-bold ${isFollowing ? 'text-[var(--text-secondary)]' : 'text-blue-500'}`}
                  >
                    {isFollowing ? 'Following' : 'Follow'}
                  </button>
                </>
              )}
            </div>
            {post.location && <span className="text-[10px] text-[var(--text-secondary)] -mt-0.5">{post.location}</span>}
          </div>
        </div>
        <button 
          onClick={() => setShowOptions(!showOptions)}
          className="text-[var(--text-secondary)] p-1.5 hover:bg-[var(--text-primary)]/5 rounded-full transition-colors"
        >
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Post Content */}
      <div 
        className="w-full aspect-square bg-zinc-900/5 overflow-hidden relative cursor-pointer"
        onDoubleClick={handleLike}
      >
        <img 
          src={post.imageUrl || `https://picsum.photos/seed/${post.id}/800/800`} 
          className="w-full h-full object-cover" 
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      </div>

      {/* Post Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={handleLike}
            className={`transition-all active:scale-125 ${isLiked ? 'text-red-500' : 'text-[var(--text-primary)]'}`}
          >
            <Heart size={24} fill={isLiked ? "red" : "none"} />
          </button>
          <button 
            onClick={() => navigate(`/posts/${post.id}/comments`)}
            className="text-[var(--text-primary)] hover:opacity-70 transition-opacity"
          >
            <MessageCircle size={24} />
          </button>
          <button 
            onClick={() => navigate(`/posts/${post.id}/share`)}
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

      {/* Likes & Caption */}
      <div className="px-4 space-y-0.5">
        {likeCount > 0 && (
          <p className="text-[13px] font-bold text-[var(--text-primary)]">
            {likeCount.toLocaleString()} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        )}
        <div className="flex items-start gap-1.5 flex-wrap">
          <span className="text-[13px] font-bold text-[var(--text-primary)] whitespace-nowrap">{post.userName}</span>
          <p className="text-[13px] text-[var(--text-primary)] leading-snug">
            {post.caption}
          </p>
        </div>
        {post.comments > 0 && (
          <button 
            onClick={() => navigate(`/posts/${post.id}/comments`)}
            className="text-[13px] text-[var(--text-secondary)] mt-0.5 font-medium hover:underline block"
          >
            View all {post.comments} comments
          </button>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wide font-bold">
            {post.createdAt ? toDate(post.createdAt)?.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Just now'}
          </p>
        </div>
      </div>

      {/* Quick Comment Input */}
      <div className="px-4 mt-2 flex items-center gap-2 opacity-80">
        <img 
          src={currentUserData?.photoURL || DEFAULT_LOGO} 
          className="w-5 h-5 rounded-full object-cover border border-[var(--border-color)]/10" 
        />
        <button 
          onClick={() => navigate(`/posts/${post.id}/comments`)}
          className="flex-1 text-left text-[12px] text-[var(--text-secondary)] py-1"
        >
          Add a comment...
        </button>
      </div>
    </div>
  );
}
