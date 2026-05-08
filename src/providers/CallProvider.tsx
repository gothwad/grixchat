import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

interface CallContextType {
  incomingCall: any | null;
  caller: any | null;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [caller, setCaller] = useState<any>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "calls"),
      where("receiverId", "==", user.uid),
      where("status", "==", "ringing")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      try {
        if (!snapshot.empty) {
          const callData = snapshot.docs[0].data();
          setIncomingCall({ id: snapshot.docs[0].id, ...callData });
          
          try {
            const userDoc = await getDoc(doc(db, "users", callData.callerId));
            if (userDoc.exists()) setCaller(userDoc.data());
          } catch (e) {
            console.warn('Error fetching caller doc:', e);
          }
        } else {
          setIncomingCall(null);
          setCaller(null);
        }
      } catch (e) {
        console.error('Call snapshot error:', e);
      }
    }, (err) => console.warn('Call query snapshot error:', err));

    return () => unsubscribe();
  }, [user]);

  const acceptCall = () => {
    if (incomingCall) {
      navigate(`/call/${incomingCall.callerId}?type=${incomingCall.type}&role=receiver&callId=${incomingCall.id}`);
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      try {
        await updateDoc(doc(db, "calls", incomingCall.id), { status: 'ended' });
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
