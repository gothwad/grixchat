import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { CallStatus, CallType } from '../types/callTypes';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

interface UseWebrtcParams {
  otherUserId: string | undefined;
  isReceiver: boolean;
  type: CallType;
  currentCallId: string | null;
  setCurrentCallId: (id: string | null) => void;
  authUser: any;
  setCallStatus: (status: CallStatus) => void;
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
  remoteVideoRef: React.RefObject<HTMLVideoElement | null>;
  addMessageToChat: (status: 'started' | 'ended' | 'missed', cid: string) => Promise<void>;
  endCallLocally: () => void;
}

export const useWebrtc = ({
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
  endCallLocally
}: UseWebrtcParams) => {
  const pc = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);
  const remoteStream = useRef<MediaStream | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    if (!supabase || !authUser || !otherUserId) return;
    let channel: any;

    const initCall = async () => {
      // 1. Initialize peer connection
      pc.current = new RTCPeerConnection(servers);

      // 2. Get local media
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === 'video',
          audio: true,
        });
        localStream.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        stream.getTracks().forEach((track) => {
          pc.current?.addTrack(track, stream);
        });
      } catch (err) {
        console.error("Error accessing media devices in hook:", err);
        setCallStatus('error');
        return;
      }

      // 3. Setup remote stream
      remoteStream.current = new MediaStream();
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream.current;
      }

      pc.current.ontrack = (event) => {
        console.log("Remote track received in hooks");
        event.streams[0].getTracks().forEach((track) => {
          remoteStream.current?.addTrack(track);
        });
        setCallStatus('connected');
      };

      pc.current.oniceconnectionstatechange = () => {
        if (!pc.current) return;
        console.log("ICE Connection State hook:", pc.current.iceConnectionState);
        if (pc.current.iceConnectionState === 'disconnected' || pc.current.iceConnectionState === 'failed') {
          endCallLocally();
        }
      };

      // 4. Handle incoming / outgoing caller negotiation
      if (isReceiver && currentCallId) {
        await handleIncomingCall(currentCallId);
      } else if (!isReceiver) {
        await startNewCall();
      }

      // 5. Subscribe to mutations
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
              if (data.answer && pc.current && !pc.current.currentRemoteDescription) {
                const answerDescription = new RTCSessionDescription(data.answer);
                pc.current.setRemoteDescription(answerDescription).then(() => {
                  pendingCandidates.current.forEach(candidate => {
                    pc.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding queued ice candidate:", e));
                  });
                  pendingCandidates.current = [];
                });
              }
            }
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'call_candidates', filter: `call_id=eq.${currentCallId}` }, (payload) => {
            const data = payload.new as any;
            if (data.user_id === authUser.id) return;
            
            const candidate = data.candidate as RTCIceCandidateInit;
            if (pc.current && pc.current.currentRemoteDescription) {
              pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("Error adding ice candidate:", e));
            } else {
              pendingCandidates.current.push(candidate);
            }
          })
          .subscribe();
      }
    };

    const startNewCall = async () => {
      setCallStatus('connecting');

      // Check remote user status first
      let isOnline = false;
      try {
        const { data: userDoc } = await supabase.from('users').select('is_online, last_seen').eq('id', otherUserId).single();
        if (userDoc) {
          const lastSeen = userDoc.last_seen;
          isOnline = !!(userDoc.is_online && lastSeen && (new Date().getTime() - new Date(lastSeen).getTime()) < 65000);
        }
      } catch (e) {
        console.warn("Could not retrieve recipient online status in hook:", e);
      }

      if (!isOnline) {
        setCallStatus('offline');
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

        setTimeout(() => {
          endCallLocally();
        }, 4000);
        return;
      }

      setCallStatus('ringing');
      if (!pc.current) return;
      
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
        console.error("Error creating call record in hook:", callError);
        setCallStatus('error');
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

      // Auto hangup
      setTimeout(async () => {
        const { data: snap } = await supabase.from('calls').select('status').eq('id', cid).single();
        if (snap && snap.status === 'ringing') {
          await supabase.from('calls').update({ status: 'ended', is_missed: true } as any).eq('id', cid);
          await addMessageToChat('missed', cid);
          endCallLocally();
        }
      }, 60000);
    };

    const handleIncomingCall = async (cid: string) => {
      const { data: callData } = await supabase.from('calls').select('*').eq('id', cid).single();
      
      if (!callData || !callData.offer) {
        console.error("No offer found for incoming call in hook");
        setCallStatus('error');
        return;
      }

      if (!pc.current) return;

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

    initCall();

    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [otherUserId, isReceiver, type, currentCallId, authUser]);

  const endCallPeer = () => {
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
      pc.current = null;
    }
  };

  return {
    localStream,
    remoteStream,
    endCallPeer,
  };
};

export default useWebrtc;
