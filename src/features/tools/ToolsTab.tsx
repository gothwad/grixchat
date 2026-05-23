import React, { useState } from 'react';
import { 
  Github,
  Code2,
  Monitor,
  Globe,
  Calendar,
  Music,
  Video,
  FileArchive,
  FileType,
  Image as ImageIcon,
  RefreshCw,
  QrCode,
  Lock,
  CloudSun,
  Newspaper,
  Gamepad2,
  Trophy,
  Dices,
  Hash,
  LayoutGrid,
  Grid3X3,
  Puzzle,
  Gamepad,
  Sparkles,
  ArrowUpRight,
  Search,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useLayout } from '../../contexts/LayoutContext.tsx';

interface HubItem {
  id: string;
  name: string;
  subtitle: string;
  icon: any;
  color: string;
  badge?: string;
  path: string;
}

interface HubSection {
  title: string;
  description: string;
  items: HubItem[];
}

export default function ToolsTab() {
  const navigate = useNavigate();
  const { activeFilters } = useLayout();
  const activeFilter = activeFilters['tools'] || 'All';
  const [searchQuery, setSearchQuery] = useState('');

  const sections: HubSection[] = [
    {
      title: "Apps",
      description: "Fast communication, workspace IDE, and social utility suite",
      items: [
        { id: 'github', name: 'Github', subtitle: 'Global repository system & sync', icon: Github, color: 'bg-zinc-900', badge: 'Devs', path: '/tools/github' },
        { id: 'webide', name: 'Web IDE', subtitle: 'Fully functional live code workspace', icon: Code2, color: 'bg-emerald-600', badge: 'Live', path: 'https://vscode.dev' },
        { id: 'browser', name: 'Browser', subtitle: 'Web virtual browser stream engine', icon: Monitor, color: 'bg-sky-500', path: 'https://hyperbeam.com' },
        { id: 'youtube', name: 'YouTube', subtitle: 'On-demand video hub & search', icon: Video, color: 'bg-red-600', path: 'https://m.youtube.com' },
        { id: 'google', name: 'Google', subtitle: 'Global search and network index', icon: Globe, color: 'bg-blue-500', path: 'https://www.google.com' },
        { id: 'calendar', name: 'Calendar', subtitle: 'Personal scheduler & schedule flow', icon: Calendar, color: 'bg-rose-500', path: 'https://calendar.google.com' },
        { id: 'music', name: 'Spotify', subtitle: 'Stream premium soundtracks & audio', icon: Music, color: 'bg-green-500', badge: 'Music', path: 'https://open.spotify.com' },
      ]
    },
    {
      title: "Tools",
      description: "Lightweight single-purpose utilities with complete client utility",
      items: [
        { id: 'zip', name: 'Zip Tool', subtitle: 'Compress & unpack multiple archives', icon: FileArchive, color: 'bg-emerald-500', path: 'https://www.ezyzip.com' },
        { id: 'pdf', name: 'PDF Tool', subtitle: 'Read, merge and compress document PDFs', icon: FileType, color: 'bg-orange-600', path: 'https://www.ilovepdf.com' },
        { id: 'image', name: 'Image Tool', subtitle: 'Edit and paint custom raster drawings', icon: ImageIcon, color: 'bg-purple-500', path: 'https://pixlr.com/x/' },
        { id: 'converter', name: 'Converter', subtitle: 'Super quick audio, video format convert', icon: RefreshCw, color: 'bg-teal-500', path: 'https://cloudconvert.com' },
        { id: 'qr', name: 'QR Scanner', subtitle: 'Generate and scan digital QR tokens', icon: QrCode, color: 'bg-zinc-700', path: 'https://qrcodescan.in' },
        { id: 'pass', name: 'Pass Gen', subtitle: 'High entropy secure key generator', icon: Lock, color: 'bg-slate-600', path: 'https://passwordsgenerator.net' },
        { id: 'weather', name: 'Weather', subtitle: 'Atmospheric update and satellite radar', icon: CloudSun, color: 'bg-cyan-500', path: 'https://www.accuweather.com' },
        { id: 'news', name: 'News', subtitle: 'Real-time aggregated international briefs', icon: Newspaper, color: 'bg-blue-700', path: 'https://news.google.com' },
      ]
    },
    {
      title: "Arena",
      description: "Instant gameplay challenges and interactive multiplayer trials",
      items: [
        { id: 'gameshub', name: 'Games Hub', subtitle: 'Unlimited free HTML5 community games', icon: Gamepad, color: 'bg-indigo-600', badge: '500+', path: 'https://www.crazygames.com' },
        { id: 'ludo', name: 'Ludo Stars', subtitle: 'Classic 4-player online board matches', icon: Dices, color: 'bg-rose-500', badge: 'Multi', path: 'https://www.ludoking.com' },
        { id: 'tictactoe', name: 'Tic Tac Toe', subtitle: 'Smart grid match play vs. active AI state', icon: Gamepad2, color: 'bg-indigo-500', path: 'https://playtictactoe.org' },
        { id: 'snake', name: 'Snake', subtitle: 'Classic responsive pixel eating speedway', icon: Trophy, color: 'bg-green-500', path: 'https://www.google.com/search?q=play+snake' },
        { id: 'sudoku', name: 'Sudoku', subtitle: 'Focus-built mathematical cells logic', icon: Hash, color: 'bg-amber-600', path: 'https://sudoku.com' },
        { id: '2048', name: '2048', subtitle: 'Exponential log tiles accumulation puzzle', icon: LayoutGrid, color: 'bg-orange-400', path: 'https://play2048.co' },
        { id: 'tetris', name: 'Tetris', subtitle: 'Clearing randomized tetromino shapes', icon: Grid3X3, color: 'bg-blue-600', path: 'https://tetris.com/play-tetris' },
        { id: 'chess', name: 'Chess', subtitle: 'Strategic global master chess lobby', icon: Puzzle, color: 'bg-zinc-800', badge: 'Live', path: 'https://www.chess.com/play/online' },
      ]
    }
  ];

  // Map Filter IDs to display title
  const activeLabelMap: Record<string, string> = {
    'All': 'All',
    'Apps': 'Apps',
    'Tools': 'Tools',
    'Arena': 'Arena'
  };

  const currentLabel = activeLabelMap[activeFilter] || 'All';

  // Filter sections and items dynamically
  const filteredSections = sections
    .map(section => {
      // If current filter is specific (Apps/Tools/Arena), match section title
      if (currentLabel !== 'All' && section.title.toLowerCase() !== currentLabel.toLowerCase()) {
        return null;
      }
      
      // Filter items within section by search query
      const items = section.items.filter(item => 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      );

      if (items.length === 0) return null;

      return { ...section, items };
    })
    .filter((s): s is HubSection => s !== null);

  const handleLaunch = (path: string) => {
    if (path.startsWith('http')) {
      window.location.href = path;
    } else {
      navigate(path);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans pb-24 overflow-y-auto no-scrollbar">
      {/* Immersive Search and Spotlight */}
      <div className="p-4 bg-[var(--bg-chat)] border-b border-[var(--border-color)]/60 space-y-3 shrink-0">
        <div className="relative">
          <input
            type="text"
            placeholder={`Search ${currentLabel.toLowerCase() === 'all' ? 'applications, tools & arena' : currentLabel.toLowerCase()}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs p-3 pl-9 rounded-2xl bg-[var(--bg-main)] border border-[var(--border-color)] text-[var(--box-text)] focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:opacity-50 transition-all shadow-inner"
          />
          <Search size={14} className="absolute left-3.5 top-3.5 text-gray-400" />
        </div>

        {/* Display a stunning spotlight hero card only when on "All" view and no query active */}
        {activeFilter === 'All' && !searchQuery && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl bg-gradient-to-r from-rose-500 via-purple-600 to-indigo-600 p-4 text-white overflow-hidden shadow-md cursor-pointer"
            onClick={() => handleLaunch('https://www.crazygames.com')}
          >
            <div className="absolute right-0 bottom-0 opacity-15 translate-x-4 translate-y-4">
              <Sparkles size={120} className="text-white" />
            </div>
            <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full w-max text-[8px] uppercase tracking-wider font-extrabold mb-2.5">
              <Sparkles size={10} className="text-yellow-300 fill-yellow-300" /> Featured Spotlight
            </div>
            <h3 className="text-sm font-black tracking-tight leading-snug">Grix Gaming Arena live!</h3>
            <p className="text-[10px] text-white/85 leading-normal max-w-[80%] mt-1">Play premium HTML5 challenges, Ludo, classic Snake, and Chess instantly inside your social feed container.</p>
            <div className="flex items-center gap-1.5 mt-2.5 text-[10px] bg-white text-indigo-700 px-3 py-1 rounded-full font-bold w-max active:scale-95 transition-all">
              Launch Arena <ArrowUpRight size={11} />
            </div>
          </motion.div>
        )}
      </div>

      {/* Grid rendering with distinct designs */}
      <div className="px-4 py-4 space-y-8">
        <AnimatePresence mode="popLayout">
          {filteredSections.map((section) => (
            <motion.section 
              key={section.title}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-4"
            >
              <div className="flex flex-col gap-0.5 border-b border-[var(--border-color)]/40 pb-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black tracking-widest text-[var(--header-text)] uppercase font-sans">
                    {section.title}
                  </h3>
                  <span className="text-[9px] text-gray-400 font-mono tracking-wide font-extrabold">
                    {section.items.length} ACTIVE
                  </span>
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] opacity-80 leading-snug">
                  {section.description}
                </p>
              </div>

              {/* Redesigned layout: Modern list layout with high-density card information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {section.items.map((item) => (
                  <motion.div
                    key={item.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleLaunch(item.path)}
                    className="flex items-center gap-3.5 p-3 rounded-2xl bg-[var(--bg-chat)] border border-[var(--border-color)] hover:border-blue-500/50 transition-all shadow-sm relative group cursor-pointer"
                  >
                    {/* Glowing rounded launch container */}
                    <div className={`w-12 h-12 ${item.color} rounded-2xl flex items-center justify-center text-white shrink-0 shadow-sm transition-transform group-hover:scale-105 duration-300`}>
                      <item.icon size={22} />
                    </div>

                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-xs font-bold text-[var(--box-text)] tracking-tight truncate leading-normal">
                          {item.name}
                        </h4>
                        {item.badge && (
                          <span className="text-[8px] bg-blue-500/10 text-blue-400 font-extrabold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[var(--text-secondary)] opacity-80 truncate leading-snug font-sans mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    <div className="absolute right-3.5 text-gray-400 opacity-0 group-hover:opacity-100 group-hover:text-blue-500 transition-all duration-300">
                      <ArrowUpRight size={14} />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </AnimatePresence>

        {filteredSections.length === 0 && (
          <div className="py-24 text-center space-y-1">
            <p className="text-gray-400 text-xs font-black uppercase tracking-widest opacity-60">No Applications Match Search</p>
            <p className="text-[10px] text-gray-500">Try searching for other developer, network, or gaming components.</p>
          </div>
        )}
      </div>
    </div>
  );
}
