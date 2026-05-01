import React from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, icon: Icon, fullWidth = true, ...props }, ref) => {
    const baseStyles = "w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl py-4 px-4 text-sm font-bold text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] transition-all placeholder:text-[var(--text-secondary)]/50";
    const iconPadding = Icon ? "pl-12" : "";
    const errorBorder = error ? "border-red-500 focus:border-red-500" : "";
    const widthClass = fullWidth ? "w-full" : "";

    return (
      <div className={`${widthClass} space-y-1.5`}>
        {label && (
          <label className="block text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em] ml-4">
            {label}
          </label>
        )}
        <div className="relative group">
          {Icon && (
            <Icon 
              className={`absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors`} 
              size={18} 
            />
          )}
          <input
            ref={ref}
            className={`${baseStyles} ${iconPadding} ${errorBorder} ${className}`}
            {...props}
          />
        </div>
        {error && (
          <p className="text-[10px] font-bold text-red-500 ml-4 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
