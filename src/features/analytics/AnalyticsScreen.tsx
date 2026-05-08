import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  BarChart2, 
  Play, 
  Clapperboard, 
  Grid, 
  Camera,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import OverallAnalytics from './OverallAnalytics.tsx';
import PostAnalytics from './PostAnalytics.tsx';
import ReelAnalytics from './ReelAnalytics.tsx';
import TubeAnalytics from './TubeAnalytics.tsx';
import StoryAnalytics from './StoryAnalytics.tsx';

type AnalyticsTab = 'overall' | 'posts' | 'reels' | 'tube' | 'stories';

export default function AnalyticsScreen() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('overall');

  const tabs = [
    { id: 'overall', label: 'Overall', icon: Activity },
    { id: 'posts', label: 'Posts', icon: Grid },
    { id: 'reels', label: 'Reels', icon: Clapperboard },
    { id: 'tube', label: 'Tube', icon: Play },
    { id: 'stories', label: 'Stories', icon: Camera },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[var(--bg-main)] font-sans">
      {/* Header */}
      <div className="shrink-0 bg-[var(--header-bg)] h-14 flex items-center px-4 border-b border-[var(--border-color)] shadow-sm">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 -ml-2 text-[var(--header-text)] active:bg-black/5 rounded-full transition-colors"
        >
          <ChevronLeft size={24} />
        </button>
        <div className="flex items-center gap-2 ml-2">
          <BarChart2 size={20} className="text-blue-500" />
          <h2 className="font-black text-lg text-[var(--header-text)] tracking-tight">Insights</h2>
        </div>
      </div>

      {/* Tabs */}
      <div className="shrink-0 bg-[var(--bg-main)] px-4 py-3 overflow-x-auto no-scrollbar border-b border-[var(--border-color)]">
        <div className="flex gap-2 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalyticsTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20 scale-105' 
                  : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-black/5'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 lg:p-6 bg-[var(--bg-main)]">
        <div className="max-w-4xl mx-auto space-y-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'overall' && <OverallAnalytics />}
              {activeTab === 'posts' && <PostAnalytics />}
              {activeTab === 'reels' && <ReelAnalytics />}
              {activeTab === 'tube' && <TubeAnalytics />}
              {activeTab === 'stories' && <StoryAnalytics />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
