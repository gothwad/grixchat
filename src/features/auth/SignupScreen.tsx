import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, AtSign, Lock, Eye, EyeOff, Mail, ArrowRight, Github, HelpCircle, ArrowLeft } from 'lucide-react';
import { authService } from './services/authService.ts';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin matches current origin, or ends with trusted origins
      const origin = event.origin;
      const isTrusted = 
        origin === window.location.origin ||
        origin.endsWith('.run.app') || 
        origin.includes('localhost') || 
        origin.endsWith('.vercel.app') || 
        origin.endsWith('.workers.dev');

      if (!isTrusted) {
        return;
      }

      if (event.data?.type === 'SUPABASE_AUTH_SUCCESS' && event.data.session) {
        setGoogleLoading(true);
        setGithubLoading(true);
        const { access_token, refresh_token } = event.data.session;
        try {
          const { data, error: setSessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token
          });
          if (setSessionError) throw setSessionError;
          if (data.user) {
            navigate('/');
          }
        } catch (err: any) {
          setError("Failed to set authentication session: " + err.message);
        } finally {
          setGoogleLoading(false);
          setGithubLoading(false);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    
    try {
      // 1. Validation
      if (password !== confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      const cleanUsername = username.toLowerCase().trim();
      
      // Username validation: small letters, numbers, underscores only, no spaces
      if (!/^[a-z0-9_]+$/.test(cleanUsername)) {
        throw new Error("Username can only contain small letters, numbers, and underscores (_). No spaces allowed.");
      }

      // 2. Check if username is unique in Supabase
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();
      
      if (checkError) throw checkError;
      if (existingUser) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      // 3. Create user via authService (Supabase Auth)
      const user = await authService.signup(email, password, fullName, cleanUsername);

      if (!user) throw new Error("Failed to create user.");

      // 4. Create/verify user profile in users table (via RPC or direct insert)
      // Note: Supabase auth has an automatic trigger 'on_auth_user_created' that creates
      // the profile record automatically on signup using metadata details we passed.
      // We try a client-side update as a fallback but do not block if RLS prevents it on unconfirmed emails.
      try {
        const { error: profileError } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: user.email,
            full_name: fullName,
            username: cleanUsername,
            photo_url: `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
            updated_at: new Date().toISOString()
          } as any);

        if (profileError) {
          console.warn('Fallback profile upsert failed, database trigger might have handled it:', profileError);
        }
      } catch (upsertErr) {
        console.warn('Fallback profile upsert threw, database trigger might have handled it:', upsertErr);
      }

      navigate('/verify-email');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      const data = await authService.loginWithGoogle();
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          data.url,
          'google_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
      } else {
        throw new Error("Could not construct Sign-Up URL from database client");
      }
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  const handleGithubSignUp = async () => {
    setGithubLoading(true);
    setError('');
    try {
      const data = await authService.loginWithGithub();
      if (data?.url) {
        const width = 600;
        const height = 700;
        const left = window.screenX + (window.outerWidth - width) / 2;
        const top = window.screenY + (window.outerHeight - height) / 2;
        window.open(
          data.url,
          'github_oauth',
          `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
        );
      } else {
        throw new Error("Could not construct Sign-Up URL from database client");
      }
    } catch (err: any) {
      setError(err.message);
      setGithubLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center relative font-sans">
      <div className="w-full px-8 pt-8 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-4">
          <button 
            onClick={() => navigate(-1)}
            className="absolute left-0 w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] text-[var(--text-primary)] active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>

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
          <h2 className="text-[26px] font-bold text-[var(--text-primary)] mb-2">Join GrixChat</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[280px] mx-auto opacity-80">
            Create your account to start chatting, sharing stories, and connecting with GrixChat.
          </p>
        </div>

        <form onSubmit={handleSignup} className="w-full space-y-3">
          <div className="relative group">
            <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="relative group">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="email" 
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-12 pr-5 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="relative group">
            <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Choose username"
              value={username}
              onChange={(e) => {
                const val = e.target.value.toLowerCase().replace(/\s/g, '_');
                // Only allow small letters, numbers, and underscores
                if (/^[a-z0-9_]*$/.test(val)) {
                  setUsername(val);
                }
              }}
              className="w-full pl-12 pr-12 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
            <div className="group absolute right-4 top-1/2 -translate-y-1/2">
              <HelpCircle size={14} className="text-[var(--text-secondary)] cursor-help" />
              <span className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-48 p-2 bg-zinc-800 text-white text-[10px] rounded-lg shadow-xl z-50">
                Only small letters (a-z), numbers (0-9), and underscores (_) allowed.
              </span>
            </div>
          </div>

          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-3.5 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
            <button 
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <button 
            type="submit"
            disabled={loading || googleLoading || githubLoading || !fullName || !email || !username || password.length < 6 || password !== confirmPassword}
            className="w-full bg-[var(--primary)] text-white text-sm font-bold py-3.5 rounded-xl transition-all disabled:opacity-70 active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20 mt-2 flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Creating account...' : 'Sign Up'}</span>
          </button>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-[10px] font-bold text-center bg-red-500/5 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <div className="flex items-center gap-4 py-1">
            <div className="h-[1px] bg-[var(--border-color)] flex-1"></div>
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">or</span>
            <div className="h-[1px] bg-[var(--border-color)] flex-1"></div>
          </div>

          <div className="grid grid-cols-1 gap-2.5">
            <button 
              type="button"
              onClick={handleGoogleSignUp}
              disabled={loading || googleLoading || githubLoading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-3 rounded-xl text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Log in with Google</span>
            </button>



            <button 
              type="button"
              onClick={handleGithubSignUp}
              disabled={loading || googleLoading || githubLoading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-3 rounded-xl text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all active:scale-[0.98]"
            >
              <Github size={20} className="text-[var(--text-primary)]" />
              <span>Log in with GitHub</span>
            </button>
          </div>

          <div className="text-center pt-4 pb-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Already have an account? </span>
            <Link to="/login" className="text-[12px] font-bold text-[var(--primary)] hover:underline">Login</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
