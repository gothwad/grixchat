import React from 'react';
import { useSearch } from '../../contexts/SearchContext.tsx';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import TabHeader from './TabHeader.tsx';

export default function TopNav() {
  const { searchTerm, setSearchTerm, isSearchOpen, setIsSearchOpen } = useSearch();

  return (
    <div className="relative z-50">
      {isSearchOpen ? (
        <div 
          className="absolute inset-0 bg-[var(--header-bg)] flex items-center px-4 z-[60] h-14 rounded-b-2xl border-b border-[var(--border-color)] shadow-sm"
        >
          <div className="flex-1 flex items-center bg-[var(--bg-chat)] rounded-full px-4 py-1.5 border border-[var(--border-color)]">
            <Search size={18} className="text-[var(--text-secondary)] mr-3" />
            <input 
              autoFocus
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] text-sm font-medium"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}>
                <X size={18} className="text-[var(--text-secondary)]" />
              </button>
            )}
          </div>
          <button 
            onClick={() => {
              setIsSearchOpen(false);
              setSearchTerm('');
            }}
            className="ml-4 text-[var(--header-text)] text-sm font-bold"
          >
            Cancel
          </button>
        </div>
      ) : (
        <TabHeader />
      )}
    </div>
  );
}
