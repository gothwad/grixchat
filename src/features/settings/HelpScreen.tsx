import React from 'react';
import { 
  ArrowLeft, 
  HelpCircle, 
  FileText, 
  Shield, 
  Mail, 
  ChevronRight,
  MessageSquare,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function HelpScreen() {
  const navigate = useNavigate();

  const helpItems = [
    {
      icon: HelpCircle,
      label: 'Help Center',
      sub: 'Get help with GrixChat features',
      color: 'text-primary',
      path: '/help'
    },
    {
      icon: FileText,
      label: 'Terms of Service',
      sub: 'Read our terms and conditions',
      color: 'text-emerald-500',
      path: '/terms'
    },
    {
      icon: Shield,
      label: 'Privacy Policy',
      sub: 'How we handle your data',
      color: 'text-indigo-500',
      path: '/privacy-policy'
    },
    {
      icon: Mail,
      label: 'Contact Us',
      sub: 'Reach out to our support team',
      color: 'text-red-500',
      path: '/help'
    }
  ];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader title="Help" />

      <div className="flex-1 overflow-y-auto no-scrollbar py-6">
        {/* Help Options */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">SUPPORT & INFO</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-8">
          {helpItems.map((item, index) => (
            <button 
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center justify-between px-6 py-4 hover:bg-zinc-50/10 transition-colors ${
                index !== helpItems.length - 1 ? 'border-b border-[var(--border-color)]' : ''
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg bg-zinc-50/10 ${item.color}`}>
                  <item.icon size={20} />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{item.label}</h4>
                  <p className="text-[11px] text-[var(--text-secondary)]">{item.sub}</p>
                </div>
              </div>
              <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-40" />
            </button>
          ))}
        </div>

        {/* App Info Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">APP INFORMATION</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-8 p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[var(--primary-shadow)]">
              <MessageSquare size={24} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[var(--text-primary)]">GrixChat</h4>
              <p className="text-[11px] text-[var(--text-secondary)]">Version 1.0.0 (Official Build)</p>
            </div>
          </div>
          <div className="bg-zinc-50/10 border border-[var(--border-color)] rounded-xl p-3 flex gap-3">
            <Info size={16} className="text-primary shrink-0" />
            <p className="text-[10px] text-[var(--text-secondary)] leading-relaxed">
              GrixChat is a secure, fast, and reliable messaging platform developed by Gothwad Technologies.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="py-12 flex flex-col items-center gap-1 opacity-40">
          <span className="text-[var(--text-primary)] font-black tracking-[0.2em] uppercase text-[10px]">GrixChat Help</span>
          <span className="text-[var(--text-secondary)] text-[8px] uppercase tracking-tighter">Secured by Gothwad Technologies</span>
        </div>
      </div>
    </div>
  );
}
