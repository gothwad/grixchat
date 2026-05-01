import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Video, Phone, PhoneOff, Check } from 'lucide-react';
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
      {incomingCall && caller && (
        <div className="fixed inset-x-4 top-4 z-[200]">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-4 shadow-2xl flex items-center gap-4">
            <img 
              src={caller.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png"} 
              className="w-12 h-12 rounded-full object-cover border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div className="flex-1">
              <h4 className="text-white text-sm font-black uppercase tracking-tight">{caller.fullName || 'Incoming Call'}</h4>
              <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                {incomingCall.type === 'video' ? <Video size={10} /> : <Phone size={10} />}
                GrixChat {incomingCall.type} Call...
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={rejectCall}
                className="p-3 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
              >
                <PhoneOff size={18} />
              </button>
              <button 
                onClick={acceptCall}
                className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors animate-pulse"
              >
                <Check size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
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
