import React, { useEffect, useState } from 'react';
import { 
  ArrowLeft, 
  Shield, 
  EyeOff, 
  UserCircle, 
  Lock, 
  Trash2,
  ChevronRight,
  Globe,
  LockKeyhole,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { motion } from 'motion/react';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function PrivacySettingsScreen() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribe = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const updatePrivacySetting = async (field: string, value: any) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, "users", auth.currentUser.uid), {
        [field]: value
      });
    } catch (error) {
      console.error("Error updating privacy setting:", error);
    }
  };

  const Toggle = ({ active, onClick }: { active: boolean, onClick: () => void }) => (
    <button 
      onClick={onClick}
      className={`w-10 h-5 rounded-full transition-all relative ${active ? 'bg-primary' : 'bg-zinc-300'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );

  const settings = [
    {
      id: 'hideFromSearch',
      icon: EyeOff,
      label: 'Hide from search',
      sub: "Others won't find you in search results",
      color: 'text-primary'
    },
    {
      id: 'hidePhoto',
      icon: UserCircle,
      label: 'Private Photo',
      sub: 'Only you can see your profile picture',
      color: 'text-emerald-500'
    },
    {
      id: 'appLock',
      icon: Lock,
      label: 'App Lock',
      sub: 'Require PIN to open GrixChat',
      color: 'text-indigo-500'
    },
    {
      id: 'dontSaveChat',
      icon: Trash2,
      label: "Ghost Mode",
      sub: 'Chat history is not saved on servers',
      color: 'text-red-500'
    }
  ];

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-main)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isPrivate = userData?.profileType === 'private';

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader title="Privacy" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        {/* Profile Type Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">ACCOUNT PRIVACY</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-6 p-6">
          <div className="flex p-1.5 bg-zinc-100/10 border border-[var(--border-color)] rounded-2xl gap-1.5 mb-4">
            <button 
              onClick={() => updatePrivacySetting('profileType', 'public')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                !isPrivate 
                ? 'bg-primary text-white shadow-lg shadow-[var(--primary-shadow)]' 
                : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <Globe size={14} />
              Public
            </button>
            <button 
              onClick={() => updatePrivacySetting('profileType', 'private')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                isPrivate 
                ? 'bg-zinc-900 text-white shadow-lg' 
                : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <LockKeyhole size={14} />
              Private
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-medium text-center px-4">
            {isPrivate 
              ? "Private accounts only show your profile to people you approve. Existing followers won't be affected."
              : "Public accounts are visible to everyone on GrixChat. Anyone can follow you and see your posts."
            }
          </p>
        </div>

        {/* Advanced Controls */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">ADVANCED CONTROLS</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-6">
          {settings.map((item, index) => (
            <div 
              key={item.id}
              className={`flex items-center justify-between px-6 py-4 ${
                index !== settings.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-zinc-50/10 ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.label}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">{item.sub}</p>
                </div>
              </div>
              {item.id === 'appLock' ? (
                <button 
                  onClick={() => navigate('/app-lock')}
                  className="p-2 hover:bg-zinc-50/10 rounded-full transition-colors"
                >
                  <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
                </button>
              ) : (
                <Toggle active={userData?.[item.id]} onClick={() => updatePrivacySetting(item.id, !userData?.[item.id])} />
              )}
            </div>
          ))}
        </div>

        {/* Safety Tip */}
        <div className="px-6">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex gap-4">
            <UserCheck size={20} className="text-emerald-500 shrink-0" />
            <p className="text-[11px] text-emerald-600 font-medium leading-relaxed">
              GrixChat uses end-to-end encryption. Your privacy is our priority. Never share your credentials.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="py-12 flex flex-col items-center gap-1 opacity-40">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck size={14} className="text-[var(--text-primary)]" />
            <span className="text-[var(--text-primary)] text-[9px] font-black tracking-[0.2em] uppercase">GrixChat Privacy</span>
          </div>
          <span className="text-[var(--text-secondary)] text-[8px] uppercase tracking-tighter">Secured by Gothwad Technologies</span>
        </div>
      </div>
    </div>
  );
}
