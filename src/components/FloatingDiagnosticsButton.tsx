import React, { useState, useEffect, useRef } from 'react';
import { Terminal, Lightbulb } from 'lucide-react';
import { loggerService, LogEntry } from '../services/ConsoleLoggerService';

interface FloatingDiagnosticsButtonProps {
  onToggle: () => void;
  isOpen: boolean;
}

export default function FloatingDiagnosticsButton({ onToggle, isOpen }: FloatingDiagnosticsButtonProps) {
  // Initial position: Bottom right area, safely above potential tab bars
  const [position, setPosition] = useState(() => {
    const defaultX = window.innerWidth - 72; // 12px margin from right (~w-14 is 56px)
    const defaultY = window.innerHeight - 150; // Safely above bottom bars
    return { x: defaultX, y: defaultY };
  });

  const [hasNewError, setHasNewError] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const posStartRef = useRef({ x: 0, y: 0 });

  // Update position on window resize to keep it visible
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 64;
        const maxY = window.innerHeight - 64;
        return {
          x: Math.min(Math.max(prev.x, 10), maxX),
          y: Math.min(Math.max(prev.y, 10), maxY),
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Listen to logger service to show warning/error counters on the floating bubble
  useEffect(() => {
    const checkLogs = (logs: LogEntry[]) => {
      const errors = logs.filter(l => l.type === 'error');
      setErrorCount(errors.length);
      if (errors.length > 0) {
        setHasNewError(true);
      }
    };
    
    // Initial check
    checkLogs(loggerService.getLogs());

    const unsubscribe = loggerService.subscribe(checkLogs);
    return () => unsubscribe();
  }, []);

  // Set up Pointer events for seamless mouse & touch drag handling
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Avoid dragging on right-clicks
    if (e.button === 2) return;
    
    // Capture pointer resources
    buttonRef.current?.setPointerCapture(e.pointerId);
    
    isDraggingRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    posStartRef.current = { x: position.x, y: position.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!buttonRef.current?.hasPointerCapture(e.pointerId)) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    // Threshold of 5px to distinguish between click and drag
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      let nextX = posStartRef.current.x + dx;
      let nextY = posStartRef.current.y + dy;

      // Restrict/clamp to screen boundaries
      const btnWidth = buttonRef.current?.offsetWidth || 56;
      const btnHeight = buttonRef.current?.offsetHeight || 56;
      const maxX = window.innerWidth - btnWidth - 8;
      const maxY = window.innerHeight - btnHeight - 8;

      nextX = Math.min(Math.max(nextX, 8), maxX);
      nextY = Math.min(Math.max(nextY, 8), maxY);

      // Directly update the inline styles for perfect high-performance 60fps tracking
      if (buttonRef.current) {
        buttonRef.current.style.left = `${nextX}px`;
        buttonRef.current.style.top = `${nextY}px`;
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!buttonRef.current?.hasPointerCapture(e.pointerId)) return;
    
    buttonRef.current?.releasePointerCapture(e.pointerId);

    if (isDraggingRef.current) {
      // Save final post-drag position in state
      if (buttonRef.current) {
        const left = parseFloat(buttonRef.current.style.left) || position.x;
        const top = parseFloat(buttonRef.current.style.top) || position.y;
        setPosition({ x: left, y: top });
      }
    } else {
      // Toggle Dev Console on regular tap/click
      onToggle();
      if (hasNewError) {
        setHasNewError(false);
      }
    }
    isDraggingRef.current = false;
  };

  // Skip showing if developer console is already open or rendering on top
  if (isOpen) return null;

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        touchAction: 'none', // Critical for preventing touch gestures scrolling the iframe
      }}
      className="z-[99999] w-14 h-14 bg-slate-900/90 dark:bg-[#1a1c20]/95 hover:bg-slate-800 active:scale-95 text-cyan-400 rounded-full flex items-center justify-center border-2 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer select-none transition-transform backdrop-blur-md"
      title="Drag to reposition, Tap to open Diagnostics Console"
      id="floating-dx-trigger"
    >
      <Terminal size={22} className="animate-pulse text-cyan-400" />
      
      {/* Decorative inner neon orbit */}
      <span className="absolute inset-0.5 rounded-full border border-cyan-400/20 pointer-events-none" />

      {/* Error / Logs Indicator badge */}
      {errorCount > 0 ? (
        <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-[10px] text-white font-bold font-mono px-1 rounded-full flex items-center justify-center border border-slate-950 animate-bounce shadow-md">
          {errorCount}
        </span>
      ) : (
        <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-950" />
      )}
    </button>
  );
}
