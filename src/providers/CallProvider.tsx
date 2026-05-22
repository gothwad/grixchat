import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface CallContextType {
  incomingCall: any | null;
  caller: any | null;
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
      } else {
        setIncomingCall(null);
        setCaller(null);
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
    };
  }, [authUser]);

  const acceptCall = () => {
    if (incomingCall) {
      navigate(`/call/${incomingCall.caller_id}?type=${incomingCall.type}&role=receiver&callId=${incomingCall.id}`);
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall && supabase) {
      try {
        await supabase.from('calls').update({ status: 'ended' } as any).eq('id', incomingCall.id);
      } catch (e) {
        console.warn('Error rejecting call:', e);
      }
      setIncomingCall(null);
    }
  };

  return (
    <CallContext.Provider value={{ incomingCall, caller }}>
      {children}
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
