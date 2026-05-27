import React from 'react';
import { CAMERA_FILTERS, CameraFilter } from '../utils/filters';
import { Check } from 'lucide-react';

interface FilterSelectorProps {
  selectedFilterId: string;
  onSelectFilter: (filter: CameraFilter) => void;
}

export default function FilterSelector({ selectedFilterId, onSelectFilter }: FilterSelectorProps) {
  return (
    <div className="w-full flex flex-col gap-2 shrink-0 select-none pb-2">
      <div className="flex gap-4 overflow-x-auto px-6 py-2 pb-3 scrollbar-none justify-start md:justify-center items-center">
        {CAMERA_FILTERS.map((filter) => {
          const isSelected = selectedFilterId === filter.id;
          return (
            <button
              key={filter.id}
              onClick={() => onSelectFilter(filter)}
              className="flex flex-col items-center gap-1.5 focus:outline-none shrink-0 cursor-pointer group"
            >
              {/* Filter Thumb Vibe */}
              <div 
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${filter.colorMarker} ${
                  isSelected 
                    ? 'ring-4 ring-[#0494f4] scale-110 shadow-lg shadow-[#0494f4]/30' 
                    : 'scale-95 group-hover:scale-100 opacity-80 group-hover:opacity-100'
                }`}
              >
                {isSelected && (
                  <Check size={18} className="text-white drop-shadow-md font-black" strokeWidth={3} />
                )}
              </div>
              <span className={`text-[10px] uppercase tracking-wider font-extrabold ${
                isSelected ? 'text-[#0494f4]' : 'text-zinc-400 group-hover:text-zinc-200'
              }`}>
                {filter.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
