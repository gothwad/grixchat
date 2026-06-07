import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { useCall } from '../../providers/CallProvider';

import { CallStatus, CallType } from './types/callTypes';
import { CallHeader } from './components/CallHeader';
import { CallControlPanel } from './components/CallControlPanel';
import { VideoFeed } from './components/VideoFeed';
import { useWebrtc } from './hooks/useWebrtc';

export default function CallScreen() {
  const { id: otherUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  const { playOutgoingBeep, stopSounds } = useCall();
  
  const queryParams = new URLSearchParams(location.search);
  const type = (queryParams.get('type') || 'voice') as CallType; 
  const isReceiver = queryParams.get('role') === 'receiver';
  const urlCallId = queryParams.get('callId');

  const [receiver, setReceiver] = useState<any>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
  const [speakerState, setSpeakerState] = useState<number>(2); // 0 = voice muted, 1 = earpiece, 2 = loudspeaker
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [timer, setTimer] = useState(0);
  const [currentCallId, setCurrentCallId] = useState<string | null>(urlCallId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Stop outgoing sound effects when line connected/finalized
  useEffect(() => {
    if (['connected', 'ended', 'denied', 'error', 'offline'].includes(callStatus)) {
      stopSounds();
    }
  }, [callStatus, stopSounds]);

  // Duration Timer
  useEffect(() => {
    let interval: any;
    if (callStatus === 'connected') {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [callStatus]);

  // Retrieve recipient details from database
  useEffect(() => {
    if (!supabase || !otherUserId) return;
    supabase
      .from('users')
      .select('*')
      .eq('id', otherUserId)
      .single()
      .then(({ data }) => {
        if (data) setReceiver(data);
      })
      .catch(e => console.warn("Error fetching calling recipient details:", e));
  }, [otherUserId]);

  const addMessageToChat = async (status: 'started' | 'ended' | 'missed', cid: string) => {
    if (!authUser || !otherUserId || !supabase) return;
    try {
      const { data: convId } = await supabase.rpc('get_direct_conversation_id', { u1: authUser.id, u2: otherUserId });
      let finalConvId = convId;

      if (!finalConvId) {
        const generatedId = crypto.randomUUID();
        const { error } = await supabase.from('conversations').insert({ id: generatedId, type: 'direct' } as any);
        if (!error) {
          await supabase.from('conversation_participants').insert([
            { conversation_id: generatedId, user_id: authUser.id },
            { conversation_id: generatedId, user_id: otherUserId }
          ]);
          finalConvId = generatedId;
        }
      }

      if (finalConvId) {
        const text = status === 'started' ? `📞 Started a ${type} call` : 
                     status === 'missed' ? `📥 Missed ${type} call` : 
                     `🏁 ${type.charAt(0).toUpperCase() + type.slice(1)} call ended`;
        
        await supabase.from('messages').insert({
          conversation_id: finalConvId,
          sender_id: authUser.id,
          text,
          type: 'system',
          metadata: { callId: cid, callStatus: status, callType: type }
        } as any);
      }
    } catch (e) {
      console.warn("Error adding call message:", e);
    }
  };

  const endCallLocally = () => {
    endCallPeer();
    stopSounds();
    if (location.pathname.includes('/call/')) {
      navigate('/chats', { replace: true });
    }
  };

  // Wire WebRTC signaling and media flow
  const { localStream, endCallPeer, flipCamera } = useWebrtc({
    otherUserId,
    isReceiver,
    type,
    currentCallId,
    setCurrentCallId,
    authUser,
    setCallStatus,
    localVideoRef,
    remoteVideoRef,
    addMessageToChat,
    endCallLocally,
  });

  // Play Dialing sounds on outer client initiation
  useEffect(() => {
    if (!isReceiver) {
      playOutgoingBeep();
    }
    return () => {
      stopSounds();
    };
  }, [isReceiver]);

  const endCall = async () => {
    if (!currentCallId || !supabase) {
      endCallLocally();
      return;
    }
    try {
      await supabase.from('calls').update({ status: 'ended' } as any).eq('id', currentCallId);
      await addMessageToChat('ended', currentCallId);
    } catch (e) {
      console.warn("Error updating call status to ended:", e);
    }
    endCallLocally();
  };

  const toggleMute = () => {
    setIsMuted(prev => {
      const targetMuted = !prev;
      if (localStream.current) {
        const audioTrack = localStream.current.getAudioTracks()[0];
        if (audioTrack) {
          audioTrack.enabled = !targetMuted;
        }
      }
      return targetMuted;
    });
  };

  const toggleVideo = async () => {
    setIsVideoOff(prev => {
      const targetVideoOff = !prev;
      if (localStream.current) {
        let videoTrack = localStream.current.getVideoTracks()[0];
        if (!videoTrack && !targetVideoOff) {
          navigator.mediaDevices.getUserMedia({ video: true })
            .then(videoStream => {
              const newTrack = videoStream.getVideoTracks()[0];
              if (newTrack && localStream.current) {
                localStream.current.addTrack(newTrack);
                if (localVideoRef.current) {
                  localVideoRef.current.srcObject = localStream.current;
                }
                newTrack.enabled = true;
              }
            })
            .catch(e => console.warn("Could not activate camera track dynamically:", e));
        } else if (videoTrack) {
          videoTrack.enabled = !targetVideoOff;
        }
      }
      return targetVideoOff;
    });
  };

  const toggleSpeaker = () => {
    setSpeakerState(prev => (prev + 1) % 3);
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => {
          track.stop();
          track.enabled = false;
        });
        screenStreamRef.current = null;
      }
      setIsScreenSharing(false);
      // Revert remote video/local video back to standard feed
      if (localStream.current && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream.current;
      }
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = stream;
        setIsScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Listen for when browser cancels screen sharing
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          screenStreamRef.current = null;
          if (localStream.current && localVideoRef.current) {
            localVideoRef.current.srcObject = localStream.current;
          }
        };
      } catch (e) {
        console.warn("Screen sharing failed or cancelled by user:", e);
      }
    }
  };

  // Regulate remote client's stream volume dynamically based on earpiece vs loudspeaker vs muted State
  useEffect(() => {
    if (remoteVideoRef.current) {
      if (speakerState === 0) {
        remoteVideoRef.current.volume = 0;
        remoteVideoRef.current.muted = true;
      } else if (speakerState === 1) {
        remoteVideoRef.current.volume = 0.25; // low speaker/receiver mode
        remoteVideoRef.current.muted = false;
      } else {
        remoteVideoRef.current.volume = 1.0; // loudspeaker mode
        remoteVideoRef.current.muted = false;
      }
    }
  }, [speakerState]);

  return (
    <div className="absolute inset-0 z-[100] bg-[var(--bg-main)] flex flex-col items-center justify-between text-[var(--text-primary)] font-sans overflow-hidden select-none">
      {/* Video Streams */}
      {type === 'video' && (
        <VideoFeed 
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          isVideoOff={isVideoOff}
          callStatus={callStatus}
          timer={timer}
        />
      )}

      {/* Profile Details header */}
      <CallHeader 
        receiver={receiver}
        callStatus={callStatus}
        timer={timer}
        type={type}
        onBack={endCall}
        onFlipCamera={flipCamera}
      />

      {/* Embedded/Sticky Bottom control panel which matches WhatsApp aesthetics */}
      <CallControlPanel 
        type={type}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        speakerState={speakerState}
        isScreenSharing={isScreenSharing}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
        onToggleScreenShare={toggleScreenShare}
        onEndCall={endCall}
      />
    </div>
  );
}
