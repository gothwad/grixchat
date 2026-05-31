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
    <div className="flex flex-col gap-3">
      {/* Search Bar */}
      <div className="px-4">
        <div className="relative flex items-center">
          <Search size={15} className="absolute left-3.5 text-[var(--text-secondary)] pointer-events-none" />
          <input
            type="text"
            placeholder="Search contact name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-3 bg-[var(--bg-card)] border border-[var(--border-color)]/40 rounded-xl text-xs text-[var(--text-primary)] outline-none focus:border-[#0494f4]/45 transition-colors placeholder:text-[var(--text-secondary)]/50"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* List Container */}
      <div className="px-4 pb-8 space-y-2">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-7 h-7 border-3 border-[#0494f4]/20 border-t-[#0494f4] rounded-full animate-spin" />
            <p className="text-[9px] font-mono tracking-wider text-[var(--text-secondary)] uppercase">
              Loading Friends...
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center select-none bg-[var(--bg-card)]/50 border border-[var(--border-color)]/25 rounded-2xl p-6">
            <User size={24} className="text-[var(--text-secondary)]/40 mb-2" />
            <p className="text-xs font-bold text-[var(--text-secondary)]">No contacts found</p>
            <p className="text-[10px] text-[var(--text-secondary)]/70 mt-1 max-w-[200px] leading-relaxed">
              Navigate to the Search Tab to follow users and create mutual Grixchat friends!
            </p>
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.id}
              className="flex items-center gap-3.5 bg-[var(--bg-card)] border border-[var(--border-color)]/30 p-3.5 rounded-2xl hover:bg-[var(--bg-card)]/90 transition-colors"
            >
              <div className="relative">
                <img
                  src={contact.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                  alt={contact.username}
                  className="w-11 h-11 rounded-full object-cover border border-[var(--border-color)]/50"
                  referrerPolicy="no-referrer"
                />
                {contact.isOnline && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-zinc-950 animate-pulse" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-black text-[var(--text-primary)] truncate">
                  {contact.fullName || contact.username}
                </h4>
                <p className="text-[10px] text-[var(--text-secondary)] font-mono truncate">
                  @{contact.username}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onCall(contact.id, 'voice')}
                  className="w-9 h-9 rounded-xl bg-[#0494f4]/15 hover:bg-[#0494f4] text-[#0494f4] hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <Phone size={14} />
                </button>
                <button
                  onClick={() => onCall(contact.id, 'video')}
                  className="w-9 h-9 rounded-xl bg-[#0494f4]/15 hover:bg-[#0494f4] text-[#0494f4] hover:text-white transition-colors flex items-center justify-center cursor-pointer shadow-sm"
                >
                  <Video size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
