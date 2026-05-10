import React from 'react';
import { ArrowLeft, Shield, Smartphone, Key, UserX, FileText, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function AccountSettingsScreen() {
  const navigate = useNavigate();

  const accountItems = [
    { icon: Shield, label: 'Security notifications', sub: 'Get notified of security changes', color: 'text-primary' },
    { icon: UserX, label: 'Delete account', sub: 'Permanently remove your account', color: 'text-red-500', onClick: () => {
      if (confirm("Are you sure you want to delete your account? This action is irreversible.")) {
        // Logic for deletion would go here, for now we just log out as safety measure or prompt
        alert("Account deletion request received. Please contact support for final confirmation.");
      }
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
    </div>
  );
}
