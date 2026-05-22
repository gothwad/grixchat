import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { profileService } from './services/profileService';
import SettingHeader from '../../components/layout/SettingHeader';

export default function FollowListScreen() {
  const { id: userId, type } = useParams(); // type will be 'followers' or 'following'
  const navigate = useNavigate();
  const [userList, setUserList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { user: authUser, userData: myUserData, followingIds } = useAuth();

  useEffect(() => {
    const fetchData = async () => {
      if (!userId || !type || !supabase) return;
      setLoading(true);
      try {
        let query;
        if (type === 'following') {
          // Fetch users I follow
          query = supabase
            .from('follows')
            .select(`
              user:users!follows_following_id_fkey (*)
            `)
            .eq('follower_id', userId);
        } else {
          // Fetch my followers
          query = supabase
            .from('follows')
            .select(`
              user:users!follows_follower_id_fkey (*)
            `)
            .eq('following_id', userId);
        }

        const { data, error } = await query;
        if (error) throw error;

        const usersData = (data as any[] || []).map(item => ({
          id: item.user.id,
          fullName: item.user.full_name,
          username: item.user.username,
          photoURL: item.user.photo_url
        }));
        
        setUserList(usersData);
      } catch (error) {
        console.error("Error fetching follow list:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, type]);

  const handleToggleFollow = async (targetId: string, isCurrentlyFollowing: boolean) => {
    if (!authUser || !targetId) return;
    
    try {
      if (isCurrentlyFollowing) {
        await profileService.unfollowUser(authUser.uid, targetId);
      } else {
        await profileService.followUser(authUser.uid, targetId);
      }
      // Re-fetch or rely on AuthProvider sync if available
    } catch (error) {
      console.error("Error toggling follow:", error);
    }
  };

  const filteredUsers = userList.filter(u => 
    u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  return (
    <div className="h-[100dvh] flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader 
        title={type === 'followers' ? 'Followers' : 'Following'} 
        showSearch={true}
        searchTerm={searchQuery}
        setSearchTerm={setSearchQuery}
      />

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {/* Search Bar - keep it if header search is not enough for the user */}
        <div className="p-4 border-b border-[var(--border-color)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] opacity-40" size={16} />
            <input 
              type="text"
              placeholder={`Search ${type}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[var(--bg-chat)] border border-[var(--border-color)] rounded-2xl py-3 pl-10 pr-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-[var(--text-secondary)]/40"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-secondary)]">Loading List...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-6">
            <div className="w-16 h-16 bg-[var(--bg-chat)] rounded-full flex items-center justify-center mb-4 border border-[var(--border-color)]">
              <Search size={24} className="text-[var(--text-secondary)] opacity-20" />
            </div>
            <p className="text-[var(--text-primary)] font-black uppercase tracking-tight text-sm">No users found</p>
            <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest mt-2">Try searching with a different name</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {filteredUsers.map((u) => {
              const isMe = authUser?.uid === u.id;
              const amIFollowing = followingIds.includes(u.id);

              return (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-black/5 transition-colors">
                  <div 
                    onClick={() => navigate(`/user/${u.id}`)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className="relative">
                      <img 
                        src={u.photoURL || DEFAULT_LOGO} 
                        className="w-12 h-12 rounded-full object-cover border-2 border-[var(--border-color)] shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-[var(--text-primary)] tracking-tight">{u.fullName}</h4>
                      <p className="text-[10px] font-black text-[var(--text-secondary)]/60 uppercase tracking-widest">@{u.username}</p>
                    </div>
                  </div>

                  {!isMe && (
                    <button 
                      onClick={() => handleToggleFollow(u.id, amIFollowing)}
                      className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all active:scale-95 ${
                        amIFollowing 
                        ? 'bg-[var(--bg-chat)] text-[var(--text-primary)] border border-[var(--border-color)]' 
                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                      }`}
                    >
                      {amIFollowing ? 'Following' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
