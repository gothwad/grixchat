import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { ArrowLeft, Search, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

export default function ShareScreen() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, userData: currentUserData } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [contentMetadata, setContentMetadata] = useState<any>(null);

  useEffect(() => {
    if (!postId || !supabase) return;

    const fetchContent = async () => {
      // Try posts
      let { data: postData } = await supabase.from('posts').select('*').eq('id', postId).single();
      if (postData) {
        setContentMetadata({ ...postData, id: postData.id, type: 'post' });
        return;
      }

      // Try reels
      let { data: reelData } = await supabase.from('reels').select('*').eq('id', postId).single();
      if (reelData) {
        setContentMetadata({ ...reelData, id: reelData.id, type: 'reel' });
        return;
      }

      // Try tube_videos
      let { data: tubeData } = await supabase.from('tube_videos').select('*').eq('id', postId).single();
      if (tubeData) {
        setContentMetadata({ ...tubeData, id: tubeData.id, type: 'video' });
        return;
      }
    };

    fetchContent();
  }, [postId]);

  useEffect(() => {
    if (!authUser || !supabase) return;

    // Fetch following users to share with
    const fetchFriends = async () => {
      const { data: followings } = await supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', authUser.id);
      
      const followingIds = followings?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('*')
          .in('id', followingIds.slice(0, 50));
        
        if (usersData) {
          setUsers(usersData);
        }
      }
      setLoading(false);
    };

    fetchFriends();
  }, [authUser]);

  const handleToggleUser = (userId: string) => {
    if (selectedUsers.includes(userId)) {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedUsers(prev => [...prev, userId]);
    }
  };

  const handleShare = async () => {
    if (selectedUsers.length === 0 || !postId || !contentMetadata || !authUser || !supabase) return;
    setSending(true);

    try {
      for (const targetUserId of selectedUsers) {
        // 1. Get or create conversation
        const { data: convId, error: rpcError } = await (supabase as any).rpc('get_direct_conversation_id', {
          u1: authUser.id,
          u2: targetUserId
        });

        let chatId = convId;

        if (!chatId) {
          // Create new direct conversation
          const { data: newConv, error: newConvError } = await (supabase as any).from('conversations').insert({
            type: 'direct',
            last_message: `Shared a ${contentMetadata.type}`,
            last_message_at: new Date().toISOString()
          }).select().single();

          if (newConvError) throw newConvError;
          chatId = newConv.id;

          // Add participants
          await (supabase as any).from('conversation_participants').insert([
            { conversation_id: chatId, user_id: authUser.id },
            { conversation_id: chatId, user_id: targetUserId }
          ]);
        } else {
          // Update existing conversation
          await (supabase as any).from('conversations').update({
            last_message: `Shared a ${contentMetadata.type}`,
            last_message_at: new Date().toISOString()
          }).eq('id', chatId);
        }

        // 2. Add share message
        const messageText = `Shared a ${contentMetadata.type}: ${contentMetadata.caption || contentMetadata.title || ''}`;
        const mediaData = {
          share: {
            id: contentMetadata.id,
            type: contentMetadata.type,
            imageUrl: contentMetadata.imageUrl || contentMetadata.thumbnail || contentMetadata.thumbnail_url || '',
            title: contentMetadata.title || contentMetadata.caption || '',
            userName: contentMetadata.userName || ''
          }
        };

        await (supabase as any).from('messages').insert({
          conversation_id: chatId,
          sender_id: authUser.id,
          content: messageText,
          media_type: 'share',
          media_url: mediaData.share.imageUrl,
          metadata: mediaData
        });
      }

      navigate(-1);
    } catch (err) {
      console.error("Error sharing post:", err);
      alert("Failed to share.");
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans">
      {/* Header */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--border-color)]/30 shrink-0 sticky top-0 bg-[var(--bg-main)] z-10">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-black/5">
          <ArrowLeft size={24} />
        </button>
        <span className="ml-4 font-bold text-lg">Send to</span>
      </div>

      {/* Search */}
      <div className="p-4">
        <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl px-4 py-2.5 shadow-sm">
          <Search size={18} className="text-[var(--text-secondary)] mr-3" />
          <input 
            type="text" 
            placeholder="Search people..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm font-medium"
          />
        </div>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pt-0">
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div 
                key={user.id}
                onClick={() => handleToggleUser(user.id)}
                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-black/5 active:bg-black/10 transition-colors cursor-pointer"
              >
                <img 
                  src={user.photoURL || DEFAULT_LOGO} 
                  className="w-12 h-12 rounded-full object-cover border border-[var(--border-color)]/20" 
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{user.fullName || 'User'}</p>
                  <p className="text-[11px] text-[var(--text-secondary)] font-medium truncate">@{user.username}</p>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedUsers.includes(user.id) ? 'bg-blue-500 border-blue-500' : 'border-[var(--border-color)]'}`}>
                  {selectedUsers.includes(user.id) && <CheckCircle2 size={16} className="text-white" />}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center opacity-40 text-center">
            <Search size={48} className="mb-4" />
            <p className="text-sm font-bold">No friends found</p>
            <p className="text-[10px] mt-1">Follow people to share posts with them.</p>
          </div>
        )}
      </div>

      {/* Send Button */}
      {selectedUsers.length > 0 && (
        <div className="p-4 border-t border-[var(--border-color)]/30 bg-[var(--bg-main)]">
          <button 
            onClick={handleShare}
            disabled={sending}
            className="w-full bg-blue-500 text-white rounded-2xl py-4 font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send size={18} />
                Send to {selectedUsers.length} {selectedUsers.length === 1 ? 'person' : 'people'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
