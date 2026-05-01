import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  icon?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', icon: Icon, loading, fullWidth, children, ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-2xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
    
    const variants = {
      primary: "bg-[var(--primary)] text-white shadow-lg shadow-[var(--primary-shadow)] hover:brightness-110",
      secondary: "bg-[var(--bg-card)] text-[var(--text-primary)] border border-[var(--border-color)] hover:bg-[var(--bg-main)]",
      outline: "bg-transparent border-2 border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5",
      ghost: "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-card)] hover:text-[var(--text-primary)]",
      danger: "bg-red-500 text-white shadow-lg shadow-red-500/20 hover:bg-red-600",
    };

    const sizes = {
      sm: "px-4 py-2 text-xs",
      md: "px-6 py-3 text-sm",
      lg: "px-8 py-4 text-base",
      icon: "p-3",
    };

    const widthClass = fullWidth ? "w-full" : "";

    return (
      <motion.button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthClass} ${className}`}
        {...props}
      >
        {loading ? (
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
        ) : Icon && (
          <Icon size={size === 'sm' ? 16 : 20} className={children ? "mr-2" : ""} />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
