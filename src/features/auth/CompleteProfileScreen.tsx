import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { useNavigate } from 'react-router-dom';
import { User, AtSign, Lock, Check, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function CompleteProfileScreen() {
  const { user, refreshUserData } = useAuth();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supabase) return;
    
    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Check if username is unique in Supabase (only if changed or just setting for first time)
      // For simplicity, always check if username is provided
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .neq('id', user.id) // Exclude current user
        .maybeSingle();
      
      if (checkError) throw checkError;
      if (existingUser) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      // 2. Update Password in Supabase Auth if provided
      if (password) {
        const { error: authError } = await supabase.auth.updateUser({
          password: password,
          data: { full_name: fullName }
        });
        if (authError) throw authError;
      } else {
        // Just update metadata if no password provided (e.g. Google user just setting username)
        const { error: authError } = await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
        if (authError) throw authError;
      }

      // 3. Upsert profile in users table
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          username: username.toLowerCase().trim(),
          photo_url: user?.user_metadata?.avatar_url || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
          updated_at: new Date().toISOString()
        } as any);

      if (profileError) throw profileError;

      // Refresh local user data in provider
      await refreshUserData();

      // Force a slight delay to allow AuthProvider to sync via Realtime if possible
      // or just navigate and let App.tsx guard handle it
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center relative font-sans">
      <div className="w-full px-8 pt-8 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-4">
          <div className="w-16 h-16 bg-[var(--bg-card)] rounded-[20px] shadow-sm flex items-center justify-center border border-[var(--border-color)] p-0 overflow-hidden">
            <img 
              src="/assets/icon-512-maskable.png" 
              alt="Logo" 
              className="w-full h-full object-cover scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Header Area */}
        <div className="text-center mb-4">
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">Complete Profile</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[280px] mx-auto opacity-80">
            Set up your identity to join the GrixChat community.
          </p>
        </div>

        <form onSubmit={handleComplete} className="w-full space-y-4">
          <div className="relative group">
            <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="relative group">
            <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Choose username"
              value={username}
              maxLength={15}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/\s/g, '_').substring(0, 15);
                // Only allow small letters, numbers, and underscores
                if (/^[a-z0-9_]*$/.test(val)) {
                  setUsername(val);
                }
              }}
              className="w-full pl-12 pr-12 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
            <div className="group absolute right-4 top-1/2 -translate-y-1/2">
              <HelpCircle size={14} className="text-[var(--text-secondary)] cursor-help" />
              <span className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-48 p-2 bg-zinc-800 text-white text-[10px] rounded-lg shadow-xl z-50">
                Only small letters (a-z), numbers (0-9), and underscores (_) allowed. Max 15 letters.
              </span>
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-secondary)] font-semibold mt-1 ml-1 opacity-70">
            Username must be unique and up to 15 characters.
          </p>

          <div className="pt-2">
            <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 ml-1 opacity-60">Security (Optional for Social Login)</p>
            <div className="space-y-4">
              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="New Password (Optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <div className="relative group">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                />
              </div>
            </div>
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-[10px] font-bold text-center bg-red-500/5 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <button 
            type="submit"
            disabled={loading || !username}
            className="w-full bg-[var(--primary)] text-white text-sm font-bold py-4 rounded-xl transition-all disabled:opacity-70 active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20 mt-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Saving...' : (
              <>
                <span>Complete Setup</span>
                <Check size={18} />
              </>
            )}
          </button>
        </form>

        <div className="mt-auto pt-10 pb-6 flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest opacity-50">© 2026 GrixChat</span>
        </div>
      </div>
    </div>
  );
}
