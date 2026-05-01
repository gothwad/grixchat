import React, { useState } from 'react';
import { 
  LogOut, 
  Shield, 
  Bell, 
  HelpCircle, 
  ChevronRight, 
  Info,
  Key,
  Globe,
  Database,
  Smartphone,
  Search,
  UserCircle,
  Clock,
  Star,
  VolumeX,
  EyeOff,
  Heart,
  Lock,
  Users,
  UserMinus,
  MessageCircle,
  AtSign,
  MessageSquare,
  Share2,
  UserCheck,
  Languages,
  Accessibility,
  Download,
  CreditCard,
  Monitor,
  UserPlus
} from 'lucide-react';
import { auth } from '../../services/firebase.ts';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../../providers/AuthProvider';

import SettingHeader from '../../components/layout/SettingHeader.tsx';

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const sections = [
    {
      title: 'Your Account',
      items: [
        { icon: UserCircle, label: 'Account', sub: 'Privacy, security, change email or phone', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/account-settings') },
        { icon: Lock, label: 'App Lock', sub: 'Secure your app with a PIN', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/app-lock') },
      ]
    },
    {
      title: 'How you use GrixChat',
      items: [
        { icon: Bell, label: 'Notifications', sub: 'Message, group & call tones', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/notifications-settings') },
        { icon: Clock, label: 'Time spent', sub: 'Manage your time on GrixChat', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/time-spent') },
      ]
    },
    {
      title: 'What you see',
      items: [
        { icon: Star, label: 'Favorites', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/favorites') },
        { icon: VolumeX, label: 'Muted accounts', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/muted-accounts') },
        { icon: EyeOff, label: 'Suggested content', color: 'bg-blue-500/10 text-blue-500' },
        { icon: Heart, label: 'Like counts', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'Who can see your content',
      items: [
        { icon: Lock, label: 'Account privacy', sub: userData?.isPrivate ? 'Private' : 'Public', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/privacy-settings') },
        { icon: Star, label: 'Close Friends', color: 'bg-blue-500/10 text-blue-500' },
        { icon: UserMinus, label: 'Blocked', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/blocked-accounts') },
        { icon: EyeOff, label: 'Hide story and live', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'How others can interact with you',
      items: [
        { icon: MessageCircle, label: 'Messages and story replies', color: 'bg-blue-500/10 text-blue-500' },
        { icon: AtSign, label: 'Tags and mentions', color: 'bg-blue-500/10 text-blue-500' },
        { icon: MessageSquare, label: 'Comments', color: 'bg-blue-500/10 text-blue-500' },
        { icon: Share2, label: 'Sharing and remixes', color: 'bg-blue-500/10 text-blue-500' },
        { icon: UserCheck, label: 'Restricted accounts', color: 'bg-blue-500/10 text-blue-500' },
        { icon: EyeOff, label: 'Hidden words', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'Your app and media',
      items: [
        { icon: Download, label: 'Archiving and downloading', color: 'bg-blue-500/10 text-blue-500' },
        { icon: Accessibility, label: 'Accessibility', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/accessibility-settings') },
        { icon: Languages, label: 'Language', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/language-settings') },
        { icon: Smartphone, label: 'App Preferences', sub: 'Theme, cache, and more', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/app-preferences') },
        { icon: Database, label: 'Data usage and media quality', color: 'bg-blue-500/10 text-blue-500' },
        { icon: Globe, label: 'Website permissions', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'For families',
      items: [
        { icon: Users, label: 'Supervision', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'For professionals',
      items: [
        { icon: Monitor, label: 'Account type and tools', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'Your orders and payments',
      items: [
        { icon: CreditCard, label: 'Orders and payments', color: 'bg-blue-500/10 text-blue-500' },
      ]
    },
    {
      title: 'More info and support',
      items: [
        { icon: HelpCircle, label: 'Help', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/help') },
        { icon: Shield, label: 'Privacy Center', color: 'bg-blue-500/10 text-blue-500' },
        { icon: UserCircle, label: 'Account Status', color: 'bg-blue-500/10 text-blue-500' },
        { icon: Info, label: 'About', color: 'bg-blue-500/10 text-blue-500', onClick: () => navigate('/app-info') },
      ]
    }
  ];

  const filteredSections = sections.map(section => ({
    ...section,
    items: section.items.filter(item => 
      item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.sub && item.sub.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="flex flex-col bg-[var(--bg-main)] font-sans h-full overflow-hidden">
      <SettingHeader 
        title="Settings" 
        showSearch={true}
        searchTerm={searchQuery}
        setSearchTerm={setSearchQuery}
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-24">
        {/* Settings Sections */}
        <div className="space-y-6 mt-4">
          {filteredSections.length > 0 ? (
            filteredSections.map((section) => (
              <div key={section.title}>
                <h3 className="px-6 mb-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
                  {section.title}
                </h3>
                <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/50">
                  {section.items.map((item, index) => (
                    <button 
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-main)] transition-colors group ${
                        index !== section.items.length - 1 ? 'border-b border-[var(--border-color)]/30' : ''
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.color} group-active:scale-95 transition-transform shrink-0`}>
                        <item.icon size={18} strokeWidth={2} />
                      </div>
                      <div className="flex-1 text-left">
                        <h4 className="text-[14px] font-bold text-[var(--text-primary)]">{item.label}</h4>
                        {item.sub && <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{item.sub}</p>}
                      </div>
                      <ChevronRight size={18} className="text-[var(--text-secondary)] opacity-30" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 px-10 text-center gap-4 opacity-50">
              <Search size={40} className="text-[var(--text-secondary)]" />
              <p className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>

        {/* Login Section */}
        <div className="mt-10">
          <h3 className="px-6 mb-2 text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-[0.15em]">
            Login
          </h3>
          <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]/50">
            <button 
              onClick={() => navigate('/signup')}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-main)] transition-colors text-blue-500 font-bold text-[14px]"
            >
              Add account
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-main)] transition-colors text-red-500 font-bold text-[14px] border-t border-[var(--border-color)]/30"
            >
              Log out {userData?.username || 'account'}
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-[var(--bg-main)] transition-colors text-red-500 font-bold text-[14px] border-t border-[var(--border-color)]/30"
            >
              Log out of all accounts
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
