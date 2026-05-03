import React from 'react';
import { 
  Grid, 
  Clapperboard, 
  UserSquare2,
  Video,
  PlusSquare,
  Camera,
  Bookmark
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ProfileContentProps {
  posts: any[];
  activeTab: string;
  userId?: string;
}

export default function ProfileContent({ posts, activeTab, userId }: ProfileContentProps) {
  const navigate = useNavigate();
  const showGrid = activeTab === 'posts' || activeTab === 'saved' || activeTab === 'reels' || activeTab === 'tube';

  const handlePostClick = (post: any) => {
    if (activeTab === 'posts' || activeTab === 'saved') {
      navigate(`/user/${userId || post.userId}/posts?postId=${post.id}&tab=${activeTab}`);
    } else if (activeTab === 'reels') {
      navigate(`/user/${userId || post.userUid}/reels?reelId=${post.id}`);
    } else if (activeTab === 'tube') {
      navigate(`/user/${userId || post.userId}/tube?videoId=${post.id}`);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Content Area */}
      {showGrid && (
        <div className="grid grid-cols-3 gap-0.5">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div 
                key={post.id} 
                className="aspect-square bg-[var(--bg-main)] relative group overflow-hidden border border-[var(--border-color)]/20 shadow-sm cursor-pointer"
                onClick={() => handlePostClick(post)}
              >
                <img 
                  src={post.url || post.imageUrl} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                  alt={`Post ${post.id}`}
                />
                {/* Play Icon overlay for Videos */}
                {(activeTab === 'reels' || activeTab === 'tube') && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Clapperboard size={24} className="text-white fill-white/20" />
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-[var(--text-secondary)] opacity-50">
              <div className="w-16 h-16 rounded-full border-2 border-[var(--text-secondary)] flex items-center justify-center mb-4">
                {activeTab === 'posts' && <Camera size={32} />}
                {activeTab === 'reels' && <Clapperboard size={32} />}
                {activeTab === 'tube' && <Video size={32} />}
                {activeTab === 'saved' && <Bookmark size={32} />}
              </div>
              <p className="text-sm font-bold uppercase tracking-wider">
                {activeTab === 'posts' && 'No posts yet'}
                {activeTab === 'reels' && 'No reels yet'}
                {activeTab === 'tube' && 'No videos yet'}
                {activeTab === 'saved' && 'No saved posts'}
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tagged' && (
        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] opacity-50">
          <UserSquare2 size={48} strokeWidth={1.5} />
          <p className="mt-4 text-[11px] font-bold uppercase tracking-widest">No tagged content</p>
        </div>
      )}
    </div>
  );
}
