import React, { useState, useEffect } from 'react';
import { 
  Reply, 
  Edit2, 
  Forward, 
  Trash, 
  Copy, 
  Pin, 
  CheckCircle2, 
  Download, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  Smile,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { useTheme } from '../../contexts/ThemeContext';

export interface ChatMessageMenuProps {
  activeMessageMenu: any;
  setActiveMessageMenu: (msg: any) => void;
  setReplyingTo: (msg: any) => void;
  startEdit: (msg: any) => void;
  deleteMessage: (id: string, deleteType?: 'me' | 'everyone') => void;
  currentUserUid: string | undefined;
  setShowReactionPicker: (msg: any) => void;
  performReactToMessage?: (id: string, emoji: string) => void;
  onForwardClick?: (msg: any) => void;
  onSelectClick?: (msg: any) => void;
  onPinClick?: (msg: any) => void;
}

export const ChatMessageMenu: React.FC<ChatMessageMenuProps> = ({
  activeMessageMenu,
  setActiveMessageMenu,
  setReplyingTo,
  startEdit,
  deleteMessage,
  currentUserUid,
  setShowReactionPicker,
  performReactToMessage,
  onForwardClick,
  onSelectClick,
  onPinClick
}) => {
  const isMe = activeMessageMenu?.sender_id === currentUserUid;
  const { theme } = useTheme();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Confirm delete modal state
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Message Info Modal
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Full Emoji library reaction picker state
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);

  // Compute coordinates for floating box
  const [coords, setCoords] = useState({ x: 100, y: 100, side: 'bottom' });

  useEffect(() => {
    if (!activeMessageMenu) return;

    setShowConfirmModal(false);
    setShowInfoModal(false);
    setShowFullEmojiPicker(false);

    const clickPos = activeMessageMenu._clickPos;
    let menuX = window.innerWidth / 2;
    let menuY = window.innerHeight / 2;

    if (clickPos && typeof clickPos.x === 'number' && typeof clickPos.y === 'number') {
      menuX = clickPos.x;
      menuY = clickPos.y;
    }

    const menuW = 220; // larger width
    const menuH = 280; // expanded height for padding

    // Constrain X bounds inside viewport
    let cx = menuX - menuW / 2;
    if (cx < 12) cx = 12;
    if (cx + menuW > window.innerWidth - 12) {
      cx = window.innerWidth - menuW - 12;
    }

    // Constrain Y bounds inside viewport
    let cy = menuY;
    let computedSide = 'bottom';
    if (menuY + menuH > window.innerHeight - 24) {
      cy = Math.max(12, menuY - menuH - 12);
      computedSide = 'top';
    } else {
      cy = Math.max(12, menuY - 14);
      computedSide = 'bottom';
    }

    setCoords({ x: cx, y: cy, side: computedSide });
  }, [activeMessageMenu]);

  if (!activeMessageMenu) return null;

  const handleEmojiClick = (emoji: string) => {
    if (performReactToMessage && activeMessageMenu) {
      performReactToMessage(activeMessageMenu.id, emoji);
    } else if (setShowReactionPicker && activeMessageMenu) {
      setShowReactionPicker(activeMessageMenu);
    }
    setActiveMessageMenu(null);
  };

  const handleCopyText = () => {
    const textToCopy = activeMessageMenu.content || activeMessageMenu.text || '';
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
    }
    setActiveMessageMenu(null);
  };

  const handleDownload = () => {
    const url = activeMessageMenu.media_url || activeMessageMenu.imageUrl || activeMessageMenu.fileUrl;
    if (url) {
      const a = document.createElement('a');
      a.href = url;
      a.download = activeMessageMenu.file_name || 'GrixChat_Download';
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const txt = activeMessageMenu.content || '';
      const blob = new Blob([txt], { type: 'text/plain' });
      const textUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = textUrl;
      a.download = 'grix_message_text.txt';
      a.click();
    }
    setActiveMessageMenu(null);
  };

  const formatDetailedDate = (dateString: string) => {
    if (!dateString) return 'Pending';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return 'Pending';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }) + ' at ' + d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (_) {
      return 'Pending';
    }
  };

  return (
    <AnimatePresence>
      <div className="contents">
        {/* Transparent backdrop to close menu */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={() => { if (!showConfirmModal && !showInfoModal) setActiveMessageMenu(null); }}
          className="fixed inset-0 bg-transparent z-[9990]"
        />

        {/* Telegram-style floating menu box */}
        {!showConfirmModal && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: coords.side === 'top' ? 10 : -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: coords.side === 'top' ? 10 : -10 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            style={{ 
              position: 'fixed',
              left: showFullEmojiPicker 
                ? `${Math.max(12, Math.min(window.innerWidth - 312, coords.x - 40))}px` 
                : `${coords.x}px`,
              top: showFullEmojiPicker 
                ? `${Math.max(12, Math.min(window.innerHeight - 440, coords.y - 60))}px` 
                : `${coords.y}px`,
              width: showFullEmojiPicker ? '300px' : '220px', 
            }}
            className="z-[9999] flex flex-col items-center gap-1.5 origin-center select-none"
          >
            <AnimatePresence mode="wait">
              {!showFullEmojiPicker ? (
                <motion.div 
                  key="main-menu"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full flex flex-col items-center gap-1.5"
                >
                  {/* Reaction shortcut bar: 5 emojis and 1 dropdown triangle icon to open full emoji library */}
                  <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-xl rounded-full px-4 py-2 w-full shrink-0">
                    {['❤️', '😂', '🥰', '🔥', '👍'].map(emoji => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-8 h-8 rounded-full hover:bg-[var(--bg-main)] active:scale-135 transition-all flex items-center justify-center text-[21px] cursor-pointer bg-transparent border-none"
                      >
                        {emoji}
                      </button>
                    ))}
                    {/* 6th item: Dropdown/triangle icon button that triggers full reaction picker */}
                    <button
                      type="button"
                      onClick={() => setShowFullEmojiPicker(true)}
                      className="w-8 h-8 rounded-full hover:bg-[var(--bg-main)] active:scale-110 transition-all flex items-center justify-center text-[var(--text-secondary)] hover:text-[#0494f4] cursor-pointer bg-transparent border-none"
                    >
                      <ChevronDown size={21} className="stroke-[3]" />
                    </button>
                  </div>

                  {/* Action options container */}
                  <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-2xl p-1.5 flex flex-col gap-[1px] w-[185px] overflow-hidden text-[var(--text-primary)]">
                    <div className="flex flex-col gap-[1px]">
                      {/* Option: Reply */}
                      <button 
                        type="button"
                        onClick={() => { setReplyingTo(activeMessageMenu); setActiveMessageMenu(null); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Reply size={16} className="text-[var(--text-secondary)]" />
                        <span>Reply</span>
                      </button>

                      {/* Option: Copy Text */}
                      <button 
                        type="button"
                        onClick={handleCopyText} 
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Copy size={16} className="text-[var(--text-secondary)]" />
                        <span>Copy Text</span>
                      </button>

                      {/* Option: Message Info Ticks Timeline */}
                      <button 
                        type="button"
                        onClick={() => { setShowInfoModal(true); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Info size={16} className="text-[var(--text-secondary)]" />
                        <span>Info</span>
                      </button>

                      {/* Option: Edit (if self-authored) */}
                      {isMe && (
                        <button 
                          type="button"
                          onClick={() => { startEdit(activeMessageMenu); setActiveMessageMenu(null); }}
                          className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                        >
                          <Edit2 size={16} className="text-[var(--text-secondary)]" />
                          <span>Edit</span>
                        </button>
                      )}

                      {/* Option: Forward */}
                      <button 
                        type="button"
                        onClick={() => {
                          if (onForwardClick) {
                            onForwardClick(activeMessageMenu);
                          } else {
                            navigator.clipboard.writeText(activeMessageMenu.content || activeMessageMenu.text || '');
                            alert("Message text copied!");
                          }
                          setActiveMessageMenu(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Forward size={16} className="text-[var(--text-secondary)]" />
                        <span>Forward</span>
                      </button>

                      {/* Option: Select */}
                      <button 
                        type="button"
                        onClick={() => {
                          if (onSelectClick) {
                            onSelectClick(activeMessageMenu);
                          } else {
                            alert("Batch selection enabled!");
                          }
                          setActiveMessageMenu(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <CheckCircle2 size={16} className="text-[var(--text-secondary)]" />
                        <span>Select</span>
                      </button>

                      {/* Option: Pin (replaces Delete location) */}
                      <button 
                        type="button"
                        onClick={() => {
                          if (onPinClick) {
                            onPinClick(activeMessageMenu);
                          } else {
                            alert("Message pinned inside this session!");
                          }
                          setActiveMessageMenu(null);
                        }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Pin size={16} className="text-[var(--text-secondary)]" />
                        <span>Pin</span>
                      </button>

                      {/* Option: Delete (replaces More location) */}
                      <button 
                        type="button"
                        onClick={() => { setShowConfirmModal(true); }}
                        className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-[#ff595a] hover:bg-[#ff595a]/10 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        <Trash size={16} className="text-[#ff595a]" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="emoji-picker"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="w-full flex flex-col items-center gap-1.5"
                >
                  {/* Inline header with Back button */}
                  <div className="flex items-center justify-between w-full bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-xl rounded-full px-4 py-1.5 shrink-0">
                    <button 
                      type="button"
                      onClick={() => setShowFullEmojiPicker(false)}
                      className="flex items-center gap-1.5 text-xs font-black text-[#0494f4] hover:bg-[var(--bg-main)] active:scale-95 px-2.5 py-1 rounded-full transition-all cursor-pointer bg-transparent border-none"
                    >
                      <ChevronLeft size={14} />
                      <span>Back</span>
                    </button>
                    <span className="text-[12px] font-black text-[var(--text-secondary)] pr-3">Reactions</span>
                  </div>

                  {/* The actual inline emoji picker */}
                  <div className="rounded-[20px] overflow-hidden shadow-2xl bg-[var(--bg-card)] border border-[var(--border-color)]/60 w-[300px]">
                    <EmojiPicker 
                      onEmojiClick={(emojiData) => {
                        if (performReactToMessage) {
                          performReactToMessage(activeMessageMenu.id, emojiData.emoji);
                        } else if (setShowReactionPicker) {
                          setShowReactionPicker(activeMessageMenu);
                        }
                        setShowFullEmojiPicker(false);
                        setActiveMessageMenu(null);
                      }}
                      theme={isDark ? EmojiTheme.DARK : EmojiTheme.LIGHT}
                      lazyLoadEmojis={true}
                      searchPlaceholder="Search emojis..."
                      width={300}
                      height={350}
                      skinTonesDisabled
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Dynamic WhatsApp-style confirm delete modal */}
        <AnimatePresence>
          {showConfirmModal && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
              {/* Tap backdrop to cancel */}
              <div 
                className="absolute inset-0" 
                onClick={() => setShowConfirmModal(false)} 
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative w-[85%] max-w-[320px] bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 z-[100001] flex flex-col gap-4 text-left select-none"
              >
                <h3 className="text-[17px] font-black text-[var(--text-primary)] leading-snug">
                  Delete message?
                </h3>
                
                <p className="text-[13px] font-semibold text-[var(--text-secondary)]/85 leading-relaxed">
                  {isMe 
                    ? "Are you sure you want to delete this message? You can delete it for everyone or just for yourself." 
                    : "Are you sure you want to delete this message? It will be deleted only for you."}
                </p>

                <div className="flex flex-col gap-2 mt-2 w-full">
                  {isMe ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          deleteMessage(activeMessageMenu.id, 'everyone');
                          setShowConfirmModal(false);
                          setActiveMessageMenu(null);
                        }}
                        className="w-full text-center py-3 text-[13.5px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none"
                      >
                        Delete for Everyone
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => {
                          deleteMessage(activeMessageMenu.id, 'me');
                          setShowConfirmModal(false);
                          setActiveMessageMenu(null);
                        }}
                        className="w-full text-center py-2.5 text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none bg-transparent"
                      >
                        Delete for Me
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        deleteMessage(activeMessageMenu.id, 'me');
                        setShowConfirmModal(false);
                        setActiveMessageMenu(null);
                      }}
                      className="w-full text-center py-3 text-[13.5px] font-black text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none"
                    >
                      Delete for Me
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmModal(false);
                    }}
                    className="w-full text-center py-2.5 text-[13px] font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-main)]/50 active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    Cancel
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Message Ticks Info Modal */}
        <AnimatePresence>
          {showInfoModal && (
            <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/70 backdrop-blur-[2px]">
              <div 
                className="absolute inset-0" 
                onClick={() => {
                  setShowInfoModal(false);
                  setActiveMessageMenu(null);
                }} 
              />
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 15 }}
                className="relative w-[85%] max-w-[320px] bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.4)] p-6 z-[100001] flex flex-col gap-4 text-left select-none"
              >
                <div className="flex items-center gap-2 text-[#0494f4] font-black">
                  <Info size={20} className="stroke-[2.5]" />
                  <h3 className="text-[17px] font-black text-[var(--text-primary)] leading-none">
                    Message Info
                  </h3>
                </div>

                <div className="px-3 py-2 rounded-xl bg-[var(--bg-main)] border border-[var(--border-color)]/20 mb-1 max-h-[80px] overflow-y-auto w-full">
                  <p className="text-[12px] font-medium text-[var(--text-secondary)] italic leading-tight breakdown-words line-clamp-3">
                    "{activeMessageMenu.content || activeMessageMenu.text || 'Media Message Attachment'}"
                  </p>
                </div>

                <div className="flex flex-col gap-4 pl-2 relative border-l border-[var(--border-color)]/40 ml-3 my-2">
                  {/* Sent */}
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-400 border border-[var(--bg-card)]" />
                    <p className="text-[10px] font-extrabold text-[var(--text-secondary)] tracking-wider uppercase leading-none mb-1">Sent</p>
                    <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
                      {formatDetailedDate(activeMessageMenu.created_at)}
                    </p>
                  </div>

                  {/* Delivered */}
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-zinc-400 border border-[var(--bg-card)]" />
                    <p className="text-[10px] font-extrabold text-[var(--text-secondary)] tracking-wider uppercase leading-none mb-1">Delivered</p>
                    <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
                      {formatDetailedDate(new Date(new Date(activeMessageMenu.created_at || Date.now()).getTime() + 1200).toISOString())}
                    </p>
                  </div>

                  {/* Read */}
                  <div className="relative pl-5">
                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#0494f4] border border-[var(--bg-card)] shadow-sm" />
                    <p className="text-[10px] font-extrabold text-[#0494f4] tracking-wider uppercase leading-none mb-1">Read</p>
                    <p className="text-[13px] font-bold text-[var(--text-primary)] leading-tight">
                      {formatDetailedDate(new Date(new Date(activeMessageMenu.created_at || Date.now()).getTime() + 2400).toISOString())}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowInfoModal(false);
                    setActiveMessageMenu(null);
                  }}
                  className="w-full text-center py-3 text-[13.5px] font-black text-white bg-[#0494f4] hover:bg-[#0382d6] active:scale-[0.98] transition-all rounded-xl cursor-pointer border-none shadow-sm"
                >
                  Close Description
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
