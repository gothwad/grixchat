import React, { useState, useEffect } from 'react';
import { Bell, MessageSquare, Phone, Users, Volume2, Vibrate, ChevronRight, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SettingHeader from '../../components/layout/SettingHeader.tsx';
import { useAuth } from '../../providers/AuthProvider';
import { db } from '../../services/firebase';
import { doc, updateDoc } from 'firebase/firestore';

export default function NotificationsSettingsScreen() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  const [settings, setSettings] = useState({
    conversationTones: userData?.settings?.notifications?.conversationTones ?? true,
    highPriority: userData?.settings?.notifications?.highPriority ?? true,
    reactionNotifications: userData?.settings?.notifications?.reactionNotifications ?? true,
    groupHighPriority: userData?.settings?.notifications?.groupHighPriority ?? true,
    vibrate: userData?.settings?.notifications?.vibrate ?? true,
  });

  useEffect(() => {
    if (userData?.settings?.notifications) {
      setSettings(prev => ({
        ...prev,
        ...userData.settings?.notifications
      }));
    }
  }, [userData]);

  const updateServerSettings = async (newSettings: any) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), {
        'settings.notifications': newSettings
      });
    } catch (e) {
      console.error('Failed to update notification settings:', e);
    }
  };

  const toggleSetting = (key: keyof typeof settings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    updateServerSettings(newSettings);
  };

  const [isSendingTest, setIsSendingTest] = useState(false);
  const isIframe = window.self !== window.top;
  const [diag, setDiag] = useState<any>(null);

  const runDiagnosis = async () => {
    const results: any = {
      browserSupport: typeof Notification !== 'undefined',
      permission: typeof Notification !== 'undefined' ? Notification.permission : 'unknown',
      iframe: window.self !== window.top,
      swRegistered: false,
      fcmSupported: false,
      hasToken: !!userData?.fcmTokens?.length,
      config: {
        hasVapid: !!import.meta.env.VITE_FIREBASE_VAPID_KEY
      }
    };

    try {
      const { isSupported } = await import('firebase/messaging');
      results.fcmSupported = await isSupported();
    } catch (e) {
      results.fcmError = String(e);
    }

    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      results.swRegistered = regs.some(r => r.active && r.active.scriptURL.includes('firebase-messaging-sw.js'));
    }

    setDiag(results);
  };

  const sendTestNotification = async () => {
    if (!userData?.fcmTokens?.length) {
      alert("No FCM tokens found. Make sure you have allowed notifications and the token is saved in your profile.");
      return;
    }

    setIsSendingTest(true);
    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokens: userData.fcmTokens,
          title: "Test Notification",
          body: "Hello! This is a test notification from GrixChat 🚀",
          data: { type: 'test' }
        })
      });

      const data = await response.json();
      if (data.success) {
        alert("Test notification sent successfully! Check your notification panel.");
      } else {
        throw new Error(data.error || "Failed to send test notification");
      }
    } catch (e: any) {
      console.error(e);
      alert(`Error: ${e.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleMasterToggle = async () => {
    if (typeof Notification === 'undefined') {
      alert("This browser doesn't support notifications");
      return;
    }

    if (permission === 'granted') {
      // Logic for "disabling" can't revoke browser permission, but we can set a flag
      alert("Browser level permission is already granted. To revoke, use browser site settings.");
      return;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'denied') {
      alert("Notifications are blocked by browser. Please enable them in your browser settings to receive alerts.");
    }
  };

  const Toggle = ({ active, onClick, disabled = false }: { active: boolean, onClick: () => void, disabled?: boolean }) => (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`w-10 h-5 rounded-full transition-all relative ${active ? 'bg-[var(--primary)]' : 'bg-zinc-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${active ? 'right-0.5' : 'left-0.5'}`} />
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-main)] overflow-hidden">
      <SettingHeader title="Notifications" />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {isIframe && (
          <div className="px-6 mt-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
              <AlertCircle size={18} className="text-amber-600 shrink-0" />
              <p className="text-[11px] text-amber-900 leading-snug">
                <b>Iframe Detected:</b> Notifications are often blocked in this preview window. 
                Please <button onClick={() => window.open(window.location.href, '_blank')} className="font-bold underline">Open in a New Tab</button> to enable them.
              </p>
            </div>
          </div>
        )}

        {/* Diagnostics Button */}
        <div className="px-6 mb-6">
          <button 
            onClick={runDiagnosis}
            className="w-full py-3 border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
          >
            <AlertCircle size={14} /> Troubleshoot Notifications
          </button>
          
          {diag && (
            <div className="mt-4 p-4 bg-zinc-900 rounded-xl text-[10px] font-mono text-zinc-300 space-y-1 overflow-x-auto shadow-inner">
               <p className="text-[var(--primary)] font-bold mb-2">DIAGNOSIS REPORT:</p>
               <p>• Browser Support: <span className={diag.browserSupport ? 'text-emerald-400' : 'text-rose-400'}>{String(diag.browserSupport)}</span></p>
               <p>• Permission: <span className={diag.permission === 'granted' ? 'text-emerald-400' : 'text-rose-400'}>{diag.permission}</span></p>
               <p>• In an Iframe: <span className={diag.iframe ? 'text-rose-400' : 'text-emerald-400'}>{String(diag.iframe)}</span></p>
               <p>• FCM Supported: <span className={diag.fcmSupported ? 'text-emerald-400' : 'text-rose-400'}>{String(diag.fcmSupported)}</span></p>
               <p>• SW Registered: <span className={diag.swRegistered ? 'text-emerald-400' : 'text-rose-400'}>{String(diag.swRegistered)}</span></p>
               <p>• Token Check: <span className={diag.hasToken ? 'text-emerald-400' : 'text-rose-400'}>{diag.hasToken ? 'FOUND' : 'MISSING'}</span></p>
               <p>• VAPID Key: <span className={diag.config.hasVapid ? 'text-emerald-400' : 'text-rose-400'}>{diag.config.hasVapid ? 'CONFIGURED' : 'EMPTY'}</span></p>
               {diag.fcmError && <p className="text-rose-400 mt-2">Error: {diag.fcmError}</p>}
               {diag.iframe && (
                 <p className="text-amber-400 mt-2 italic font-sans uppercase">
                   ⚠️ Please open the app in a new tab to fix iframe issues.
                 </p>
               )}
            </div>
          )}
        </div>

        {/* Master Permission Section */}
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mt-6 mb-4">
          <div className="flex items-center justify-between px-6 py-5">
            <div className="flex items-center gap-4">
              <div className={`p-2 rounded-lg ${permission === 'granted' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-zinc-500/10 text-zinc-500'}`}>
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Allow Notifications</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Receive push alerts for messages and calls</p>
                {permission === 'denied' && (
                  <div className="flex items-center gap-1 mt-1 text-rose-500">
                    <AlertCircle size={10} />
                    <span className="text-[9px] font-bold uppercase tracking-tight">Blocked by browser</span>
                  </div>
                )}
                {permission === 'granted' && (
                  <div className="flex items-center gap-1 mt-1 text-emerald-500">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-tight">System permission granted</span>
                  </div>
                )}
              </div>
            </div>
            <Toggle 
              active={permission === 'granted'} 
              onClick={handleMasterToggle} 
            />
          </div>
        </div>

        {permission === 'granted' && (
          <div className="px-6 mb-6">
            <button 
              onClick={sendTestNotification}
              disabled={isSendingTest}
              className="w-full py-2 bg-zinc-100 hover:bg-zinc-200 rounded-lg text-[11px] font-bold uppercase tracking-wider text-zinc-600 transition-colors disabled:opacity-50"
            >
              {isSendingTest ? 'Sending...' : 'Send Test Notification'}
            </button>
          </div>
        )}

        <div className="px-6 mb-4">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 flex gap-3">
             <Volume2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
             <div>
                <p className="text-[11px] font-bold text-blue-900 leading-tight">Conversation Tones</p>
                <p className="text-[10px] text-blue-700/70 mt-0.5">Control sounds for incoming and outgoing messages while you're in a chat.</p>
                <div className="mt-3 flex items-center justify-between bg-white/50 rounded-lg p-2">
                   <span className="text-[10px] font-medium text-blue-900">Enable Tones</span>
                   <Toggle active={settings.conversationTones} onClick={() => toggleSetting('conversationTones')} />
                </div>
             </div>
          </div>
        </div>

        {/* Messages Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">MESSAGES</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-6">
          <button className="w-full flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-4 text-left">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Bell size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Notification tone</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Default (Skyline)</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-40" />
          </button>
          
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-zinc-500/10 text-zinc-500">
                <Vibrate size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Vibrate</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Haptic feedback on alert</p>
              </div>
            </div>
            <Toggle active={settings.vibrate} onClick={() => toggleSetting('vibrate')} />
          </div>

          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <MessageSquare size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">High priority notifications</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Show previews at top of screen</p>
              </div>
            </div>
            <Toggle active={settings.highPriority} onClick={() => toggleSetting('highPriority')} />
          </div>
        </div>

        {/* Groups Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">GROUPS</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)] mb-6">
          <button className="w-full flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-4 text-left">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                <Users size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Group notification tone</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Default (Breeze)</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-40" />
          </button>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                <MessageSquare size={20} />
              </div>
              <div className="text-left">
                <h4 className="text-sm font-bold text-[var(--text-primary)]">High priority notifications</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Show previews at top of screen</p>
              </div>
            </div>
            <Toggle active={settings.groupHighPriority} onClick={() => toggleSetting('groupHighPriority')} />
          </div>
        </div>

        {/* Calls Section */}
        <h3 className="px-6 mb-2 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">CALLS</h3>
        <div className="bg-[var(--bg-card)] border-y border-[var(--border-color)]">
          <button className="w-full flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4 text-left">
              <div className="p-2 rounded-lg bg-rose-500/10 text-rose-500">
                <Phone size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[var(--text-primary)]">Ringtone</h4>
                <p className="text-[11px] text-[var(--text-secondary)]">Default (GrixChat)</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)] opacity-40" />
          </button>
        </div>
        
        <div className="p-8 text-center">
            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest font-black">
                GrixCloud Push v2.4.0 <br/>
                Server Instance: AIS-PRE-442
            </p>
        </div>
      </div>
    </div>
  );
}

