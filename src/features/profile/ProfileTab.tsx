import React, { useEffect, useState } from 'react';
import { 
  Grid,
  Bookmark,
  UserSquare,
  Camera,
  Clapperboard,
  Upload,
  Pencil,
  Play
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

import { useAuth } from '../../providers/AuthProvider';

export default function ProfileTab() {
  const { user: authUser, userData: authUserData } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'posts' | 'reels' | 'tube' | 'saved'>('posts');
  const navigate = useNavigate();

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const userData = authUserData;

  // Fetch posts based on active tab
  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchContent = async () => {
      try {
        if (activeTab === 'posts') {
          const { data } = await supabase.from('posts').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(p => ({
            ...p,
            imageUrl: p.media_urls?.[0] || p.imageUrl 
          })));
        } else if (activeTab === 'reels') {
          const { data } = await supabase.from('reels').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(d => ({ ...d, imageUrl: d.cover_url || d.thumbnail_url || d.cover })));
        } else if (activeTab === 'tube') {
          const { data } = await supabase.from('tube_videos').select('*').eq('user_id', authUser.id).order('created_at', { ascending: false });
          setPosts((data || []).map(d => ({ ...d, imageUrl: d.thumbnail_url || d.thumbnail })));
        } else if (activeTab === 'saved') {
          if (userData?.saved_posts && userData.saved_posts.length > 0) {
            const { data } = await supabase.from('posts').select('*').in('id', userData.saved_posts).order('created_at', { ascending: false });
            setPosts((data || []).map(p => ({
              ...p,
              imageUrl: p.media_urls?.[0] || p.imageUrl 
            })));
          } else {
            setPosts([]);
          }
        }
      } catch (err) {
        console.error("Error fetching tab content:", err);
        setPosts([]);
      }
    };
    
    fetchContent();
  }, [activeTab, userData?.saved_posts, authUser]);

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-y-auto no-scrollbar">
      <div className="flex-1 pb-24">
        {/* Profile Header */}
        <div className="px-4 pt-6 pb-4">
          <div className="flex items-center gap-6 mb-6">
            {/* Profile Picture */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full p-0.5 bg-[var(--primary)]">
                <div className="w-full h-full rounded-full border-2 border-[var(--bg-main)] overflow-hidden bg-zinc-100">
                  <img 
                    src={userData?.photoURL || DEFAULT_LOGO} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                </div>
              </div>
              <button 
                onClick={() => navigate('/edit-profile')}
                className="absolute bottom-0 right-0 w-6 h-6 bg-[var(--primary)] text-white rounded-full border-2 border-[var(--bg-main)] flex items-center justify-center shadow-sm"
              >
                <Pencil size={12} />
              </button>
            </div>

            {/* Bio Box (Fixed height to match profile pic 80px) */}
            <div className="flex-1 bg-[var(--box-bg)] rounded-xl p-3 flex flex-col justify-center h-20 overflow-hidden">
              <p className="text-[12px] leading-tight text-[var(--box-text)] font-medium line-clamp-3">
                {userData?.bio || 'Available'}
              </p>
            </div>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {/* Name & Username Box */}
            <div className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col justify-center min-h-[60px] col-span-2">
              <h2 className="text-[14px] font-bold leading-tight truncate">
                {userData?.fullName || 'GrixChat User'}
              </h2>
              <p className="text-[12px] opacity-80 truncate">
                @{userData?.username || 'username'}
              </p>
            </div>

            {/* Followers Box */}
            <button 
              onClick={() => navigate(`/user/${authUser?.id}/followers`)}
              className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col items-center justify-center min-h-[60px] active:scale-[0.98] transition-all"
            >
              <span className="text-sm font-bold">{userData?.followers?.length || 0}</span>
              <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Followers</span>
            </button>

            {/* Following Box */}
            <button 
              onClick={() => navigate(`/user/${authUser?.id}/following`)}
              className="bg-[var(--box-bg)] p-3 rounded-xl text-[var(--box-text)] flex flex-col items-center justify-center min-h-[60px] active:scale-[0.98] transition-all"
            >
              <span className="text-sm font-bold">{userData?.following?.length || 0}</span>
              <span className="text-[10px] opacity-80 uppercase font-bold tracking-wider">Following</span>
            </button>
          </div>

          {/* Tabs Strip */}
          <div className="flex bg-[var(--box-bg)] rounded-xl mb-4 overflow-hidden h-[46px] items-stretch">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'posts' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              title="Posts"
            >
              <Grid size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('reels')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'reels' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              title="Reels"
            >
              <Clapperboard size={20} />
            </button>
            <button 
              onClick={() => setActiveTab('tube')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'tube' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              title="Tube"
            >
              <Play size={20} className="fill-current" />
            </button>
            <button 
              onClick={() => setActiveTab('saved')}
              className={`flex-1 flex justify-center items-center transition-colors ${activeTab === 'saved' ? 'bg-white/10 text-[var(--box-text)]' : 'text-[var(--box-text)] opacity-50'}`}
              title="Saved"
            >
              <Bookmark size={20} />
            </button>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {posts.length > 0 ? (
            posts.map((post) => (
              <div 
                key={post.id} 
                className={`${activeTab === 'tube' ? 'aspect-video' : 'aspect-square'} bg-zinc-100 relative group overflow-hidden cursor-pointer`}
                onClick={() => {
                  if (activeTab === 'posts' || activeTab === 'saved') {
                    navigate(`/user/${authUser?.id}/posts?postId=${post.id}&tab=${activeTab}`);
                  } else if (activeTab === 'reels') {
                    navigate(`/user/${authUser?.id}/reels?reelId=${post.id}`);
                  } else if (activeTab === 'tube') {
                    navigate(`/user/${authUser?.id}/tube?videoId=${post.id}`);
                  }
                }}
              >
                <img 
                  src={post.imageUrl || `https://picsum.photos/seed/${post.id}/400/400`} 
                  className="w-full h-full object-cover"
                  alt="Post"
                />
              </div>
            ))
          ) : (
            <div className="col-span-3 py-20 flex flex-col items-center justify-center text-[var(--text-secondary)]">
              <div className="w-16 h-16 rounded-full border-2 border-[var(--text-secondary)] flex items-center justify-center mb-4">
                {activeTab === 'posts' && <Camera size={32} />}
                {activeTab === 'reels' && <Clapperboard size={32} />}
                {activeTab === 'tube' && <Play size={32} />}
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
      </div>
    </div>
  );
}


