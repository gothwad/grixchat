import React, { useState, useEffect } from 'react';
import { X, Search, Send, CheckCircle2, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { LocalDataCache } from '../../services/LocalDataCache';

interface ChatForwardOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  messageToForward: any;
  currentUserId: string;
  onForwardComplete: (targetConversationIds: string[]) => Promise<void>;
}

export const ChatForwardOverlay: React.FC<ChatForwardOverlayProps> = ({
  isOpen,
  onClose,
  messageToForward,
  currentUserId,
  onForwardComplete
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!isOpen || !currentUserId) return;

    const loadChatsAndUsers = async () => {
      setLoading(true);
      // 1. Get cached conversations
      const cachedConvs = LocalDataCache.getConversations(currentUserId) || [];
      const convoItems = cachedConvs.map((c: any) => ({
        id: c.id,
        isConversation: true,
        name: c.user || c.name || 'Grix Chat',
        username: c.username || '',
        photoURL: c.photoURL || '',
      }));

      // 2. Fetch alternative users from Supabase to allow initiating DMs
      try {
        if (supabase) {
          const { data: usersData } = await supabase
            .from('users')
            .select('id, username, full_name, photo_url')
            .neq('id', currentUserId)
            .limit(30);

          if (usersData) {
            const userItems = usersData
              .filter(u => !cachedConvs.some((c: any) => c.otherUserId === u.id))
              .map(u => ({
                id: u.id,
                isConversation: false,
                name: u.full_name || u.username || 'Grix User',
                username: u.username || '',
                photoURL: u.photo_url || '',
              }));

            setItems([...convoItems, ...userItems]);
          } else {
            setItems(convoItems);
          }
        } else {
          setItems(convoItems);
        }
      } catch (err) {
        console.error('Error loading contacts for forward:', err);
        setItems(convoItems);
      } finally {
        setLoading(false);
      }
    };

    loadChatsAndUsers();
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    return (
      item.name.toLowerCase().includes(term) ||
      item.username.toLowerCase().includes(term)
    );
  });

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    try {
      await onForwardComplete(selectedIds);
      setSelectedIds([]);
      onClose();
    } catch (err) {
      console.error('Forwarding actions failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex flex-col bg-[#0b141a] text-zinc-100">
        {/* WhatsApp Android Style Header */}
        <div className="h-16 flex items-center px-4 bg-[#1f2c34] border-b border-zinc-800 shadow-md gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-full hover:bg-white/10 text-zinc-300 transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
          
          <div className="flex-1">
            <h2 className="text-base font-bold text-white">Forward message</h2>
            <p className="text-xs text-zinc-400">
              {selectedIds.length === 0 ? 'Select contacts' : `${selectedIds.length} selected`}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <div className="p-3 bg-[#111b21] border-b border-zinc-800 flex items-center justify-center">
          <div className="w-full flex items-center bg-[#202c33] rounded-xl px-3 py-2 gap-2.5">
            <Search size={18} className="text-zinc-400" />
            <input 
              type="text"
              placeholder="Search chats or users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none w-full border-none"
            />
            {searchTerm && (
              <button 
                type="button"
                onClick={() => setSearchTerm('')}
                className="text-zinc-400 hover:text-white"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Main List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading && items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#00a884]" />
              <span className="text-xs text-zinc-500">Loading contacts...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-sm text-zinc-500">
              No contacts or chats found.
            </div>
          ) : (
            filteredItems.map(item => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className="w-full flex items-center px-3 py-2.5 rounded-xl transition-all duration-150 hover:bg-[#202c33] active:bg-[#222e35] gap-3 text-left border-none cursor-pointer"
                >
                  {/* Photo Profile */}
                  <div className="relative w-11 h-11 rounded-full overflow-hidden bg-zinc-800 flex items-center justify-center border border-zinc-700">
                    {item.photoURL ? (
                      <img 
                        src={item.photoURL} 
                        alt={item.name} 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="text-zinc-400" size={20} />
                    )}
                  </div>

                  {/* Profile info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {item.isConversation ? 'Active chat session' : `@${item.username || 'user'}`}
                    </p>
                  </div>

                  {/* Android Style Select Badge */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#00a884] flex items-center justify-center text-white">
                        <CheckCircle2 size={15} />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border-2 border-zinc-600" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* WhatsApp Mobile Style Floating Action Send Button */}
        {selectedIds.length > 0 && (
          <div className="absolute bottom-6 right-6 z-[10010]">
            <motion.button
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: -45 }}
              onClick={handleSend}
              className="w-14 h-14 bg-[#00a884] hover:bg-[#009675] shadow-lg rounded-full flex items-center justify-center text-white active:scale-95 transition-transform duration-100 cursor-pointer"
            >
              <Send size={22} className="ml-1" />
            </motion.button>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
};
