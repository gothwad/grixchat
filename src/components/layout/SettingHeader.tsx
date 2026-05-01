import React, { useState } from 'react';
import { ChevronLeft, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SettingHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  onBack?: () => void;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  showSearch?: boolean;
}

export default function SettingHeader({ 
  title, 
  showBack = true, 
  rightElement, 
  onBack,
  searchTerm = '',
  setSearchTerm,
  showSearch = false
}: SettingHeaderProps) {
  const navigate = useNavigate();
  const [isSearchActive, setIsSearchActive] = useState(false);

  if (isSearchActive && setSearchTerm) {
    return (
      <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex items-center z-50 shrink-0 relative border-b border-white/10 shadow-lg rounded-b-2xl">
        <div className="flex-1 flex items-center bg-white/10 rounded-full px-4 py-1.5 border border-white/5">
          <Search size={18} className="text-[var(--header-text)] mr-3 opacity-60" />
          <input 
            autoFocus
            type="text" 
            placeholder="Search settings..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-[var(--header-text)] placeholder:text-[var(--header-text)]/50 text-sm font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')}>
              <X size={18} className="text-[var(--header-text)] opacity-60" />
            </button>
          )}
        </div>
        <button 
          onClick={() => {
            setIsSearchActive(false);
            setSearchTerm('');
          }}
          className="ml-4 text-[var(--header-text)] text-sm font-bold uppercase tracking-wider"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-[var(--header-bg)] px-4 h-14 flex justify-between items-center z-50 shrink-0 relative border-b border-white/10 shadow-lg rounded-b-2xl">
      <div className="flex items-center gap-3">
        {showBack && (
          <button 
            onClick={onBack || (() => navigate(-1))}
            className="p-2 hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <ChevronLeft size={24} className="text-[var(--header-text)]" />
          </button>
        )}
        <h1 className="text-lg font-black text-[var(--header-text)] tracking-tight uppercase">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-1 text-[var(--header-text)]">
        {showSearch && setSearchTerm && (
          <button 
            onClick={() => setIsSearchActive(true)}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <Search size={22} />
          </button>
        )}
        {rightElement}
      </div>
    </div>
  );
}
