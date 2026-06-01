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
  Smile
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ChatMessageMenuProps {
  activeMessageMenu: any;
  setActiveMessageMenu: (msg: any) => void;
  setReplyingTo: (msg: any) => void;
  startEdit: (msg: any) => void;
  deleteMessage: (id: string) => void;
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

  // Track page of menu (1 or 2)
  const [page, setPage] = useState<1 | 2>(1);

  // Compute coordinates for floating box
  const [coords, setCoords] = useState({ x: 100, y: 100, side: 'bottom' });

  useEffect(() => {
    if (!activeMessageMenu) return;

    // Reset to page 1 whenever menu is newly opened for a different message
    setPage(1);

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

  return (
    <AnimatePresence>
      <div className="contents">
        {/* Transparent backdrop to close menu */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onClick={() => setActiveMessageMenu(null)}
          className="fixed inset-0 bg-transparent z-[9990]"
        />

        {/* Telegram-style floating menu box */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: coords.side === 'top' ? 10 : -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: coords.side === 'top' ? 10 : -10 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          style={{ 
            position: 'fixed',
            left: `${coords.x}px`,
            top: `${coords.y}px`,
            width: '220px', // Extra sleek and visually comfortable width
          }}
          className="z-[9999] flex flex-col items-center gap-1.5 origin-center select-none"
        >
          {/* Reaction shortcut bar: exactly 6 emojis, with perfectly symmetrical padding */}
          <div className="flex items-center justify-between bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-xl rounded-full px-4 py-2 w-full shrink-0">
            {['❤️', '😂', '🥰', '🔥', '👍', '🙏'].map(emoji => (
              <button
                key={emoji}
                onClick={() => handleEmojiClick(emoji)}
                className="w-8 h-8 rounded-full hover:bg-[var(--bg-main)] active:scale-135 transition-all flex items-center justify-center text-[21px] cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Action options container */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)]/60 shadow-[0_10px_35px_rgba(0,0,0,0.15)] rounded-2xl p-1.5 flex flex-col gap-[1px] w-[185px] overflow-hidden text-[var(--text-primary)]">
            <AnimatePresence mode="wait">
              {page === 1 ? (
                <motion.div 
                  key="page1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col gap-[1px]"
                >
                  {/* Option: Reply */}
                  <button 
                    type="button"
                    onClick={() => { setReplyingTo(activeMessageMenu); setActiveMessageMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Reply size={16} className="text-[var(--text-secondary)]" />
                    <span>Reply</span>
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

                  {/* Option: Forward - WhatsApp dynamic screen */}
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

                  {/* Option: Select - interactive multi-select mode */}
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

                  {/* Option: Delete */}
                  <button 
                    type="button"
                    onClick={() => { deleteMessage(activeMessageMenu.id); setActiveMessageMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-[#ff595a] hover:bg-[#ff595a]/10 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Trash size={16} className="text-[#ff595a]" />
                    <span>Delete</span>
                  </button>

                  {/* Toggle Mode Option: More */}
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPage(2); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[#0494f4] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center justify-between rounded-xl cursor-pointer border-none bg-transparent border-t border-[var(--border-color)]/30 mt-1 pt-2"
                  >
                    <span className="flex items-center gap-3">
                      <ChevronRight size={16} className="text-[#0494f4]" />
                      <span>More</span>
                    </span>
                    <ChevronRight size={15} className="text-[#0494f4]/80" />
                  </button>
                </motion.div>
              ) : (
                <motion.div 
                  key="page2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.1 }}
                  className="flex flex-col gap-[1px]"
                >
                  {/* Option: Copy Text */}
                  <button 
                    type="button"
                    onClick={handleCopyText} 
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Copy size={16} className="text-[var(--text-secondary)]" />
                    <span>Copy Text</span>
                  </button>

                  {/* Option: Pin */}
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

                  {/* Option: Download */}
                  <button 
                    type="button"
                    onClick={handleDownload}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Download size={16} className="text-[var(--text-secondary)]" />
                    <span>Download</span>
                  </button>

                  {/* Option: Reactions / Custom Emoji trigger */}
                  <button 
                    type="button"
                    onClick={() => {
                      setShowReactionPicker(activeMessageMenu);
                      setActiveMessageMenu(null);
                    }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Smile size={16} className="text-[var(--text-secondary)]" />
                    <span>Reactions...</span>
                  </button>

                  {/* Option: Delete For Me */}
                  <button 
                    type="button"
                    onClick={() => { deleteMessage(activeMessageMenu.id); setActiveMessageMenu(null); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-bold text-[#ff595a] hover:bg-[#ff595a]/10 transition-colors flex items-center gap-3 rounded-xl cursor-pointer border-none bg-transparent"
                  >
                    <Trash size={16} className="text-[#ff595a]" />
                    <span>Delete For Me</span>
                  </button>

                  {/* Toggle Mode Option: Less */}
                  <button 
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setPage(1); }}
                    className="w-full px-4 py-2.5 text-left text-[13px] font-semibold text-[#0494f4] hover:bg-[var(--bg-main)] active:bg-[var(--bg-main)]/80 transition-colors flex items-center justify-between rounded-xl cursor-pointer border-none bg-transparent border-t border-[var(--border-color)]/30 mt-1 pt-2"
                  >
                    <span className="flex items-center gap-3">
                      <ChevronLeft size={16} className="text-[#0494f4]" />
                      <span>Back</span>
                    </span>
                    <ChevronLeft size={15} className="text-[#0494f4]/80" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
