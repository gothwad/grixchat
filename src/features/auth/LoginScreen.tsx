import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, Github } from 'lucide-react';
import { authService } from './services/authService.ts';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    
    let loginEmail = identifier;

    try {
      // Check if identifier is email or username
      if (identifier.includes('@')) {
        loginEmail = identifier;
      } else {
        const cleanId = identifier.trim();
        let matchedUser = null;
        
        // Try matching by username first (always exists and safe)
        try {
          const { data, error: uError } = await supabase
            .from('users')
            .select('email')
            .eq('username', cleanId.toLowerCase())
            .maybeSingle();
            
          if (!uError && data) {
            matchedUser = data;
          }
        } catch (uErr) {
          console.error("Username query fallback error", uErr);
        }
        
        if (!matchedUser) {
          throw new Error("Username not found");
        }
        
        loginEmail = matchedUser.email;
      }

      await authService.login(loginEmail, password);
      navigate('/chats');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError('');
    try {
      await authService.loginWithGoogle();
      // Supabase OAuth will redirect the page automatically
    } catch (err: any) {
      setError(err.message);
      setGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setGithubLoading(true);
    setError('');
    try {
      await authService.loginWithGithub();
      // Redirect behavior for OAuth is handled automatically by Supabase 
      // but let's keep consistent formatting
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGithubLoading(false);
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
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">GrixChat</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[200px] mx-auto opacity-80">
            Connecting you to your world, one message at a time.
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative group">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Enter email or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full pl-12 pr-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-12 pr-12 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          <div className="flex justify-between items-center px-1">
            <div 
              onClick={() => setRememberMe(!rememberMe)}
              className="flex items-center gap-2 cursor-pointer group select-none"
            >
              <div 
                className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                  rememberMe 
                    ? 'bg-[var(--primary)] border-[var(--primary)]' 
                    : 'bg-[var(--bg-card)] border-[var(--border-color)] group-hover:border-[var(--text-secondary)]/50'
                }`}
              >
                {rememberMe && (
                  <svg className="w-2.5 h-2.5 text-white stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <span className="text-[11px] font-medium text-[var(--text-secondary)] cursor-pointer group-hover:text-[var(--text-primary)] transition-colors">
                Remember me
              </span>
            </div>
            <Link to="/forgot-password" title="Forgot password?" className="text-[11px] font-bold text-[var(--primary)] hover:underline">Forgot Password</Link>
          </div>
          
          <button 
            type="submit"
            disabled={loading || googleLoading || githubLoading || !identifier || password.length < 6}
            className="w-full bg-[var(--primary)] text-white text-sm font-bold py-4 rounded-xl transition-all disabled:opacity-70 active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20 mt-2"
          >
            <span>{loading ? 'Logging in...' : 'Login'}</span>
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

          <div className="flex items-center gap-4 py-2">
            <div className="h-[1px] bg-[var(--border-color)] flex-1"></div>
            <span className="text-[10px] text-[var(--text-secondary)] font-medium">or</span>
            <div className="h-[1px] bg-[var(--border-color)] flex-1"></div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading || githubLoading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-3.5 rounded-xl text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all active:scale-[0.98]"
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
              onClick={handleGithubSignIn}
              disabled={loading || googleLoading || githubLoading}
              className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-3.5 rounded-xl text-[13px] font-bold text-[var(--text-primary)] hover:bg-[var(--bg-main)] transition-all active:scale-[0.98]"
            >
              <Github size={20} className="text-[var(--text-primary)]" />
              <span>Log in with GitHub</span>
            </button>
          </div>

          <div className="text-center pt-6 pb-2">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">Don't have an account? </span>
            <Link to="/signup" className="text-[12px] font-bold text-[var(--primary)] hover:underline">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
