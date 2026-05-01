import React from 'react';
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal } from 'lucide-react';

export default function PostCard(props: any) {
  const { post } = props;
  return (
    <div className="flex flex-col bg-white mb-4">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-3">
          <img 
            src={post.avatar} 
            alt={post.user} 
            className="w-8 h-8 rounded-full object-cover border border-zinc-200"
            referrerPolicy="no-referrer"
          />
          <span className="font-semibold text-sm">{post.user}</span>
        </div>
        <MoreHorizontal size={20} />
      </div>

      {/* Image */}
      <div className="w-full aspect-square bg-zinc-100">
        <img 
          src={post.image} 
          alt="Post content" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Actions */}
      <div className="flex flex-col px-3 py-3 gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Heart size={24} />
            <MessageCircle size={24} />
            <Send size={24} />
          </div>
          <Bookmark size={24} />
        </div>

        {/* Likes */}
        <span className="font-semibold text-sm">{post.likes.toLocaleString()} likes</span>

        {/* Caption */}
        <div className="text-sm">
          <span className="font-semibold mr-2">{post.user}</span>
          {post.caption}
        </div>

        {/* Time */}
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{post.time}</span>
      </div>
    </div>
  );
}
