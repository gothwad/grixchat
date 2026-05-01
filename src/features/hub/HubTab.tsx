import React from 'react';
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
  Gamepad
} from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function HubTab() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Apps",
      items: [
        { id: 'github', name: 'Github', icon: Github, color: 'bg-zinc-900', path: '/hub/github' },
        { id: 'webide', name: 'Web IDE', icon: Code2, color: 'bg-emerald-600', path: 'https://vscode.dev' },
        { id: 'browser', name: 'Browser', icon: Monitor, color: 'bg-sky-500', path: 'https://hyperbeam.com' },
        { id: 'youtube', name: 'YouTube', icon: Video, color: 'bg-red-600', path: 'https://m.youtube.com' },
        { id: 'google', name: 'Google', icon: Globe, color: 'bg-blue-500', path: 'https://www.google.com' },
        { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'bg-rose-500', path: 'https://calendar.google.com' },
        { id: 'music', name: 'Spotify', icon: Music, color: 'bg-green-500', path: 'https://open.spotify.com' },
        { id: 'video', name: 'Video', icon: Video, color: 'bg-red-500', path: 'https://m.youtube.com' },
      ]
    },
    {
      title: "Tools",
      items: [
        { id: 'zip', name: 'Zip Tool', icon: FileArchive, color: 'bg-emerald-500', path: 'https://www.ezyzip.com' },
        { id: 'pdf', name: 'PDF Tool', icon: FileType, color: 'bg-orange-600', path: 'https://www.ilovepdf.com' },
        { id: 'image', name: 'Image Tool', icon: ImageIcon, color: 'bg-purple-500', path: 'https://pixlr.com/x/' },
        { id: 'converter', name: 'Converter', icon: RefreshCw, color: 'bg-teal-500', path: 'https://cloudconvert.com' },
        { id: 'qr', name: 'QR Scanner', icon: QrCode, color: 'bg-zinc-700', path: 'https://qrcodescan.in' },
        { id: 'pass', name: 'Pass Gen', icon: Lock, color: 'bg-slate-600', path: 'https://passwordsgenerator.net' },
        { id: 'weather', name: 'Weather', icon: CloudSun, color: 'bg-cyan-500', path: 'https://www.accuweather.com' },
        { id: 'news', name: 'News', icon: Newspaper, color: 'bg-blue-700', path: 'https://news.google.com' },
      ]
    },
    {
      title: "Games",
      items: [
        { id: 'gameshub', name: 'Games Hub', icon: Gamepad, color: 'bg-indigo-600', path: 'https://www.crazygames.com' },
        { id: 'ludo', name: 'Ludo Stars', icon: Dices, color: 'bg-rose-500', path: 'https://www.ludoking.com' },
        { id: 'tictactoe', name: 'Tic Tac Toe', icon: Gamepad2, color: 'bg-indigo-500', path: 'https://playtictactoe.org' },
        { id: 'snake', name: 'Snake', icon: Trophy, color: 'bg-green-500', path: 'https://www.google.com/search?q=play+snake' },
        { id: 'sudoku', name: 'Sudoku', icon: Hash, color: 'bg-amber-600', path: 'https://sudoku.com' },
        { id: '2048', name: '2048', icon: LayoutGrid, color: 'bg-orange-400', path: 'https://play2048.co' },
        { id: 'tetris', name: 'Tetris', icon: Grid3X3, color: 'bg-blue-600', path: 'https://tetris.com/play-tetris' },
        { id: 'chess', name: 'Chess', icon: Puzzle, color: 'bg-zinc-800', path: 'https://www.chess.com/play/online' },
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
                  onClick={() => {
                    if (item.path.startsWith('http')) {
                      // In PWA standalone mode, this opens inside the app window
                      window.location.href = item.path;
                    } else {
                      navigate(item.path);
                    }
                  }}
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
