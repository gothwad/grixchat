import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { Phone, PhoneOff, Video, Volume2, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Highly-polished Web Audio API sound designer for native-like offline-resilient calling sounds
class PhoneRingtones {
  private static audioCtx: AudioContext | null = null;
  private static ringInterval: any = null;

  static playRingtone() {
    this.stop();
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Elegant dual-frequency telephone ring cadences with ambient secondary harmonic harmonics
      const ringPattern = () => {
        const now = ctx.currentTime;
        
        // Main standard frequencies for high-fidelity ringers
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = 'sine';
        osc2.type = 'sine';

        osc1.frequency.setValueAtTime(400, now);
        osc1.frequency.linearRampToValueAtTime(450, now + 0.1);
        osc1.frequency.linearRampToValueAtTime(400, now + 0.5);
        osc1.frequency.linearRampToValueAtTime(450, now + 0.9);
        osc1.frequency.linearRampToValueAtTime(400, now + 1.3);

        osc2.frequency.setValueAtTime(480, now);
        osc2.frequency.linearRampToValueAtTime(520, now + 0.2);
        osc2.frequency.linearRampToValueAtTime(480, now + 0.6);
        osc2.frequency.linearRampToValueAtTime(520, now + 1.0);

        // Professional envelope 1.8s active state, 2.2s dead state
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.08, now + 1.0);
        gainNode.gain.linearRampToValueAtTime(0.08, now + 1.7);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.8);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.85);
        osc2.stop(now + 1.85);
      };

      ringPattern();
      this.ringInterval = setInterval(() => {
        ringPattern();
      }, 4000);
    } catch (e) {
      console.warn('Ringtone failed to generate:', e);
    }
  }

  static playOutgoingBeep() {
    this.stop();
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const beepPattern = () => {
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(425, now);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.05, now + 0.1);
        gain.gain.setValueAtTime(0.05, now + 1.2);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.30);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.35);
      };

      beepPattern();
      this.ringInterval = setInterval(() => {
        beepPattern();
      }, 4000);
    } catch (e) {
      console.warn('Outgoing tone generation failed:', e);
    }
  }

  static stop() {
    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }
  }
}

interface CallContextType {
  incomingCall: any | null;
  caller: any | null;
  acceptCall: () => void;
  rejectCall: () => Promise<void>;
  playOutgoingBeep: () => void;
  stopSounds: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [caller, setCaller] = useState<any>(null);

  useEffect(() => {
    if (!authUser || !supabase) return;

    const fetchIncomingCall = async () => {
      const { data, error } = await supabase
        .from('calls')
        .select('*, users:caller_id(username, photo_url, full_name)')
        .eq('receiver_id', authUser.id)
        .eq('status', 'ringing')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        const callData = data[0];
        setIncomingCall(callData);
        setCaller({
          id: callData.caller_id,
          userName: callData.users?.username,
          fullName: callData.users?.full_name,
          photoURL: callData.users?.photo_url
        });
        
        // Play premium ring tone and vibrate
        PhoneRingtones.playRingtone();
        if (navigator.vibrate) {
          navigator.vibrate([400, 300, 400, 300, 400]);
        }
      } else {
        setIncomingCall(null);
        setCaller(null);
        PhoneRingtones.stop();
      }
    };

    fetchIncomingCall();

    const channel = supabase
      .channel(`calls-for-${authUser.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'calls', 
        filter: `receiver_id=eq.${authUser.id}` 
      }, () => {
        fetchIncomingCall();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
      PhoneRingtones.stop();
    };
  }, [authUser]);

  const acceptCall = () => {
    if (incomingCall) {
      PhoneRingtones.stop();
      const mappedType = incomingCall.type === 'audio' ? 'voice' : incomingCall.type;
      navigate(`/call/${incomingCall.caller_id}?type=${mappedType}&role=receiver&callId=${incomingCall.id}`);
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall && supabase) {
      PhoneRingtones.stop();
      try {
        await supabase
          .from('calls')
          .update({ status: 'rejected', is_missed: true } as any)
          .eq('id', incomingCall.id);

        // System notification / message insertion
        const { data: directConv } = await supabase.rpc('get_direct_conversation_id', {
          u1: authUser?.id,
          u2: incomingCall.caller_id
        });
        if (directConv) {
          await supabase.from('messages').insert({
            conversation_id: directConv,
            sender_id: incomingCall.caller_id, // marked as sender missed log
            text: `📥 Missed ${incomingCall.type === 'audio' ? 'voice' : 'video'} call`,
            type: 'system',
            metadata: { callId: incomingCall.id, callStatus: 'missed', callType: incomingCall.type }
          } as any);
        }
      } catch (e) {
        console.warn('Error rejecting/missing call:', e);
      }
      setIncomingCall(null);
      setCaller(null);
    }
  };

  const playOutgoingBeep = () => {
    PhoneRingtones.playOutgoingBeep();
  };

  const stopSounds = () => {
    PhoneRingtones.stop();
  };

  return (
    <CallContext.Provider value={{ incomingCall, caller, acceptCall, rejectCall, playOutgoingBeep, stopSounds }}>
      {children}
      
      {/* Premium overlay incoming call card */}
      <AnimatePresence>
        {incomingCall && caller && (
          <div className="fixed inset-x-0 top-0 z-[9999] px-4 py-4 pointer-events-none flex justify-center">
            <motion.div
              initial={{ y: -100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -100, opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="w-full max-w-md bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-[2rem] p-5 shadow-2xl flex flex-col gap-4 pointer-events-auto"
            >
              {/* Header Info */}
              <div className="flex items-center gap-3.5">
                <div className="relative shrink-0">
                  <img
                    src={caller.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}
                    alt={caller.fullName || 'User'}
                    className="w-12 h-12 rounded-full object-cover border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-[#0494f4] p-1.5 rounded-full border-2 border-zinc-900 text-white animate-pulse">
                    {incomingCall.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black tracking-widest text-[#0494f4] uppercase bg-[#0494f4]/10 px-2 py-0.5 rounded-full">
                      INCOMING CALL
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-white truncate mt-0.5">
                    {caller.fullName || 'Grixvibe User'}
                  </h4>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                    @{caller.userName || 'username'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 mt-1">
                {/* Decline Button */}
                <button
                  onClick={rejectCall}
                  className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
                >
                  <PhoneOff size={14} />
                  <span>Decline</span>
                </button>

                {/* Answer Button */}
                <button
                  onClick={acceptCall}
                  className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-xs font-semibold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                >
                  <Phone size={14} className="animate-bounce" />
                  <span>Answer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
