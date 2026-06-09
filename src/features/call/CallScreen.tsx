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

export default function CallScreen() {
  const { id: otherUserId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user: authUser } = useAuth();
  
  const {
    activeCall,
    localStream,
    remoteStream,
    timer,
    isMuted,
    isVideoOff,
    speakerState,
    isScreenSharing,
    initiateCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    toggleScreenShare,
    flipCamera,
    stopSounds
  } = useCall();
  
  const queryParams = new URLSearchParams(location.search);
  const type = (queryParams.get('type') || 'voice') as CallType; 
  const isReceiver = queryParams.get('role') === 'receiver';

  const [receiver, setReceiver] = useState<any>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  // Retrieve recipient details from database as fallback if needed
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

  // Initiate call if we are the caller and no active call exists
  useEffect(() => {
    if (!isReceiver && otherUserId && !activeCall) {
      initiateCall(otherUserId, type);
    }
  }, [isReceiver, otherUserId, activeCall, initiateCall, type]);

  // Assign local and remote media streams to video element references
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localVideoRef.current]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, remoteVideoRef.current]);

  const handleBack = () => {
    // Instead of terminating the call on back button, we navigate to /chats.
    // The call keeps running in the background and activates the top bar indicator.
    navigate('/chats');
  };

  const handleEndCall = () => {
    endCall();
    navigate('/chats', { replace: true });
  };

  // Safe navigation if call is closed or failed
  useEffect(() => {
    // If we are on the call screen but there is no active call, return to chats after a brief delay
    if (!activeCall) {
      const t = setTimeout(() => {
        navigate('/chats', { replace: true });
      }, 800);
      return () => clearTimeout(t);
    }

    if (activeCall && ['ended', 'denied', 'offline', 'error', 'rejected'].includes(activeCall.status)) {
      const t = setTimeout(() => {
        navigate('/chats', { replace: true });
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [activeCall, navigate]);

  const currentStatus = activeCall?.status || 'connecting';
  const partnerUser = activeCall?.receiver || receiver;

  // Regulate remote client's stream volume dynamically based on speakerState
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
    <div className="absolute inset-0 z-[100] bg-[var(--bg-main)] flex flex-col items-center justify-between text-[var(--text-primary)] font-sans overflow-hidden select-none animate-fade-in">
      {/* Video Streams */}
      {type === 'video' && (
        <VideoFeed 
          localVideoRef={localVideoRef}
          remoteVideoRef={remoteVideoRef}
          isVideoOff={isVideoOff}
          callStatus={currentStatus}
          timer={timer}
        />
      )}

      {/* Profile Details header */}
      <CallHeader 
        receiver={partnerUser}
        callStatus={currentStatus}
        timer={timer}
        type={type}
        onBack={handleBack}
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
        onEndCall={handleEndCall}
      />
    </div>
  );
}
