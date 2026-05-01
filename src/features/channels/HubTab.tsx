import React from 'react';
import { 
  Github,
  Code2,
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
  Bomb
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function HubTab() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Apps",
      items: [
        { id: 'github', name: 'Github', icon: Github, color: 'bg-zinc-900', path: 'https://github.com' },
        { id: 'webide', name: 'Web IDE', icon: Code2, color: 'bg-emerald-600', path: '/hub/web-ide' },
        { id: 'browser', name: 'Browser', icon: Globe, color: 'bg-sky-500', path: '/hub/browser' },
        { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-rose-500', path: '/apps/calendar' },
        { id: 'music', name: 'Music', icon: Music, color: 'bg-pink-500', path: '/apps/music' },
        { id: 'video', name: 'Video', icon: Video, color: 'bg-red-500', path: '/apps/video' },
      ]
    },
    {
      title: "Tools",
      items: [
        { id: 'zip', name: 'Zip Tool', icon: FileArchive, color: 'bg-emerald-500', path: '/tools/zip' },
        { id: 'pdf', name: 'PDF Tool', icon: FileType, color: 'bg-orange-600', path: '/tools/pdf' },
        { id: 'image', name: 'Image Tool', icon: ImageIcon, color: 'bg-purple-500', path: '/tools/image' },
        { id: 'converter', name: 'Converter', icon: RefreshCw, color: 'bg-teal-500', path: '/tools/converter' },
        { id: 'qr', name: 'QR Scanner', icon: QrCode, color: 'bg-zinc-700', path: '/tools/qr' },
        { id: 'pass', name: 'Pass Gen', icon: Lock, color: 'bg-slate-600', path: '/tools/password' },
        { id: 'weather', name: 'Weather', icon: CloudSun, color: 'bg-cyan-500', path: '/tools/weather' },
        { id: 'news', name: 'News', icon: Newspaper, color: 'bg-blue-700', path: '/tools/news' },
      ]
    },
    {
      title: "Games",
      items: [
        { id: 'tictactoe', name: 'Tic Tac Toe', icon: Gamepad2, color: 'bg-indigo-500', path: '/games/tictactoe' },
        { id: 'snake', name: 'Snake', icon: Trophy, color: 'bg-green-500', path: '/games/snake' },
        { id: 'dice', name: 'Ludo Dice', icon: Dices, color: 'bg-rose-500', path: '/games/dice' },
        { id: 'sudoku', name: 'Sudoku', icon: Hash, color: 'bg-amber-600', path: '/games/sudoku' },
        { id: '2048', name: '2048', icon: LayoutGrid, color: 'bg-orange-400', path: '/games/2048' },
        { id: 'tetris', name: 'Tetris', icon: Grid3X3, color: 'bg-blue-600', path: '/games/tetris' },
        { id: 'chess', name: 'Chess', icon: Puzzle, color: 'bg-zinc-800', path: '/games/chess' },
        { id: 'mines', name: 'Mines', icon: Bomb, color: 'bg-red-600', path: '/games/minesweeper' },
      ]
    }
  ];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-main)] font-sans overflow-y-auto no-scrollbar pb-24">
      {/* Content */}
      <div className="px-6 space-y-10 pt-8">
        {sections.map((section) => (
          <section key={section.title}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.2em]">{section.title}</h3>
              <div className="h-[1px] flex-1 bg-[var(--border-color)] ml-4 opacity-50"></div>
            </div>
            
            <div className="grid grid-cols-4 gap-y-8 gap-x-4">
              {section.items.map((item) => (
                <motion.div
                  key={item.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => item.path.startsWith('http') ? window.open(item.path, '_blank') : navigate(item.path)}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform active:shadow-inner`}>
                    <item.icon size={28} />
                  </div>
                  <span className="text-[11px] font-bold text-[var(--text-primary)] text-center leading-tight">
                    {item.name}
                  </span>
                </motion.div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
