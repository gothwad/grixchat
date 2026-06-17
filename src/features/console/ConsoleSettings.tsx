import React from 'react';
import { 
  Sliders, 
  Trash2, 
  Sparkles, 
  Volume2, 
  Maximize2, 
  Minimize2, 
  Database,
  Check
} from 'lucide-react';
import { loggerService } from '../../services/ConsoleLoggerService';

interface ConsoleSettingsProps {
  logs: any[];
  isCompactMode: boolean;
  onToggleCompact: () => void;
  onBeepTest: () => void;
  isPlayingAudioTest: boolean;
  showToastNotification: (msg: string) => void;
}

export default function ConsoleSettings({
  logs,
  isCompactMode,
  onToggleCompact,
  onBeepTest,
  isPlayingAudioTest,
  showToastNotification
}: ConsoleSettingsProps) {

  const handleTestCreateMockLog = () => {
    const types: ('info' | 'warn' | 'error' | 'success')[] = ['info', 'success', 'warn', 'error'];
    const msgs = [
      'Diagnostic Sync: Validating message queue pipeline integrity...',
      'Auth State Verified: Token handshake initialized successfully.',
      'Memory Footprint Alert: Rapid navigation caching event detected.',
      'AndroidJSInterface Bridge: Native background state check complete.'
    ];
    const randomIndex = Math.floor(Math.random() * types.length);
    loggerService.logCustom(
      types[randomIndex], 
      msgs[randomIndex], 
      `Simulated trace log payload detail payload variables JSON: { responseStatus: 200, thread: "thread_pool_0${randomIndex + 1}", host: "supabase_client_gateway_01" }`
    );
    showToastNotification('Mock debug log event added');
  };

  const handlePurgeLogsBuffer = () => {
    loggerService.clearLogs();
    showToastNotification('Terminal buffer logs purged!');
  };

  return (
    <div className="flex-grow p-4 overflow-y-auto bg-[var(--bg-main)] space-y-4 custom-scrollbar select-none text-[var(--text-primary)]">
      
      {/* Header section */}
      <div className="border-b border-[var(--border-color)]/25 pb-3">
        <h3 className="text-sm font-bold font-sans text-[var(--text-primary)] flex items-center gap-1.5">
          <Sliders size={16} className="text-purple-400" />
          Console UI Settings & Simulated Drivers
        </h3>
        <p className="text-[10px] text-[var(--text-secondary)] mt-0.5">Customize terminal sizes, trigger audio wave synth diagnostics, or append debug logs</p>
      </div>

      <div className="space-y-3.5 max-w-xl">
        
        {/* Toggle Font Size Option */}
        <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-4 transition-all">
          <div>
            <span className="font-semibold text-xs text-[var(--text-primary)] block">Toggle Font Size Mode</span>
            <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              Modify text heights and list spacings to regulate terminal telemetry readability.
            </span>
          </div>

          <button
            onClick={onToggleCompact}
            className="px-3.5 py-2 bg-[var(--box-bg)] hover:bg-[var(--border-color)]/10 border border-[var(--border-color)]/25 text-[var(--text-primary)] font-mono text-[9px] font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer h-10 select-none whitespace-nowrap shrink-0"
          >
            {isCompactMode ? <Maximize2 size={13} className="text-indigo-400" /> : <Minimize2 size={13} />}
            {isCompactMode ? 'Set Regular text' : 'Set Compact text'}
          </button>
        </div>

        {/* Console Tone WebAudio Tone Driver */}
        <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-4 transition-all">
          <div>
            <span className="font-semibold text-xs text-[var(--text-primary)] block">Synthesizer Console Tone</span>
            <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              Trigger a frequency frequency oscillator tone (587Hz D5 note) via WebAudio api to test Android container media path wrappers.
            </span>
          </div>

          <button
            onClick={onBeepTest}
            disabled={isPlayingAudioTest}
            className={`px-3.5 py-2 font-mono text-[9px] font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer h-10 select-none whitespace-nowrap shrink-0 disabled:opacity-40 select-none border ${
              isPlayingAudioTest 
                ? 'bg-pink-500/15 border-pink-500 text-pink-500 animate-pulse' 
                : 'bg-[var(--box-bg)] border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--border-color)]/10'
            }`}
          >
            <Volume2 size={13} />
            {isPlayingAudioTest ? 'Audio playing...' : 'Sound Wave Test'}
          </button>
        </div>

        {/* Append Mock logs */}
        <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-4 transition-all">
          <div>
            <span className="font-semibold text-xs text-[var(--text-primary)] block flex items-center gap-1">
              <Sparkles size={11} className="text-amber-500" />
              Append Simulated debug events
            </span>
            <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              Inject random success/warn/error message blocks loaded with JSON trace payload structures into active terminal stream feeds.
            </span>
          </div>

          <button
            onClick={handleTestCreateMockLog}
            className="px-3.5 py-2 bg-[var(--box-bg)] hover:bg-[var(--border-color)]/10 border border-[var(--border-color)]/25 text-[#0494f4] font-mono text-[9px] font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer h-10 select-none whitespace-nowrap shrink-0 border border-[#0494f4]/20"
          >
            <Database size={13} />
            Simulate Event
          </button>
        </div>

        {/* Wipe Terminal buffer logs */}
        <div className="p-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center justify-between gap-4 transition-all">
          <div>
            <span className="font-semibold text-xs text-rose-500 block font-bold">Wipe Console Screen Buffer</span>
            <span className="text-[9px] text-[var(--text-secondary)] mt-0.5 leading-snug">
              Clear all captured streams from the active screen lists. Subscribing clients updates instantly.
            </span>
          </div>

          <button
            onClick={handlePurgeLogsBuffer}
            className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-600 text-rose-500 hover:text-white border border-rose-500/25 font-mono text-[9px] font-bold uppercase rounded-xl flex items-center gap-1.5 transition-all cursor-pointer h-10 select-none whitespace-nowrap shrink-0 shadow-sm"
          >
            <Trash2 size={13} />
            Purge Buffer ({logs.length})
          </button>
        </div>

      </div>

      {/* Checklist constraints banner */}
      <div className="p-3 bg-[var(--box-bg)] border border-[var(--border-color)] rounded-2xl max-w-xl text-[9px] text-[var(--text-secondary)] font-mono leading-relaxed space-y-1">
        <div className="text-xs font-bold font-sans text-[var(--text-primary)] mb-1 uppercase tracking-wider flex items-center gap-1 select-none">
          <Check size={11} className="text-emerald-500" strokeWidth={3} />
          AndroidJSInterface Checklist
        </div>
        <div>✓ Native background FCM delivery: Active</div>
        <div>✓ Android WebView sound pipeline driver: Connected</div>
        <div>✓ Bidirectional permission wrapper: Configured via prompt permissions</div>
      </div>

    </div>
  );
}
