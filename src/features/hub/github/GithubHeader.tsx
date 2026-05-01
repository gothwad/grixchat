import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface GithubHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  onBack?: () => void;
}

export default function GithubHeader({ title, showBack = true, rightElement, onBack }: GithubHeaderProps) {
  const navigate = useNavigate();

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
        {rightElement}
      </div>
    </div>
  );
}
