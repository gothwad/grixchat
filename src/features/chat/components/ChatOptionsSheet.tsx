import React from 'react';
import { 
  User, 
  Archive, 
  ArchiveRestore, 
  EyeOff, 
  Eye, 
  Volume2, 
  VolumeX, 
  Trash, 
  UserX, 
  AlertTriangle,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

interface ChatOptionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  receiver: any;
  receiverId: string | undefined;
  isArchived: boolean;
  isHidden: boolean;
  isMuted: boolean;
  archiveChat: () => void;
  hideChat: () => void;
  setIsMuted: (muted: boolean) => void;
  deleteChat: () => void;
  onWatchTogether: () => void;
  children?: React.ReactNode;
}

export const ChatOptionsSheet: React.FC<ChatOptionsSheetProps> = ({
  isOpen,
  onClose,
  receiver,
  receiverId,
  isArchived,
  isHidden,
  isMuted,
  archiveChat,
  hideChat,
  setIsMuted,
  deleteChat,
  onWatchTogether,
  children
}) => {
  const navigate = useNavigate();

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Transparent full-screen outside click catcher, exact like WhatsApp */}
          <div 
            onClick={onClose}
            className="fixed inset-0 z-[9998] bg-black/[0.01] dark:bg-black/[0.1] cursor-default"
          />

          {/* Floating Popup Dropdown aligned to WhatsApp Style */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className="fixed top-14 right-3 w-60 bg-[var(--bg-card)] z-[9999] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-xl"
          >
            {/* Options List Container */}
            <div className="py-1 flex flex-col">
              {children ? children : (
                <>
                  <button 
                    onClick={() => handleAction(() => receiverId === 'gx-ai' || receiverId === 'grix-ai' ? navigate('/profile/grix-ai') : navigate(`/user/${receiverId}`))} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    <User size={15} className="text-[var(--text-secondary)] shrink-0" />
                    <span>View Profile</span>
                  </button>

                  <button 
                    onClick={() => handleAction(archiveChat)} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {isArchived ? (
                      <>
                        <ArchiveRestore size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Unarchive Chat</span>
                      </>
                    ) : (
                      <>
                        <Archive size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Archive Chat</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => handleAction(onWatchTogether)}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-blue-500 hover:bg-blue-500/5 flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    <Play size={15} className="fill-current text-blue-500 shrink-0" />
                    <span>Watch Together</span>
                  </button>

                  <button 
                    onClick={() => handleAction(hideChat)} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {isHidden ? (
                      <>
                        <Eye size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Unhide Chat</span>
                      </>
                    ) : (
                      <>
                        <EyeOff size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Hide Chat</span>
                      </>
                    )}
                  </button>

                  <button 
                    onClick={() => handleAction(() => setIsMuted(!isMuted))} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    {isMuted ? (
                      <>
                        <Volume2 size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Unmute Alerts</span>
                      </>
                    ) : (
                      <>
                        <VolumeX size={15} className="text-[var(--text-secondary)] shrink-0" />
                        <span>Mute Alerts</span>
                      </>
                    )}
                  </button>

                  <div className="h-px bg-[var(--border-color)]/30 my-1" />

                  <button 
                    onClick={() => handleAction(deleteChat)} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-rose-500 hover:bg-rose-500/5 flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    <Trash size={15} className="text-rose-500 shrink-0" />
                    <span>Delete Chat</span>
                  </button>

                  <button 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    <UserX size={15} className="text-[var(--text-secondary)] shrink-0" />
                    <span>Block User</span>
                  </button>

                  <button 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] flex items-center gap-3 transition-colors text-ellipsis overflow-hidden whitespace-nowrap"
                  >
                    <AlertTriangle size={15} className="text-[var(--text-secondary)] shrink-0" />
                    <span>Report User</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
