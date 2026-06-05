import React from 'react';
import { Search, X } from 'lucide-react';

interface CallsSearchBarProps {
  placeholder: string;
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}

export const CallsSearchBar: React.FC<CallsSearchBarProps> = ({
  placeholder,
  value,
  onChange,
  onClear,
}) => {
  return (
    <div className="px-4 pt-2 pb-1.5">
      <div 
        className="flex items-center bg-bg-main hover:bg-bg-main/90 focus-within:bg-bg-main rounded-xl px-3.5 h-10 border border-border-color/45 focus-within:border-[#0494f4]/80 focus-within:ring-2 focus-within:ring-[#0494f4]/15 shadow-sm transition-all duration-200"
        style={{ backgroundColor: 'var(--bg-main)', borderColor: 'var(--border-color)' }}
      >
        <Search size={15} className="text-text-secondary mr-2.5 opacity-75 shrink-0 transition-opacity focus-within:text-[#0494f4]" />
        <input 
          type="text" 
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-[13px] font-extrabold text-text-primary placeholder:text-text-secondary/55 shrink-0"
        />
        {value && (
          <button 
            onClick={onClear}
            className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer border-none bg-transparent shrink-0"
          >
            <X size={13} className="text-text-secondary" />
          </button>
        )}
      </div>
    </div>
  );
};

export default CallsSearchBar;
