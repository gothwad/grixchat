import React from 'react';
import { 
  Archive,
  ArchiveRestore,
  ArrowLeft, 
  MoreVertical, 
  Phone, 
  Video, 
  User, 
  EyeOff, 
  Eye,
  Volume2, 
  VolumeX, 
  Trash, 
  UserX, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatHeaderProps {
  receiver: any;
  receiverId: string | undefined;
  formatLastSeen: (timestamp: any) => string;
  showOptions: boolean;
  setShowOptions: (show: boolean) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  deleteChat: () => void;
  hideChat?: () => void;
  archiveChat?: () => void;
  isHidden?: boolean;
  isArchived?: boolean;
  onWatchTogether?: () => void;
  optionsRef: React.RefObject<HTMLDivElement | null>;
  isTyping?: boolean;
  receiverStatus?: 'online' | 'offline';
  receiverActiveChatId?: string | null;
  currentUserId?: string;
  customMenu?: React.ReactNode;
}

export default function ChatHeader({
  receiver,
  receiverId,
  formatLastSeen,
  showOptions,
  setShowOptions,
  isMuted,
  setIsMuted,
  deleteChat,
  hideChat,
  archiveChat,
  isHidden,
  isArchived,
  onWatchTogether,
  optionsRef,
  isTyping,
  receiverStatus,
  receiverActiveChatId,
  currentUserId,
  customMenu,
  type = 'direct'
}: ChatHeaderProps & { type?: 'direct' | 'group' }) {
  const navigate = useNavigate();
  const isOnline = receiverStatus === 'online';
  const isGroup = type === 'group';

  const getStatusText = () => {
    if (isGroup) return 'tap here for group info';
    if (isTyping) return 'online - typing';
    if (!isOnline) return formatLastSeen(receiver?.lastSeen);
    
    if (receiverActiveChatId === currentUserId) {
      return 'online - for you';
    } else if (receiverActiveChatId) {
      return 'online - for other';
    }
    
    return 'online';
  };
  
  const startCall = (callType: 'voice' | 'video') => {
    const sessionCallId = `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    navigate(`/call/${receiverId}?type=${callType}&callId=${sessionCallId}`);
  };

  const handleHeaderClick = () => {
    if (receiverId === 'gx-ai' || receiverId === 'grix-ai') {
      navigate('/profile/grix-ai');
    } else if (isGroup) {
      navigate(`/group-settings/${receiverId}`);
    } else {
      navigate(`/chat/${receiverId}/settings`);
    }
  };
  
  return (
    <div className="shrink-0 flex items-center justify-between px-4 h-14 bg-[var(--header-bg)] z-50 border-b border-[var(--border-color)] shadow-sm w-full min-w-0 rounded-b-2xl">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-1.5 rounded-full transition-colors shrink-0">
          <ArrowLeft size={22} className="text-[var(--header-text)]" />
        </button>
        <div 
          className="flex items-center gap-2 cursor-pointer min-w-0" 
          onClick={handleHeaderClick}
        >
          <div className="relative shrink-0">
            <img 
              src={receiverId === 'gx-ai' || receiverId === 'grix-ai' ? '/assets/favicon.png' : (receiver?.photoURL || receiver?.icon || `https://cdn-icons-png.flaticon.com/512/149/149071.png`)} 
              className="w-9 h-9 rounded-full object-cover border border-black/10 shadow-sm"
              referrerPolicy="no-referrer"
            />
            {((isOnline && !isGroup) || receiverId === 'gx-ai' || receiverId === 'grix-ai') && (
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[var(--header-bg)] rounded-full"></div>
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h2 className="text-[14px] font-black text-[var(--header-text)] leading-tight truncate">
              {isGroup ? (receiver?.name || 'Group') : (receiver?.fullName || (receiverId === 'gx-ai' || receiverId === 'flow-ai' || receiverId === 'grix-ai' ? 'Grix AI' : 'GrixChat User'))}
            </h2>
            <span className="text-[10px] text-[var(--header-text)] opacity-80 font-bold tracking-tight truncate">
              {getStatusText()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {receiverId !== 'gx-ai' && !isGroup && (
          <>
            <button 
              onClick={() => startCall('video')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Video size={20} className="text-[var(--header-text)]" />
            </button>
            <button 
              onClick={() => startCall('voice')}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <Phone size={18} className="text-[var(--header-text)]" />
            </button>
          </>
        )}
        <div className="relative" ref={optionsRef}>
          <button 
            onClick={() => setShowOptions(!showOptions)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <MoreVertical size={22} className="text-[var(--header-text)]" />
          </button>

          {showOptions && (
            <div className="absolute right-0 mt-2 w-44 bg-[var(--bg-card)] rounded-xl shadow-2xl border border-[var(--border-color)] py-1 z-[9999] overflow-hidden">
              {customMenu ? customMenu : (
                <>
                  <button 
                    onClick={() => receiverId === 'gx-ai' || receiverId === 'grix-ai' ? navigate('/profile/grix-ai') : navigate(`/user/${receiverId}`)} 
                    className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors"
                  >
                    <User size={18} className="text-[var(--text-secondary)]" /> View Profile
                  </button>
                  {receiverId !== 'gx-ai' && receiverId !== 'grix-ai' && (
                    <>
                      <button onClick={archiveChat} className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors">
                        {isArchived ? (
                          <>
                            <ArchiveRestore size={18} className="text-[var(--text-secondary)]" /> Unarchive Chat
                          </>
                        ) : (
                          <>
                            <Archive size={18} className="text-[var(--text-secondary)]" /> Archive Chat
                          </>
                        )}
                      </button>
                      <button 
                        onClick={() => {
                          onWatchTogether?.();
                          setShowOptions(false);
                        }} 
                        className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-blue-500"
                      >
                        <Play size={18} className="text-blue-500" /> Watch Together
                      </button>
                      <button onClick={hideChat} className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors">
                        {isHidden ? (
                          <>
                            <Eye size={18} className="text-[var(--text-secondary)]" /> Unhide Chat
                          </>
                        ) : (
                          <>
                            <EyeOff size={18} className="text-[var(--text-secondary)]" /> Hide Chat
                          </>
                        )}
                      </button>
                      <button onClick={() => setIsMuted(!isMuted)} className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors">
                        {isMuted ? <Volume2 size={18} className="text-[var(--text-secondary)]" /> : <VolumeX size={18} className="text-[var(--text-secondary)]" />}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button onClick={deleteChat} className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors">
                        <Trash size={18} className="text-[var(--text-secondary)]" /> Delete Chat
                      </button>
                      <button className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 border-t border-[var(--border-color)] transition-colors">
                        <UserX size={18} className="text-[var(--text-secondary)]" /> Block User
                      </button>
                      <button className="w-full px-4 py-3 text-left text-[14px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors">
                        <AlertTriangle size={18} className="text-[var(--text-secondary)]" /> Report
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
