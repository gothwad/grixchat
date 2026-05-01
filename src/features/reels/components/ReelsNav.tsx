import React from 'react';
import { motion } from 'motion/react';

interface ReelsNavProps {
  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

const filters = ['Stories', 'Posts', 'Reels', 'Videos', 'Upload'];

export default function ReelsNav({ activeFilter, setActiveFilter }: ReelsNavProps) {
  return (
    <div className="w-full bg-[#0091EA] px-2 py-1 flex items-center justify-between shadow-sm shrink-0">
      <div className="flex gap-1 w-full justify-around">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <motion.button
              key={filter}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(filter)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all duration-300 ${
                isActive 
                  ? 'bg-white text-[#0091EA] shadow-sm' 
                  : 'text-white/90 hover:bg-white/10'
              }`}
            >
              {filter}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
