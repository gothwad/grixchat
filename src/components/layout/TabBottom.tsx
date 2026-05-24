import React, { useEffect, useState } from 'react';
import { MessageCircle, Users, UserCircle, Home, Search, Phone, Settings } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { motion } from 'motion/react';

export default function TabBottom() {
  const { user: authUser } = useAuth();
  const location = useLocation();
  const [unreadChatsCount, setUnreadChatsCount] = useState(0);
  const [unreadGroupsCount, setUnreadGroupsCount] = useState(0);

  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchUnread = async () => {
      try {
        // Fetch participant conversations with their type
        const { data: participants, error: pError } = await supabase
          .from('conversation_participants')
          .select(`
            conversation_id,
            conversation:conversations (
              type
            )
          `)
          .eq('user_id', authUser.id);

        if (pError || !participants) return;

        // Build a mapping of conversation_id -> type
        const convTypeMap: Record<string, string> = {};
        participants.forEach((p: any) => {
          if (p.conversation_id && p.conversation) {
            convTypeMap[p.conversation_id] = p.conversation.type || 'direct';
          }
        });

        // Fetch unread messages
        const { data: messages, error: mError } = await supabase
          .from('messages')
          .select('conversation_id')
          .eq('is_read', false)
          .neq('sender_id', authUser.id);
        
        if (!mError && messages) {
          const distinctConversations = Array.from(new Set(messages.map(m => m.conversation_id as string)));
          
          let chatsUnread = 0;
          let groupsUnread = 0;

          distinctConversations.forEach((cid: string) => {
            const type = convTypeMap[cid];
            if (type === 'group') {
              groupsUnread++;
            } else {
              chatsUnread++;
            }
          });

          setUnreadChatsCount(chatsUnread);
          setUnreadGroupsCount(groupsUnread);
        }
      } catch (err) {
        console.error("Error fetching unread count:", err);
      }
    };

    fetchUnread();

    const channel = supabase
      .channel(`tab-bottom-unread:${authUser.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messages',
      }, () => {
        fetchUnread();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authUser?.id]);
  
  const navItems = [
    { icon: MessageCircle, path: '/', label: 'Chats', badge: unreadChatsCount, activeColor: 'text-[var(--header-text)]' },
    { icon: Users, path: '/groups', label: 'Groups', badge: unreadGroupsCount, activeColor: 'text-[var(--header-text)]' },
    { icon: Search, path: '/search', label: 'Search', activeColor: 'text-[var(--header-text)]' },
    { icon: Phone, path: '/calls', label: 'Calls', activeColor: 'text-[var(--header-text)]' },
    { icon: UserCircle, path: '/profile', label: 'Profile', activeColor: 'text-[var(--header-text)]' },
  ];

  return (
    <div className="w-full bg-[var(--header-bg)] px-2 min-h-[64px] pb-safe flex justify-around items-center z-50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] shrink-0 border-t border-[var(--border-color)] rounded-t-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location.pathname === item.path;
        
        return (
          <Link 
            key={item.path} 
            to={item.path} 
            className="relative flex flex-col items-center justify-center h-full min-w-[64px] transition-all duration-300 group"
          >
            <div className="relative flex flex-col items-center">
              <motion.div 
                animate={{ 
                  scale: isActive ? 1.15 : 1,
                  y: isActive ? -1 : 0
                }}
                className={`transition-colors duration-300 ${isActive ? item.activeColor : 'text-[var(--header-text)]/50 group-hover:text-[var(--header-text)]'}`}
              >
                {Icon && <Icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? 'currentColor' : 'none'}
                  fillOpacity={isActive ? 0.15 : 0}
                />}
              </motion.div>
              
              {item.badge !== undefined && item.badge > 0 && (
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-[var(--header-bg)] shadow-sm z-10"
                >
                  {item.badge > 9 ? '9+' : item.badge}
                </motion.div>
              )}
            </div>
            
            <span className={`text-[10px] mt-1 font-bold transition-all duration-300 ${isActive ? 'text-[var(--header-text)] opacity-100' : 'text-[var(--header-text)]/50 opacity-70 group-hover:opacity-100'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
