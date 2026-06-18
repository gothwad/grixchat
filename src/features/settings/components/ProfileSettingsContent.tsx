import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Bell, 
  MessageSquare, 
  Sliders, 
  Star, 
  VolumeX, 
  UserMinus, 
  HelpCircle, 
  Lock, 
  ChevronRight,
  Info as InfoIcon,
  ChevronRight as ChevronRightIcon,
  QrCode
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../../providers/AuthProvider';
import { CommonSearchBar } from '../../../components/common/CommonSearchBar';
import Avatar from '../../../components/common/Avatar';
import { truncateToChars } from '../../../utils/bioHelper';
import { MultiAccountService, StoredAccount } from '../../../services/MultiAccountService';

export default function ProfileSettingsContent() {
  const { user: authUser, userData } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [switchableAccounts, setSwitchableAccounts] = useState<StoredAccount[]>([]);
  const [showQrModal, setShowQrModal] = useState(false);

  useEffect(() => {
    const list = MultiAccountService.getAccounts().filter((acc) => acc.userId !== authUser?.id);
    setSwitchableAccounts(list);
  }, [authUser]);

  const settingsItems = [
    { icon: Users, label: 'Account Settings', sub: 'Change email, password, delete account', onClick: () => navigate('/account-settings') },
    { icon: Lock, label: 'Privacy Settings', sub: userData?.isPrivate ? 'Private Account' : 'Public Account', onClick: () => navigate('/privacy-settings') },
    { icon: Shield, label: 'App Lock PIN', sub: 'Enable PIN/Passcode protection', onClick: () => navigate('/app-lock') },
    { icon: Bell, label: 'Notifications & Sounds', sub: 'Ringtones, Vibrations & Alerts', onClick: () => navigate('/notifications-settings') },
    { icon: MessageSquare, label: 'Chat Customizer & Wallpaper', sub: 'Bubbles shape, text size, wallpapers', onClick: () => navigate('/chat-settings') },
    { icon: Sliders, label: 'System Preferences', sub: 'App theme, network download, local database Backups', onClick: () => navigate('/app-preferences') },
    { icon: Star, label: 'Favorites Feed', sub: 'Manage star list curation', onClick: () => navigate('/favorites') },
    { icon: VolumeX, label: 'Muted Accounts', sub: 'Silenced chat channels', onClick: () => navigate('/muted-accounts') },
    { icon: UserMinus, label: 'Blocked Accounts', sub: 'Banned chat list users', onClick: () => navigate('/blocked-accounts') },
    { icon: HelpCircle, label: 'Grixvibe FAQ & Support', sub: 'Knowledgebase and system status', onClick: () => navigate('/help') },
    { icon: InfoIcon, label: 'About App', sub: 'Grixvibe V1.2.0 Stable Build', onClick: () => navigate('/app-info') },
  ];

  const DEFAULT_LOGO = "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const profilePic = userData?.photoURL || (userData as any)?.photo_url || authUser?.user_metadata?.avatar_url || DEFAULT_LOGO;

  const filteredItems = settingsItems.filter(item => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.sub && item.sub.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="w-full flex flex-col bg-[var(--bg-card)] overflow-hidden animate-fade-in touch-pan-y">
      <div className="flex-1 overflow-y-auto no-scrollbar pb-32 bg-[var(--bg-card)]">
        {/* Scrollable Reusable Search Bar */}
        <CommonSearchBar 
          placeholder="Search settings..."
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Settings options list */}
        <div className="flex flex-col mt-1 divide-y divide-[var(--border-color)]/5 bg-[var(--bg-card)]">
          {searchQuery === '' && (
            <>
              {/* Profile card click element */}
              <div 
                onClick={() => navigate('/edit-profile')}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
              >
                <Avatar 
                  url={profilePic} 
                  type="direct" 
                  name={userData?.fullName || userData?.username || 'GrixChat User'} 
                  isOnline={false} 
                />
                <div className="flex-1 min-w-0 pr-1">
                  <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight mb-0.5">
                    {userData?.fullName || 'GrixChat User'}
                  </h3>
                  <p className="text-[13px] truncate leading-snug text-[var(--text-secondary)] opacity-75">
                    @{userData?.username || 'username'}
                  </p>
                </div>
                <ChevronRightIcon size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
              </div>
              
              {/* Profile QR Code Scan card action row */}
              <div 
                onClick={() => {
                  setShowQrModal(true);
                  if (typeof navigator !== 'undefined' && navigator.vibrate) {
                    navigator.vibrate(30);
                  }
                }}
                className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[#0494f4]/15 text-[#0494f4] border border-[#0494f4]/10 shadow-sm group-hover:scale-[1.02] transition-all duration-150 shrink-0">
                  <QrCode size={20} className="stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <span className="text-[10px] font-black text-[#0494f4] uppercase tracking-wider block mb-0.5 font-sans opacity-95">
                    Share Profile
                  </span>
                  <h3 className="text-[14.5px] truncate font-semibold text-[var(--text-primary)] leading-tight mb-0.5">
                    My Account QR Scan Code
                  </h3>
                  <p className="text-[12.5px] text-[var(--text-secondary)] opacity-70">
                    Instantly share with friends to chat secure
                  </p>
                </div>
                <ChevronRightIcon size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
              </div>

              {/* Bio block display */}
              {userData?.bio && (
                <div 
                  onClick={() => navigate('/edit-profile')}
                  className="w-full flex items-center gap-3.5 px-4 py-3 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none"
                >
                  <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]/10 shadow-sm group-hover:scale-[1.02] group-active:scale-95 transition-all duration-150 shrink-0">
                    <InfoIcon size={20} className="stroke-[2.2]" />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <span className="text-[10px] font-black text-[#0494f4] uppercase tracking-wider block mb-0.5 font-sans opacity-95">
                      Bio
                    </span>
                    <p className="text-[13px] text-[var(--text-primary)] leading-normal break-words font-medium italic">
                      "{truncateToChars(userData.bio)}"
                    </p>
                  </div>
                  <ChevronRightIcon size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
                </div>
              )}

              {/* Other registered accounts list modeled precisely after standard settings button styling */}
              {switchableAccounts.map((acc) => (
                <button 
                  key={acc.userId}
                  onClick={() => MultiAccountService.switchAccount(acc.userId)}
                  className="w-full flex items-center gap-3.5 px-4 py-3 h-16 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none border-none outline-none bg-transparent"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-[var(--border-color)]/20 shadow-sm shrink-0 group-hover:scale-[1.02] group-active:scale-95 transition-all duration-150">
                    <img 
                      src={acc.photoURL} 
                      alt={acc.fullName} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                    />
                  </div>
                  <div className="flex-1 min-w-0 pr-1">
                    <h4 className="text-[14.5px] font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
                      Switch Profile
                    </h4>
                    <p className="text-[13px] text-[var(--text-secondary)] font-normal mt-0.5 truncate leading-tight opacity-75">
                      @{acc.username}
                    </p>
                  </div>
                  <ChevronRightIcon size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
                </button>
              ))}

            </>
          )}

          {/* Render filtered settings option list */}
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2 select-none px-4">
              <p className="text-[13px] font-bold text-[var(--text-secondary)]">No settings matched your search</p>
              <p className="text-[11px] text-[var(--text-secondary)]/60 max-w-xs">Try searching for app preferences, account, password, sound, block etc.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <button 
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3.5 px-4 py-3 h-16 hover:bg-[var(--border-color)]/5 active:bg-[var(--border-color)]/10 transition-colors group text-left cursor-pointer select-none border-none outline-none"
              >
                <div className="w-11 h-11 rounded-full flex items-center justify-center bg-[var(--primary)] text-[var(--primary-foreground)] border border-[var(--primary)]/10 shadow-sm group-hover:scale-[1.02] group-active:scale-95 transition-all duration-150 shrink-0">
                  <item.icon size={20} className="stroke-[2.2]" />
                </div>
                <div className="flex-1 min-w-0 pr-1">
                  <h4 className="text-[14.5px] font-semibold text-[var(--text-primary)] group-hover:text-[#0494f4] transition-colors leading-tight">
                    {item.label}
                  </h4>
                  {item.sub && (
                    <p className="text-[13px] text-[var(--text-secondary)] font-normal mt-0.5 truncate leading-tight opacity-75">
                      {item.sub}
                    </p>
                  )}
                </div>
                <ChevronRightIcon size={16} className="text-[var(--text-secondary)] opacity-15 group-hover:opacity-60 group-hover:translate-x-0.5 transition-all duration-200 mr-1 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Dynamic Laser-Scanned QR Code Modal overlay wrapper */}
      <AnimatePresence>
        {showQrModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 z-[60] select-none font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-[var(--bg-card)] border border-[var(--border-color)]/35 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative flex flex-col items-center p-6"
            >
              <h3 className="text-sm font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-wider mb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Secure Chat Profile
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed text-center max-w-[260px] opacity-85 mb-6">
                Scan this dynamic barcode layout inside GrixChat scanner camera to begin direct conversation instantly.
              </p>

              {/* Laser scanned container card */}
              <div className="relative w-48 h-48 bg-white border-4 border-[#0494f4]/45 rounded-2xl flex items-center justify-center p-4 overflow-hidden mb-6 group shadow-inner">
                {/* Simulated dynamic scanner green light line looping up and down */}
                <span className="absolute left-0 right-0 h-[2px] bg-emerald-400 opacity-80 shadow-[0_0_12px_#34d399] z-10 animate-[bounce_2.5s_infinite]" />

                {/* Simulated high quality QR content */}
                <div className="grid grid-cols-5 gap-1 w-full h-full opacity-90 select-none">
                  {Array.from({ length: 25 }).map((_, i) => {
                    // Position calculations to simulate correct Corner Positioning Anchors
                    const isAnchor = (i === 0 || i === 4 || i === 20);
                    return (
                      <div 
                        key={i} 
                        className={`rounded-[2px] transition-transform ${
                          isAnchor 
                            ? 'bg-zinc-900 border-[2.5px] border-zinc-900 shadow-sm scale-105' 
                            : (i * 7 + 13) % 3 === 0 
                              ? 'bg-zinc-800' 
                              : (i * 9 + 41) % 5 === 0 
                                ? 'bg-zinc-900' 
                                : 'bg-transparent'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Account mini label banner */}
              <div className="flex items-center gap-2 bg-[var(--bg-main)] border border-[var(--border-color)]/10 py-1.5 px-4 rounded-xl w-full max-w-[250px] mb-6 shadow-sm">
                <Avatar url={profilePic} name={userData?.fullName} size="sm" className="border border-white/10" />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">{userData?.fullName || 'GrixChat User'}</h4>
                  <p className="text-[10px] text-[var(--text-secondary)] truncate">@{userData?.username || 'username'}</p>
                </div>
              </div>

              <div className="flex gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      navigator.clipboard.writeText(`https://grixchat.app/user/${authUser?.id}`);
                    }
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      navigator.vibrate([20, 40, 20]);
                    }
                    alert("Profile Link Copied to Clipboard!");
                  }}
                  className="flex-1 text-[11px] font-black uppercase tracking-wider bg-[#0494f4] hover:bg-[#0494f4]/95 text-white py-3 rounded-xl shadow-md transition-all active:scale-[0.98] border-none cursor-pointer"
                >
                  Copy Link
                </button>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="flex-1 text-[11px] font-black uppercase tracking-wider bg-[var(--bg-main)] hover:bg-[var(--border-color)]/10 text-[var(--text-secondary)] py-3 rounded-xl border border-[var(--border-color)]/15 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
