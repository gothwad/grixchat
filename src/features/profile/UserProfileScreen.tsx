import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  MessageSquare, 
  ShieldAlert, 
  UserX, 
  Info,
  Calendar,
  Clock,
  MoreVertical,
  CheckCircle2,
  Bell,
  Settings,
  QrCode,
  ChevronRight,
  Edit3,
  UserPlus,
  UserCheck,
  LockKeyhole,
  X,
  Loader2,
  Check,
  Plus
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { profileService } from './services/profileService';
import { useAuth } from '../../providers/AuthProvider.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { truncateToChars } from '../../utils/bioHelper';
import { chatService } from '../chat/services/chatService';
import { acceptChat } from '../../utils/acceptedChats';

export default function UserProfileScreen() {
  const { id: userId } = useParams();
  const navigate = useNavigate();
  const { user: authUser, userData: myUserData } = useAuth();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  
  const [isFriend, setIsFriend] = useState(false);
  const [isRequested, setIsRequested] = useState(false);
  const [isIncoming, setIsIncoming] = useState(false);
  const [requestProgress, setRequestProgress] = useState(false);

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

  useEffect(() => {
    if (!userId || !supabase) return;

    const fetchUser = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (data) {
          const u = data as any;
          setUser({
            uid: u.id,
            fullName: u.full_name,
            username: u.username,
            photoURL: u.photo_url,
            bio: u.bio,
            profileType: u.profile_type,
            hidePhoto: u.hide_photo,
            followers: [],
            following: []
          });
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      } finally {
        setLoading(false);
      }
    };

    const checkFriendship = async () => {
      if (!authUser?.id || !userId) return;
      try {
        // Fetch follow rows determining requests and mutual friendship
        const { data: followRows } = await supabase
          .from('follows')
          .select('follower_id, following_id')
          .or(`follower_id.eq.${authUser.id},following_id.eq.${authUser.id}`);

        const IFollow = new Set<string>();
        const FollowsMe = new Set<string>();

        followRows?.forEach(row => {
          if (row.follower_id === authUser.id) {
            IFollow.add(row.following_id);
          }
          if (row.following_id === authUser.id) {
            FollowsMe.add(row.follower_id);
          }
        });

        const isMutual = IFollow.has(userId) && FollowsMe.has(userId);
        const hasRequested = IFollow.has(userId) && !FollowsMe.has(userId);
        const isIncomingRequest = FollowsMe.has(userId) && !IFollow.has(userId);

        setIsFriend(isMutual);
        setIsRequested(hasRequested);
        setIsIncoming(isIncomingRequest);
      } catch (e) {
        console.error("Error checkFriendship:", e);
      }
    };

    fetchUser();
    checkFriendship();

    // Sync isBlocked
    if (myUserData) {
      setIsBlocked(myUserData.blockedUsers?.includes(userId) || false);
    }

  }, [userId, myUserData, authUser?.id]);

  const handleToggleBlock = async () => {
    if (!authUser || !userId) return;
    
    try {
      const newBlockedState = !isBlocked;
      const currentBlocked = myUserData?.blockedUsers || [];
      const newBlocked = newBlockedState 
        ? [...currentBlocked, userId] 
        : currentBlocked.filter((id: string) => id !== userId);

      await supabase.from('users').update({ blocked_users: newBlocked } as any).eq('id', authUser.id);
      
      setIsBlocked(newBlockedState);
      setShowMenu(false);
    } catch (error) {
      console.error("Error toggling block:", error);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[var(--bg-main)] p-6 text-center">
        <p className="text-[var(--text-secondary)] mb-4">User not found or has been removed.</p>
        <button onClick={() => navigate(-1)} className="text-[var(--primary)] font-bold">Go Back</button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden font-sans">
      {/* Header */}
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex justify-between items-center z-50 shrink-0 relative border-b border-[var(--border-color)] shadow-sm rounded-b-2xl">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={22} className="text-[var(--header-text)]" />
          </button>
          <div className="flex flex-col">
            <h1 className="text-lg font-bold text-[var(--header-text)] tracking-tight">{user.fullName || 'GrixChat User'}</h1>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer">
            <Bell size={22} className="text-[var(--header-text)] opacity-80" />
          </button>
          <button 
            onClick={() => setShowMenu(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <MoreVertical size={22} className="text-[var(--header-text)] opacity-80" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        <div className="px-4 pt-6">
          {/* Beautiful and Compact Profile Card */}
          <div className="flex flex-col items-center text-center bg-[var(--bg-card)] p-6 rounded-2xl border border-[var(--border-color)]/60 shadow-sm mb-6 relative overflow-hidden">
            <div className="relative mb-4 shrink-0">
              <div className="w-22 h-22 rounded-full p-[2.5px] border-[2.5px] border-[#0494f4] bg-[var(--bg-main)] flex items-center justify-center shrink-0">
                <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center">
                  <img 
                    src={user.hidePhoto ? DEFAULT_LOGO : (user.photoURL || DEFAULT_LOGO)} 
                    className="w-full h-full object-cover shrink-0"
                    referrerPolicy="no-referrer"
                    alt="Profile"
                  />
                </div>
              </div>
            </div>

            <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)] leading-tight">
              {user.fullName || 'GrixChat User'}
            </h2>
            <p className="text-xs text-[var(--text-secondary)] font-mono mt-1">
              @{user.username || 'username'}
            </p>

            <p className="text-xs text-[var(--text-secondary)] mt-3 max-w-xs font-semibold leading-relaxed">
              {user.bio ? truncateToChars(user.bio) : 'Available'}
            </p>

            {/* Symmetrical Action Button for Message / Request */}
            <div className="mt-5 w-full max-w-[180px]">
              {isFriend ? (
                <button 
                  onClick={() => navigate(`/chat/${userId}`)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-4 bg-[#0494f4] hover:bg-[#0381d6] active:scale-[0.97] transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-md cursor-pointer"
                >
                  <MessageSquare size={12} />
                  <span>Message</span>
                </button>
              ) : isIncoming ? (
                <button 
                  onClick={async () => {
                    if (!supabase || !authUser?.id || !userId || requestProgress) return;
                    try {
                      setRequestProgress(true);
                      
                      const { error } = await supabase.from('follows').insert({
                        follower_id: authUser.id,
                        following_id: userId
                      });
                      if (error) throw error;

                      const convId = await chatService.getOrCreateDirectConversation(authUser.id, userId);
                      if (convId) {
                        acceptChat(convId);
                      }

                      setIsFriend(true);
                      setIsIncoming(false);
                    } catch (e) {
                      console.error("Error accepting request:", e);
                    } finally {
                      setRequestProgress(false);
                    }
                  }}
                  disabled={requestProgress}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-4 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.97] transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-md cursor-pointer"
                >
                  {requestProgress ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                  <span>Accept Request</span>
                </button>
              ) : isRequested ? (
                <button 
                  disabled
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-4 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-default"
                >
                  <Check size={12} strokeWidth={3} />
                  <span>Requested</span>
                </button>
              ) : (
                <button 
                  onClick={async () => {
                    if (!supabase || !authUser?.id || !userId || requestProgress) return;
                    try {
                      setRequestProgress(true);
                      setIsRequested(true); // Optimistic UI update

                      const { error } = await supabase.from('follows').insert({
                        follower_id: authUser.id,
                        following_id: userId
                      });
                      if (error) throw error;
                    } catch (e) {
                      console.error("Error creating request:", e);
                    } finally {
                      setRequestProgress(false);
                    }
                  }}
                  disabled={requestProgress}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 px-4 bg-[#0494f4] hover:bg-[#0381d6] active:scale-[0.97] transition-all rounded-lg text-[10px] font-bold uppercase tracking-wider text-white shadow-md cursor-pointer"
                >
                  {requestProgress ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <Plus size={12} strokeWidth={2.5} />
                  )}
                  <span>Request</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMenu(false)}
              className="fixed inset-0 bg-black/40 z-[60]"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-3xl z-[70] p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-[var(--text-primary)]">Options</h3>
                <button onClick={() => setShowMenu(false)} className="p-2 hover:bg-[var(--bg-main)] rounded-full">
                  <X size={20} className="text-[var(--text-secondary)]" />
                </button>
              </div>
              
              <div className="space-y-2">
                <button 
                  onClick={handleToggleBlock}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] rounded-2xl transition-colors text-red-600"
                >
                  <UserX size={20} />
                  <span className="font-bold">{isBlocked ? 'Unblock User' : 'Block User'}</span>
                </button>
                <button 
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-main)] rounded-2xl transition-colors text-orange-600"
                >
                  <ShieldAlert size={20} />
                  <span className="font-bold">Report User</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
