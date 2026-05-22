import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Smile, 
  MoreVertical,
  Circle,
  Loader2,
  X
} from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../providers/AuthProvider';
import { motion, AnimatePresence } from 'motion/react';

interface LiveChatProps {
  videoId: string;
}

interface Message {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  text: string;
  createdAt: any;
}

export default function LiveChat({ videoId }: LiveChatProps) {
  const { user: authUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoId || !supabase) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('tube_live_chat')
        .select(`
          *,
          users:user_id(username, photo_url, full_name)
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const msgs = data.map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          userName: m.users?.full_name || m.users?.username || 'Anonymous',
          userAvatar: m.users?.photo_url || 'https://cdn-icons-png.flaticon.com/512/149/149071.png',
          text: m.text,
          createdAt: m.created_at
        }));
        setMessages(msgs.reverse());
      }
      setLoading(false);
    };

    fetchMessages();

    const channel = supabase
      .channel(`live-chat-${videoId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'tube_live_chat', 
        filter: `video_id=eq.${videoId}` 
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [videoId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !authUser || !supabase || sending) return;

    setSending(true);
    try {
      const { error } = await supabase.from('tube_live_chat').insert({
        video_id: videoId,
        user_id: authUser.id,
        text: newMessage.trim()
      } as any);

      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      console.error("Error sending live message:", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-[var(--bg-card)] border border-[var(--border-color)]/30 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-4 py-3 bg-[var(--bg-main)]/50 border-b border-[var(--border-color)]/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Circle size={8} className="text-red-500 fill-current animate-pulse" />
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">Live Chat</span>
        </div>
        <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
          <MoreVertical size={16} />
        </button>
      </div>

      {/* Messages List */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 no-scrollbar"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="animate-spin text-blue-500" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-2">
            <Smile size={32} />
            <p className="text-[10px] font-bold uppercase tracking-widest">No messages yet. Say hi!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="flex gap-2 group animate-in fade-in slide-in-from-bottom-1 duration-300">
              <img 
                src={msg.userAvatar} 
                alt="" 
                className="w-6 h-6 rounded-full object-cover shrink-0 border border-[var(--border-color)]/50" 
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-bold text-[var(--text-secondary)] truncate">{msg.userName}</span>
                </div>
                <p className="text-[12px] text-[var(--text-primary)] leading-normal mt-0.5 break-words">
                  {msg.text}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input */}
      <form 
        onSubmit={handleSendMessage}
        className="p-3 bg-[var(--bg-main)]/30 border-t border-[var(--border-color)]/20"
      >
        <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)]/50 px-3 py-1.5 rounded-xl focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
          <input 
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Chat publicly..."
            className="flex-1 bg-transparent border-none text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 focus:ring-0 px-0"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="p-1 text-blue-500 disabled:opacity-30 disabled:grayscale transition-all active:scale-90"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </form>
    </div>
  );
}
