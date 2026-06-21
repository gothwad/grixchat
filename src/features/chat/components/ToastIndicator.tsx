import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

interface ToastIndicatorProps {
  toastMessage: string | null;
}

export const ToastIndicator: React.FC<ToastIndicatorProps> = ({ toastMessage }) => {
  return (
    <AnimatePresence>
      {toastMessage && (
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[300] bg-zinc-900/95 dark:bg-zinc-800/95 text-white text-xs font-semibold px-4.5 py-2.5 rounded-full shadow-lg flex items-center gap-2 border border-white/5 backdrop-blur-md"
        >
          <Check size={14} className="text-[var(--primary)]" />
          <span>{toastMessage}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
