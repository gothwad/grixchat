import React, { useState } from 'react';
import { ArrowLeft, Shield, Smartphone, Key, UserX, FileText, ChevronRight, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import ReauthSheet from './components/ReauthSheet';
import ChangeEmailSheet from './components/ChangeEmailSheet';
import ChangePasswordSheet from './components/ChangePasswordSheet';
import DeleteAccountSheet from './components/DeleteAccountSheet';
import { auth } from '../../services/firebase.ts';

export default function AccountSettingsScreen() {
  const navigate = useNavigate();
  const [isReauthOpen, setIsReauthOpen] = useState(false);
  const [isEmailSheetOpen, setIsEmailSheetOpen] = useState(false);
  const [isPasswordSheetOpen, setIsPasswordSheetOpen] = useState(false);
  const [isDeleteSheetOpen, setIsDeleteSheetOpen] = useState(false);
  const [reauthCallback, setReauthCallback] = useState<'email' | 'password' | 'delete' | null>(null);

  const currentUser = auth.currentUser;
  const isPasswordUser = currentUser?.providerData.some(p => p.providerId === 'password');

  const handleReauthSuccess = () => {
    setIsReauthOpen(false);
    if (reauthCallback === 'email') {
      setIsEmailSheetOpen(true);
    } else if (reauthCallback === 'password') {
      setIsPasswordSheetOpen(true);
    } else if (reauthCallback === 'delete') {
      setIsDeleteSheetOpen(true);
    }
    setReauthCallback(null);
  };

  const accountItems = [
    { icon: Shield, label: 'Security notifications', sub: 'Get notified of security changes', color: 'text-primary', onClick: () => alert("Security notifications are enabled by default for your protection.") },
    { 
      icon: Mail, 
      label: 'Change Email', 
      sub: currentUser?.email || 'Update your email address', 
      color: 'text-blue-500',
      onClick: () => {
        if (!isPasswordUser) {
          alert("You are signed in with a social account. Please manage your email through your provider settings.");
          return;
        }
        setReauthCallback('email');
        setIsReauthOpen(true);
      }
    },
    { 
      icon: Lock, 
      label: 'Change Password', 
      sub: 'Update your login password', 
      color: 'text-orange-500',
      onClick: () => {
        if (!isPasswordUser) {
          alert("You are signed in with a social account. Please manage your password through your provider settings.");
          return;
        }
        setReauthCallback('password');
        setIsReauthOpen(true);
      }
    },
    { icon: UserX, label: 'Delete account', sub: 'Permanently remove your account', color: 'text-red-500', onClick: () => {
      setReauthCallback('delete');
      setIsReauthOpen(true);
    }},
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader title="Account" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
          {accountItems.map((item, index) => (
            <button 
              key={item.label}
              onClick={item.onClick}
              className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-zinc-50/10 transition-colors ${
                index !== accountItems.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className={`p-2 rounded-lg bg-zinc-50/10 ${item.color}`}>
                <item.icon size={20} />
              </div>
              <div className="flex-1 text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.label}</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">{item.sub}</p>
              </div>
              <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
            </button>
          ))}
        </div>

        <div className="p-6">
          <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed text-center">
            Your account security is our priority. GrixChat uses end-to-end encryption to protect your messages and calls.
          </p>
        </div>
      </div>

      <ReauthSheet 
        isOpen={isReauthOpen} 
        onClose={() => setIsReauthOpen(false)} 
        onSuccess={handleReauthSuccess}
      />

      <ChangeEmailSheet 
        isOpen={isEmailSheetOpen} 
        onClose={() => setIsEmailSheetOpen(false)} 
        onSuccess={() => {}} 
      />

      <ChangePasswordSheet 
        isOpen={isPasswordSheetOpen} 
        onClose={() => setIsPasswordSheetOpen(false)} 
        onSuccess={() => {}} 
      />

      <DeleteAccountSheet 
        isOpen={isDeleteSheetOpen} 
        onClose={() => setIsDeleteSheetOpen(false)} 
      />
    </div>
  );
}
