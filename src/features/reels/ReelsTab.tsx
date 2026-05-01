import React from 'react';
import ReelsView from './components/ReelsView.tsx';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

export default function ReelsTab() {
  const navigate = useNavigate();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="h-full overflow-y-auto no-scrollbar pb-24 bg-[var(--bg-card)]">
        <ReelsView />
      </div>
    </div>
  );
}
