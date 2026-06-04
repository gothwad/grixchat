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
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callStatus, setCallStatus] = useState<CallStatus>('connecting');
  const [timer, setTimer] = useState(0);
  const [currentCallId, setCurrentCallId] = useState<string | null>(urlCallId);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

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
  const { localStream, endCallPeer } = useWebrtc({
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
    if (localStream.current) {
      const audioTrack = localStream.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = async () => {
    if (localStream.current) {
      let videoTrack = localStream.current.getVideoTracks()[0];
      if (!videoTrack && isVideoOff) {
        try {
          const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
          const newTrack = videoStream.getVideoTracks()[0];
          if (newTrack) {
            localStream.current.addTrack(newTrack);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStream.current;
            }
            videoTrack = newTrack;
          }
        } catch (e) {
          console.warn("Could not activate camera track dynamically:", e);
        }
      }
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      } else {
        setIsVideoOff(prev => !prev);
      }
    } else {
      setIsVideoOff(prev => !prev);
    }
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b141a] flex flex-col items-center justify-between text-white font-sans overflow-hidden select-none">
      {/* Background for Voice Call */}
      {type === 'voice' && (
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src={receiver?.photoURL || receiver?.photo_url || "https://picsum.photos/seed/user/800/1200"} 
            className="w-full h-full object-cover blur-3xl opacity-20 scale-125 transition-opacity duration-1000"
            alt=""
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b141a]/40 via-transparent to-[#0b141a]/95"></div>
        </div>
      )}

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
      />

      {/* Embedded/Sticky Bottom control panel which matches WhatsApp aesthetics */}
      <CallControlPanel 
        type={type}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isSpeakerOn={isSpeakerOn}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
        onEndCall={endCall}
      />
    </div>
  );
}
