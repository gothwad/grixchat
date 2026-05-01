import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Settings, 
  Search, 
  Bell, 
  BellOff, 
  Share2, 
  User, 
  Image as ImageIcon, 
  Edit2, 
  ChevronRight,
  Shield,
  UserCheck,
  UserX,
  AlertTriangle,
  LogOut,
  Camera
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { 
  doc, 
  getDoc, 
  onSnapshot, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';

export default function ChatSettingsScreen() {
  const { id: receiverId } = useParams();
  const navigate = useNavigate();
  const [receiver, setReceiver] = useState<any>(null);
  const [chatSettings, setChatSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState('');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState('');

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!receiverId || !currentUserId) return;

    const fetchReceiver = async () => {
      const docSnap = await getDoc(doc(db, "users", receiverId));
      if (docSnap.exists()) {
        setReceiver(docSnap.data());
      }
    };

    const unsubscribeSettings = onSnapshot(
      doc(db, "users", currentUserId, "chatSettings", receiverId),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setChatSettings(data);
          setNickname(data.nickname || '');
          setCustomPhotoUrl(data.customPhotoUrl || '');
          setIsMuted(data.isMuted || false);
        }
        setLoading(false);
      }
    );

    fetchReceiver();
    return () => unsubscribeSettings();
  }, [receiverId, currentUserId]);

  const updateSettings = async (updates: any) => {
    if (!currentUserId || !receiverId) return;
    try {
      await setDoc(doc(db, "users", currentUserId, "chatSettings", receiverId), updates, { merge: true });
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const handleNicknameSave = async () => {
    await updateSettings({ nickname });
    setShowNicknameModal(false);
  };

  const handlePhotoSave = async () => {
    await updateSettings({ customPhotoUrl });
    setShowPhotoModal(false);
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
        <div className="w-8 h-8 border-4 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const displayName = nickname || receiver?.fullName;
  const displayPhoto = customPhotoUrl || receiver?.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex items-center px-4 h-14 bg-[var(--header-bg)] border-b border-[var(--border-color)] sticky top-0 z-50">
        <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-black/5 rounded-full mr-2">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <h2 className="text-lg font-bold text-[var(--header-text)]">Details</h2>
      </div>

      {/* Profile Section */}
      <div className="flex flex-col items-center py-10 px-4">
        <div className="relative mb-4 group">
          <img 
            src={displayPhoto} 
            className="w-24 h-24 rounded-full object-cover border-2 border-[var(--border-color)] shadow-md"
            alt={displayName}
            referrerPolicy="no-referrer"
          />
          <button 
            onClick={() => setShowPhotoModal(true)}
            className="absolute bottom-0 right-0 p-2 bg-[var(--primary)] text-white rounded-full border-2 border-[var(--bg-main)] shadow-lg active:scale-90 transition-transform"
          >
            <Camera size={16} />
          </button>
        </div>
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{displayName}</h3>
        {nickname && (
          <p className="text-sm text-[var(--text-secondary)] font-medium">Real name: {receiver?.fullName}</p>
        )}
        <p className="text-xs text-[var(--text-secondary)] mt-1">@{receiver?.username}</p>
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-8 mb-8 px-4">
        <button 
          onClick={() => navigate(`/user/${receiverId}`)}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] group-active:scale-90 transition-transform">
            <User size={22} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Profile</span>
        </button>
        <button 
          onClick={() => {
            const muted = !isMuted;
            setIsMuted(muted);
            updateSettings({ isMuted: muted });
          }}
          className="flex flex-col items-center gap-1.5 group"
        >
          <div className={`w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center ${isMuted ? 'text-red-500' : 'text-[var(--text-primary)]'} group-active:scale-90 transition-transform`}>
            {isMuted ? <BellOff size={22} /> : <Bell size={22} />}
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 group">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] group-active:scale-90 transition-transform">
            <Search size={22} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Search</span>
        </button>
        <button className="flex flex-col items-center gap-1.5 group">
          <div className="w-12 h-12 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-primary)] group-active:scale-90 transition-transform">
            <Share2 size={22} />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Share</span>
        </button>
      </div>

      {/* Settings Options */}
      <div className="px-4 space-y-1">
        <div className="pb-2">
          <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-2 mb-2">Personalization</h4>
          <SettingsItem 
            icon={<Edit2 size={18} className="text-emerald-500" />}
            label="Nickname"
            sub={nickname || "Set a nickname for this user"}
            onClick={() => setShowNicknameModal(true)}
          />
          <SettingsItem 
            icon={<ImageIcon size={18} className="text-blue-500" />}
            label="Custom Profile Photo"
            sub={customPhotoUrl ? "Change custom photo" : "Set a custom photo for this chat only"}
            onClick={() => setShowPhotoModal(true)}
          />
        </div>

        <div className="pb-2">
          <h4 className="text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-2 mb-2">Privacy & Support</h4>
          <SettingsItem 
            icon={<Shield size={18} className="text-amber-500" />}
            label="Restricted"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<UserCheck size={18} className="text-emerald-500" />}
            label="Account Status"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<AlertTriangle size={18} className="text-orange-500" />}
            label="Report"
            onClick={() => {}}
          />
          <SettingsItem 
            icon={<UserX size={18} className="text-red-500" />}
            label="Block / Unblock"
            onClick={() => {}}
            className="text-red-500"
          />
        </div>
      </div>

      {/* Nickname Modal */}
      <AnimatePresence>
        {showNicknameModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowNicknameModal(false)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[var(--border-color)]"
            >
              <h3 className="text-xl font-bold mb-4">Set Nickname</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">This name will only be visible to you in your chats.</p>
              <input 
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter nickname..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-bold"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowNicknameModal(false)}
                  className="flex-1 py-3 font-bold text-[var(--text-secondary)] bg-[var(--bg-main)] rounded-xl active:scale-95 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleNicknameSave}
                  className="flex-1 py-3 font-bold text-white bg-[var(--primary)] rounded-xl shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Photo Modal */}
      <AnimatePresence>
        {showPhotoModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowPhotoModal(false)}
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-[var(--border-color)]"
            >
              <h3 className="text-xl font-bold mb-4">Custom Chat Photo</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-4">Paste an image URL to set a custom profile photo for this chat.</p>
              <input 
                type="text"
                value={customPhotoUrl}
                onChange={(e) => setCustomPhotoUrl(e.target.value)}
                placeholder="Image URL..."
                className="w-full bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl px-4 py-3 mb-6 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-bold text-[13px]"
                autoFocus
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setCustomPhotoUrl('');
                    updateSettings({ customPhotoUrl: '' });
                    setShowPhotoModal(false);
                  }}
                  className="flex-1 py-3 font-bold text-red-500 bg-red-500/10 rounded-xl active:scale-95 transition-all"
                >
                  Remove
                </button>
                <button 
                  onClick={handlePhotoSave}
                  className="flex-1 py-3 font-bold text-white bg-[var(--primary)] rounded-xl shadow-lg shadow-[var(--primary)]/20 active:scale-95 transition-all"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SettingsItem({ icon, label, sub, onClick, className = '' }: any) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between p-3.5 hover:bg-black/5 rounded-2xl transition-colors active:scale-[0.98] ${className}`}
    >
      <div className="flex items-center gap-3.5">
        <div className="w-10 h-10 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)] flex items-center justify-center">
          {icon}
        </div>
        <div className="flex flex-col items-start min-w-0 text-left">
          <span className="text-[14px] font-bold text-[var(--text-primary)]">{label}</span>
          {sub && <span className="text-[11px] text-[var(--text-secondary)] font-medium truncate w-[200px]">{sub}</span>}
        </div>
      </div>
      <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-50" />
    </button>
  );
}
