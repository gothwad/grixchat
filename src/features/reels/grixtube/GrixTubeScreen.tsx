import React, { useState } from 'react';
import { 
  Search, 
  Menu, 
  Bell, 
  UserCircle, 
  Play, 
  Home, 
  Compass, 
  Clock, 
  ThumbsUp,
  MoreVertical,
  ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';

const CATEGORIES = ['All', 'Music', 'Gaming', 'Mixes', 'Live', 'Comedy', 'Programming', 'News', 'Recently uploaded'];

const VIDEOS = [
  {
    id: '1',
    title: 'Building a Social Media App with React & Firebase',
    thumbnail: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&q=80',
    channel: 'Grix Code',
    avatar: 'https://i.pravatar.cc/150?u=grixcode',
    views: '1.2M views',
    time: '2 hours ago',
    duration: '15:24'
  },
  {
    id: '2',
    title: 'Top 10 Hidden Places in Japan',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&q=80',
    channel: 'Traveler Pro',
    avatar: 'https://i.pravatar.cc/150?u=travel',
    views: '850K views',
    time: '5 days ago',
    duration: '10:05'
  },
  {
    id: '3',
    title: 'Midnight Lo-fi Hip Hop Radio 2024',
    thumbnail: 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&q=80',
    channel: 'Lofi Beats',
    avatar: 'https://i.pravatar.cc/150?u=lofi',
    views: '12K watching',
    time: 'LIVE',
    duration: 'LIVE'
  },
  {
    id: '4',
    title: 'The Future of AI: What You Need to Know',
    thumbnail: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80',
    channel: 'Tech Vision',
    avatar: 'https://i.pravatar.cc/150?u=tech',
    views: '3.4M views',
    time: '1 month ago',
    duration: '22:40'
  }
];

export default function GrixTubeScreen() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)]">
      {/* Categories Bar */}
      <div className="shrink-0 flex gap-3 overflow-x-auto px-4 py-3 no-scrollbar border-b border-[var(--border-color)] bg-[var(--header-bg)]">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === cat 
                ? 'bg-[var(--header-text)] text-[var(--header-bg)] shadow-sm' 
                : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border-color)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Video Feed */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="grid grid-cols-1 gap-px bg-[var(--border-color)]">
          {VIDEOS.map(video => (
            <motion.div 
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-[var(--bg-main)] p-4 sm:p-4 active:bg-black/5 transition-colors"
            >
              <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
                <img src={video.thumbnail} className="w-full h-full object-cover" alt={video.title} />
                <span className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/80 text-white text-[10px] font-bold rounded">
                  {video.duration}
                </span>
              </div>
              <div className="flex gap-3">
                <img src={video.avatar} className="w-10 h-10 rounded-full border border-[var(--border-color)]" alt={video.channel} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-[14px] font-bold text-[var(--text-primary)] leading-snug mb-1 line-clamp-2">
                    {video.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-secondary)]">
                    <span>{video.channel}</span>
                    <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                    <span>{video.views}</span>
                    <span className="w-0.5 h-0.5 bg-[var(--text-secondary)] rounded-full" />
                    <span>{video.time}</span>
                  </div>
                </div>
                <button className="p-1 text-[var(--text-secondary)]"><MoreVertical size={16} /></button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
