import React, { useState } from 'react';
import { Phone, Video, Search, X, User } from 'lucide-react';

interface ContactRecord {
  id: string;
  username: string;
  fullName: string;
  photoURL: string;
  isOnline: boolean;
}

interface CallsContactsListProps {
  contacts: ContactRecord[];
  loading: boolean;
  onCall: (userId: string, type: 'voice' | 'video') => void;
}

export const CallsContactsList: React.FC<CallsContactsListProps> = ({
  contacts,
  loading,
  onCall
}) => {
  const [query, setQuery] = useState('');

  const filtered = contacts.filter((c) =>
    (c.fullName || '').toLowerCase().includes(query.toLowerCase()) ||
    (c.username || '').toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3.5">
      {/* Premium Search Bar with high-contrast active bounds */}
      <div className="px-4">
        <div className="relative flex items-center bg-[var(--bg-main)] hover:bg-[var(--bg-main)]/90 focus-within:bg-[var(--bg-main)] rounded-xl px-3.5 h-10 border border-[var(--border-color)]/45 focus-within:border-[#0494f4]/80 focus-within:ring-2 focus-within:ring-[#0494f4]/15 shadow-sm transition-all duration-200">
          <Search size={15} className="text-[var(--text-secondary)] mr-2.5 opacity-75 shrink-0 transition-opacity focus-within:text-[#0494f4]" />
          <input
            type="text"
            placeholder="Search contact name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[13px] font-extrabold text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 shrink-0"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer shrink-0"
            >
              <X size={13} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="px-4 pb-8 space-y-2.5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 border-3 border-[#0494f4]/20 border-t-[#0494f4] rounded-full animate-spin" />
            <p className="text-[9px] font-black tracking-wider text-[var(--text-secondary)] uppercase">
              Loading Friends...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none bg-[var(--bg-card)]/50 border border-[var(--border-color)]/25 rounded-2xl p-6 shadow-sm">
            <User size={24} className="text-[#0494f4]/60 mb-2" />
            <p className="text-xs font-black text-[var(--text-primary)]">No contacts found</p>
            <p className="text-[10px] text-[var(--text-secondary)]/70 mt-1 max-w-[200px] leading-relaxed">
              Navigate to the Search Tab to follow users and create mutual Grixchat friends!
            </p>
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-4 bg-[var(--bg-card)] border border-[var(--border-color)]/25 px-4 py-3.5 rounded-2xl shadow-sm hover:translate-y-[-1px] hover:shadow-md hover:border-[var(--border-color)]/60 transition-all duration-200 select-none group"
            >
              <div className="relative shrink-0">
                <img
                  src={contact.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                  alt={contact.username}
                  className="w-[50px] h-[50px] rounded-full object-cover border border-[var(--border-color)]/40 shrink-0 group-hover:scale-105 transition-transform duration-300"
                  referrerPolicy="no-referrer"
                />
                {contact.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[2.5px] border-[var(--bg-card)] shadow-md animate-pulse shrink-0" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-[14.5px] truncate font-black tracking-tight text-[var(--text-primary)] mb-0.5">
                  {contact.fullName || contact.username}
                </h4>
                <p className="text-[10px] text-[#0494f4] font-extrabold tracking-wide uppercase">
                  @{contact.username}
                </p>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 ml-1">
                <button
                  onClick={() => onCall(contact.id, 'voice')}
                  className="w-10 h-10 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
                  title="Voice Call"
                >
                  <Phone size={15} strokeWidth={2.5} />
                </button>
                <button
                  onClick={() => onCall(contact.id, 'video')}
                  className="w-10 h-10 rounded-xl bg-[#0494f4]/10 text-[#0494f4] hover:bg-[#0494f4] hover:text-white active:scale-95 transition-all duration-200 flex items-center justify-center cursor-pointer shadow-sm"
                  title="Video Call"
                >
                  <Video size={15} strokeWidth={2.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
