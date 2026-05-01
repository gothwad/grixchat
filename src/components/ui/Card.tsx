import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface CardProps extends HTMLMotionProps<"div"> {
  variant?: 'default' | 'outline' | 'ghost';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hoverable?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'default', padding = 'md', hoverable = false, children, ...props }, ref) => {
    const baseStyles = "rounded-[2rem] transition-all duration-300";
    
    const variants = {
      default: "bg-[var(--bg-card)] border border-[var(--border-color)] shadow-sm",
      outline: "bg-transparent border-2 border-[var(--border-color)]",
      ghost: "bg-transparent hover:bg-[var(--bg-card)]",
    };

    const paddings = {
      none: "p-0",
      sm: "p-3",
      md: "p-5",
      lg: "p-8",
    };

    const hoverClass = hoverable ? "hover:border-[var(--primary)]/30 hover:shadow-lg hover:scale-[1.01] cursor-pointer active:scale-[0.99]" : "";

    return (
      <motion.div
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${paddings[padding]} ${hoverClass} ${className}`}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';
