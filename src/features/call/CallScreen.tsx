import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Phone, 
  Video, 
  PhoneOff, 
  Mic, 
  MicOff, 
  VideoOff, 
  RotateCcw, 
  Volume2, 
  VolumeX,
  User,
  Lock
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCall } from '../../providers/CallProvider';
import { motion, AnimatePresence } from 'motion/react';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function CallScreen() {
  const { id: otherUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { playOutgoingBeep, stopSounds } = useCall();
  const queryParams = new URLSearchParams(location.search);
  const type = queryParams.get('type') || 'voice'; 
  const isReceiver = queryParams.get('role') === 'receiver';
  const urlCallId = queryParams.get('callId');

  const [receiver, setReceiver] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended' | 'denied' | 'error' | 'offline'>('connecting');
  const [timer, setTimer] = useState(0);
  
  const pc = useRef<RTCPeerConnection>(new RTCPeerConnection(servers));
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const [currentCallId, setCurrentCallId] = useState<string | null>(urlCallId);

  // Stop outgoing ringtone/beeps when connected or finalized
  useEffect(() => {
    if (callStatus === 'connected' || callStatus === 'ended' || callStatus === 'denied' || callStatus === 'error' || callStatus === 'offline') {
      stopSounds();
    }
  }, [callStatus, stopSounds]);

  // Timer effect
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!supabase || !authUser || !otherUserId) return;
    let channel: any;

    const initCall = async () => {
      // 1. Fetch receiver info
      try {
        const { data: userDoc } = await supabase.from('users').select('*').eq('id', otherUserId).single();
        if (userDoc) setReceiver(userDoc);
      } catch (e) {
        console.error("Error fetching receiver:", e);
      }

      // 2. Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true,
        });
        localStream.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        
        stream.getTracks().forEach((track) => {
          pc.current.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Error accessing media devices:", err);
        setCallStatus('error');
        return;
      }

      // 3. Set up remote stream
      remoteStream.current = new MediaStream();
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream.current;

      pc.current.ontrack = (event) => {
        console.log("Remote track received");
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        setCallStatus('connected');
      };

      pc.current.oniceconnectionstatechange = () => {
        console.log("ICE Connection State:", pc.current.iceConnectionState);
        if (pc.current.iceConnectionState === 'disconnected' || pc.current.iceConnectionState === 'failed') {
          endCallLocally();
        }
      };

      // 4. Signaling
      if (isReceiver && currentCallId) {
        await handleIncomingCall(currentCallId);
      } else if (!isReceiver) {
        await startNewCall();
      }

      // 5. Subscription for Call status and Answer
      if (currentCallId) {
        channel = supabase
          .channel(`call-${currentCallId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'calls', filter: `id=eq.${currentCallId}` }, (payload) => {
            const data = payload.new as any;
            if (!data) return;

            if (data.status === 'ended' || data.status === 'denied') {
              setCallStatus(data.status as any);
              setTimeout(() => endCallLocally(), 2000);
            }
            
            if (data.status === 'accepted' && !isReceiver) {
              setCallStatus('connected');
              if (data.answer && !pc.current.currentRemoteDescription) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.current.setRemoteDescription(answerDescription).then(() => {
                  pendingCandidates.current.forEach(candidate => {
                    pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding queued ice candidate:", e));
                  });
                  pendingCandidates.current = [];
                });
              }
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_candidates', filter: `call_id=eq.${currentCallId}` }, (payload) => {
            const data = payload.new as any;
            if (data.user_id === authUser.id) return; // Ignore our own candidates
            
            const candidate = data.candidate as RTCIceCandidateInit;
            if (pc.current.currentRemoteDescription) {
              pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ice candidate:", e));
            } else {
              pendingCandidates.current.push(candidate);
            }
          })
          .subscribe();
      }
    };

    initCall();

    return () => {
      if (channel) channel.unsubscribe();
      stopSounds();
      endCallLocally();
    };
  }, [otherUserId, isReceiver, type, currentCallId, authUser]);

  const addMessageToChat = async (status: 'started' | 'ended' | 'missed', cid: string) => {
    if (!authUser || !otherUserId) return;
    const conversationId = await getConversationId(authUser.id, otherUserId);
    try {
      const text = status === 'started' ? `📞 Started a ${type} call` : 
                   status === 'missed' ? `📥 Missed ${type} call` : 
                   `🏁 ${type.charAt(0).toUpperCase() + type.slice(1)} call ended`;
      
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_id: authUser.id,
        text,
        type: 'system',
        metadata: { callId: cid, callStatus: status, callType: type }
      } as any);
    } catch (e) {
      console.warn("Error adding call message:", e);
    }
  };

  const getConversationId = async (u1: string, u2: string) => {
    const { data: convId } = await supabase.rpc('get_direct_conversation_id', { u1, u2 });
    if (convId) return convId;

    // Helper to generate UUID client-side securely
    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };

    const newConvId = generateUUID();

    // Create if not exists
    const { error } = await supabase.from('conversations').insert({
      id: newConvId,
      type: 'direct'
    } as any);
    
    if (!error) {
      await supabase.from('conversation_participants').insert([
        { conversation_id: newConvId, user_id: u1 },
        { conversation_id: newConvId, user_id: u2 }
      ]);
      return newConvId;
    }
    return null;
  };

  const startNewCall = async () => {
    setCallStatus('connecting');
    playOutgoingBeep(); // Play premium dialing tone!

    // Check remote recipient online status
    let isOnline = false;
    try {
      const { data: userDoc } = await supabase.from('users').select('is_online, last_seen').eq('id', otherUserId).single();
      if (userDoc) {
        const lastSeen = userDoc.last_seen;
        isOnline = !!(userDoc.is_online && lastSeen && (new Date().getTime() - new Date(lastSeen).getTime()) < 65000);
      }
    } catch (e) {
      console.warn("Could not retrieve recipient online status:", e);
    }

    if (!isOnline) {
      setCallStatus('offline');
      // Create instant finished missed call
      const { data: callData } = await supabase.from('calls').insert({
        caller_id: authUser?.id,
        receiver_id: otherUserId,
        type: type === 'voice' ? 'audio' : type,
        status: 'ended',
        is_missed: true
      } as any).select().single();

      if (callData) {
        await addMessageToChat('missed', callData.id);
      }

      // Allow 4 seconds of dialing so the user is updated before closing
      setTimeout(() => {
        stopSounds();
        endCallLocally();
      }, 4000);
      return;
    }

    setCallStatus('ringing');
    
    const offerDescription = await pc.current.createOffer();
    await pc.current.setLocalDescription(offerDescription);

    const { data: callData, error: callError } = await supabase.from('calls').insert({
      caller_id: authUser?.id,
      receiver_id: otherUserId,
      type: type === 'voice' ? 'audio' : type,
      status: 'ringing',
      offer: { sdp: offerDescription.sdp, type: offerDescription.type }
    } as any).select().single();

    if (callError || !callData) {
      console.error("Error creating call record:", callError);
      setCallStatus('error');
      stopSounds();
      return;
    }

    const cid = callData.id;
    setCurrentCallId(cid);

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from('call_candidates').insert({
          call_id: cid,
          user_id: authUser?.id,
          candidate: event.candidate.toJSON(),
          type: 'offer'
        } as any).catch(e => console.error("Error adding offer candidate:", e));
      }
    };

    // Auto-hangup after 60 seconds if not answered
    setTimeout(async () => {
      const { data: snap } = await supabase.from('calls').select('status').eq('id', cid).single();
      if (snap && snap.status === 'ringing') {
        await supabase.from('calls').update({ status: 'ended', is_missed: true } as any).eq('id', cid);
        await addMessageToChat('missed', cid);
        stopSounds();
        endCallLocally();
      }
    }, 60000);
  };

  const handleIncomingCall = async (cid: string) => {
    const { data: callData } = await supabase.from('calls').select('*').eq('id', cid).single();
    
    if (!callData || !callData.offer) {
      console.error("No offer found for incoming call");
      setCallStatus('error');
      return;
    }

    pc.current.onicecandidate = (event) => {
      if (event.candidate) {
        supabase.from('call_candidates').insert({
          call_id: cid,
          user_id: authUser?.id,
          candidate: event.candidate.toJSON(),
          type: 'answer'
        } as any).catch(e => console.error("Error adding answer candidate:", e));
      }
    };

    const offerDescription = callData.offer;
    await pc.current.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await pc.current.createAnswer();
    await pc.current.setLocalDescription(answerDescription);

    await supabase.from('calls').update({ 
      answer: { type: answerDescription.type, sdp: answerDescription.sdp }, 
      status: 'accepted' 
    } as any).eq('id', cid);
    
    await addMessageToChat('started', cid);
  };

  const endCall = async () => {
    if (!currentCallId) return;
    try {
      await supabase.from('calls').update({ status: 'ended' } as any).eq('id', currentCallId);
      await addMessageToChat('ended', currentCallId);
    } catch (e) {
      console.warn("Error updating call status to ended:", e);
    }
    endCallLocally();
  };

  const endCallLocally = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      localStream.current = null;
    }
    
    if (pc.current) {
      if (pc.current.signalingState !== 'closed') {
        pc.current.close();
      }
    }
    
    // We navigate back ONLY if we haven't already
    if (location.pathname.includes('/call/')) {
      navigate('/chats', { replace: true });
    }
  };

  const toggleMute = () => {
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream.current && type === 'video') {
      const videoTrack = localStream.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-between text-white font-sans overflow-hidden">
      {/* Background for Voice Call */}
      {type === 'voice' && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={receiver?.photoURL || "https://picsum.photos/seed/user/800/1200"} 
            className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-opacity duration-1000"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/40 via-transparent to-zinc-950/90"></div>
        </div>
      )}

      {/* Video Streams */}
      {type === 'video' && (
        <div className="absolute inset-0 z-0 bg-black">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover transition-opacity duration-700"
          />
          
          {/* Local Video Overlay */}
          <motion.div 
            drag
            dragMomentum={false}
            dragConstraints={{ left: -200, right: 200, top: -400, bottom: 400 }}
            className="absolute top-10 right-6 w-32 h-48 bg-zinc-900 rounded-3xl overflow-hidden border border-white/20 shadow-2xl z-20 cursor-move"
          >
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${isVideoOff ? 'hidden' : 'block'}`}
            />
            {isVideoOff && (
              <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                <VideoOff size={28} className="text-zinc-600" />
              </div>
            )}
          </motion.div>
          
          {/* Status Overlay for Video Call */}
          <div className="absolute top-10 left-6 z-20 flex items-center gap-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            <div className={`w-2 h-2 rounded-full ${callStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className="text-[10px] font-black uppercase tracking-widest">
              {callStatus === 'connected' ? formatTime(timer) : callStatus.toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Content Container */}
      <div className="relative z-10 w-full flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          <motion.div 
            key={callStatus}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center"
          >
            {/* Avatar Circle */}
            <div className="relative mb-8">
              <div className={`w-40 h-40 rounded-full overflow-hidden border-4 ${callStatus === 'connected' ? 'border-emerald-500/50' : 'border-white/10'} shadow-[0_0_50px_rgba(0,0,0,0.5)] transition-all duration-500`}>
                <img 
                  src={receiver?.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              
              {/* Pulse effect for Ringing */}
              {(callStatus === 'ringing' || callStatus === 'connecting' || callStatus === 'offline') && (
                <>
                  <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30 animate-ping-slow"></div>
                  <div className="absolute -inset-4 rounded-full border border-white/5 animate-pulse"></div>
                </>
              )}
            </div>
            
            <h2 className="text-4xl font-black tracking-tighter mb-3 uppercase drop-shadow-lg">
              {receiver?.fullName || 'GrixChat User'}
            </h2>

            <div className="bg-white/5 backdrop-blur-lg px-6 py-2 rounded-full border border-white/10 flex items-center gap-3">
              <span className="text-[11px] font-black text-zinc-300 uppercase tracking-[0.3em]">
                {callStatus === 'ringing' ? 'Ringing...' : 
                 callStatus === 'connecting' ? 'Establishing Secure Line...' : 
                 callStatus === 'connected' ? formatTime(timer) : 
                 callStatus === 'offline' ? 'User Offline (Missed Call Logged)' : 
                 callStatus === 'ended' ? 'Call Ended' : 
                 callStatus === 'error' ? 'Connection Failed' : 'Waiting...'}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Control Panel */}
      <div className="relative z-10 w-full px-6 pb-16">
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="max-w-md mx-auto bg-zinc-900/80 backdrop-blur-2xl rounded-[3rem] p-6 flex items-center justify-around border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.3)]"
        >
          {/* Speaker Toggle */}
          <button 
            onClick={() => setIsSpeakerOn(!isSpeakerOn)}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isSpeakerOn ? 'bg-white/10 text-white' : 'bg-white text-zinc-950 shadow-xl shadow-white/10'}`}
          >
            {isSpeakerOn ? <Volume2 size={24} /> : <VolumeX size={24} />}
          </button>

          {/* Video Toggle (Only for Video type) */}
          {type === 'video' && (
            <button 
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isVideoOff ? 'bg-white/10 text-white' : 'bg-red-500 text-white shadow-xl shadow-red-500/20'}`}
            >
              {!isVideoOff ? <Video size={24} /> : <VideoOff size={24} />}
            </button>
          )}

          {/* Mute Toggle */}
          <button 
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isMuted ? 'bg-white/10 text-white' : 'bg-red-500 text-white shadow-xl shadow-red-500/20'}`}
          >
            {!isMuted ? <Mic size={24} /> : <MicOff size={24} />}
          </button>

          {/* End Call Button */}
          <button 
            onClick={endCall}
            className="w-20 h-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-600/40 hover:bg-red-700 transition-all active:scale-90"
          >
            <PhoneOff size={32} />
          </button>
        </motion.div>
      </div>

      {/* Footer Info */}
      <div className="relative z-10 pb-8 flex flex-col items-center gap-2 opacity-40">
        <div className="flex items-center gap-2">
          <Lock size={10} className="text-emerald-500" />
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">Signal Encrypted</p>
        </div>
      </div>
    </div>
  );
}
