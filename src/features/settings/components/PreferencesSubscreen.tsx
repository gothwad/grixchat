import React, { useState } from 'react';
import { 
  Volume2, 
  Smartphone, 
  Wifi, 
  Timer, 
  Download, 
  Check, 
  ShieldAlert,
  Sparkles,
  VolumeX,
} from 'lucide-react';
import { storage } from '../../../services/StorageService.ts';

export default function PreferencesSubscreen() {
  const [soundHaptic, setSoundHaptic] = useState(() => {
    return storage.getItem('app-sound-haptic') || 'enabled';
  });

  const [autoDownload, setAutoDownload] = useState(() => {
    return storage.getItem('app-auto-download') || 'wifi';
  });

  const [lockTimeout, setLockTimeout] = useState(() => {
    return storage.getItem('app-lock-timeout') || '0';
  });

  const [backingUp, setBackingUp] = useState(false);

  const handleToggleSound = () => {
    const nextVal = soundHaptic === 'enabled' ? 'disabled' : 'enabled';
    setSoundHaptic(nextVal);
    storage.setItem('app-sound-haptic', nextVal);
    
    // Play light click sound on change if enabled
    if (nextVal === 'enabled') {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // brief tap sound
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.1);
      } catch (_) {}
    }
  };

  const handleAutoDownloadChange = (val: string) => {
    setAutoDownload(val);
    storage.setItem('app-auto-download', val);
  };

  const handleTimeoutChange = (val: string) => {
    setLockTimeout(val);
    storage.setItem('app-lock-timeout', val);
  };

  const handleExportData = () => {
    setBackingUp(true);
    setTimeout(() => {
      const exportObj: Record<string, any> = {
        exportedAt: new Date().toISOString(),
        client: 'GrixChat PWA Mobile',
        preferences: {
          bubbleStyle: storage.getItem('app-chat-bubble-style') || 'whatsapp',
          fontSize: storage.getItem('app-chat-font-size') || 'medium',
          soundHaptic,
          autoDownload,
          lockTimeout
        },
        profile: null,
        localChatsBackup: {}
      };

      try {
        const profileRaw = storage.getItem('grix_cached_userdata');
        if (profileRaw) {
          exportObj.profile = JSON.parse(profileRaw);
        }
      } catch (_) {}

      // Gather matching client-side messages & rooms indexes
      try {
        const allData: Record<string, any> = {};
        for (let i = 0; i < window.localStorage.length; i++) {
          const key = window.localStorage.key(i);
          if (key && (key.startsWith('messages:') || key.indexOf('cache') !== -1 || key.indexOf('recent') !== -1)) {
            const val = window.localStorage.getItem(key);
            if (val) {
              try {
                allData[key] = JSON.parse(val);
              } catch (_) {
                allData[key] = val;
              }
            }
          }
        }
        exportObj.localChatsBackup = allData;
      } catch (_) {}

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `grixchat_offline_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      setBackingUp(false);
    }, 800);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Sound and Haptics Toggle */}
      <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 divide-y divide-[var(--border-color)]/20">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-colors ${soundHaptic === 'enabled' ? 'bg-[#0494f4]/10 text-[#0494f4]' : 'bg-zinc-500/10 text-zinc-400'}`}>
              {soundHaptic === 'enabled' ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </div>
            <div className="text-left">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">Sound Effects</h4>
              <p className="text-[11px] text-[var(--text-secondary)] font-medium">Hear sweet sound notifications on chat events</p>
            </div>
          </div>
          <button 
            onClick={handleToggleSound}
            className={`w-11 h-6 rounded-full transition-all relative cursor-pointer outline-none ${
              soundHaptic === 'enabled' ? 'bg-[#0494f4]' : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow-sm ${
              soundHaptic === 'enabled' ? 'left-[22px]' : 'left-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Auto-Download Media Preferences Group */}
      <div>
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] flex items-center gap-1.5 p-1">
          <Wifi size={12} className="text-zinc-400" />
          <span>Auto-Download over Network</span>
        </h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 divide-y divide-[var(--border-color)]/25">
          {[
            { id: 'never', title: 'Never Auto-Download', sub: 'Tap media to download manually' },
            { id: 'wifi', title: 'Only on Wi-Fi connection', sub: 'Saves your cellular/PWA data bandwidth' },
            { id: 'all', title: 'Wi-Fi & Mobile Cellular', sub: 'High speed instant download always' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleAutoDownloadChange(item.id)}
              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[var(--bg-main)]/30 transition-colors cursor-pointer text-left"
            >
              <div>
                <h4 className={`text-sm font-bold ${autoDownload === item.id ? 'text-[#0494f4]' : 'text-[var(--text-primary)]'}`}>
                  {item.title}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">{item.sub}</p>
              </div>
              {autoDownload === item.id && (
                <div className="bg-[#0494f4] p-0.5 rounded-full">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* App Lock Inactivity Timeout Group */}
      <div>
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] flex items-center gap-1.5 p-1">
          <Timer size={12} className="text-zinc-400" />
          <span>Security Auto-Lock Interval</span>
        </h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 divide-y divide-[var(--border-color)]/25">
          {[
            { id: '0', title: 'Immediately', sub: 'Locks whenever you exit or close the tab' },
            { id: '60', title: 'After 1 minutes of idle', sub: 'Gives you speed if multitasking' },
            { id: '300', title: 'After 5 minutes of idle', sub: 'Medium protection interval' },
            { id: 'never', title: 'Session persistence', sub: 'Only lock on manual locking action' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleTimeoutChange(item.id)}
              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-[var(--bg-main)]/30 transition-colors cursor-pointer text-left"
            >
              <div>
                <h4 className={`text-sm font-bold ${lockTimeout === item.id ? 'text-[#0494f4]' : 'text-[var(--text-primary)]'}`}>
                  {item.title}
                </h4>
                <p className="text-[11px] text-[var(--text-secondary)] font-medium mt-0.5">{item.sub}</p>
              </div>
              {lockTimeout === item.id && (
                <div className="bg-[#0494f4] p-0.5 rounded-full">
                  <Check size={11} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Offline Backup Export Section */}
      <div>
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-[0.12em] flex items-center gap-1.5 p-1">
          <Sparkles size={12} className="text-zinc-400" />
          <span>Offline Backup Archive</span>
        </h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/30 p-6">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex gap-4 mb-4">
            <Smartphone size={20} className="text-[#0494f4] shrink-0" />
            <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium leading-relaxed text-left">
              This compiles all localized settings, device-cache profiles, and stored index logs into a compact offline ZIP-JSON format file instantly.
            </p>
          </div>
          <button 
            disabled={backingUp}
            onClick={handleExportData}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#0494f4] text-white hover:bg-[#0494f4]/90 rounded-xl text-xs font-bold shadow-md transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
          >
            <Download size={14} className={backingUp ? "animate-pulse" : ""} />
            <span>{backingUp ? 'Compiling Local Ledger...' : 'Backup Chat Logs & Settings'}</span>
          </button>
        </div>
      </div>

    </div>
  );
}
