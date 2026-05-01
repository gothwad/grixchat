import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, githubProvider } from '../../services/firebase.ts';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Mail, Lock, User as UserIcon, ArrowRight, Github } from 'lucide-react';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    let loginEmail = identifier;

    try {
      // Check if identifier is email, phone, or username
      if (identifier.includes('@')) {
        loginEmail = identifier;
      } else {
        const usersRef = collection(db, "users");
        let q;
        
        // Check if it's a phone number (digits only or starts with +)
        const isPhone = /^\+?[0-9]+$/.test(identifier.trim());
        
        if (isPhone) {
          q = query(usersRef, where("phoneNumber", "==", identifier.trim()));
        } else {
          q = query(usersRef, where("username", "==", identifier.toLowerCase().trim()));
        }
        
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
          throw new Error(isPhone ? "Phone number not found" : "Username not found");
        }
        
        const userData = querySnapshot.docs[0].data();
        loginEmail = (userData as any).email;
      }

      await signInWithEmailAndPassword(auth, loginEmail, password);
      navigate('/');
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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    setGithubLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (!userDoc.exists()) {
        navigate('/complete-profile');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center relative font-sans">
      <div className="w-full px-8 pt-16 pb-12 z-10 flex flex-col min-h-full relative">
        {/* Branding Overlay - Absolute to not push content down */}
        <div className="absolute top-6 left-0 right-0 flex items-center justify-center gap-2">
          <div className="bg-[var(--bg-card)] px-3 py-1.5 rounded-full border border-[var(--border-color)] flex items-center gap-2 shadow-sm">
            <img 
              src={APP_CONFIG.LOGO_URL} 
              alt="Logo" 
              className="w-4 h-4 object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-primary)]">GrixChat</span>
          </div>
        </div>

        {/* Header Area */}
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Welcome back</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[240px] mx-auto">
            Connect with friends, share your world, and chat in real-time with GrixChat.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Email, Username or Phone</label>
            <input 
              type="text" 
              placeholder="Enter email, username or phone"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Enter you password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                required
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-[var(--border-color)] text-[#375a7f] focus:ring-[#375a7f] accent-[#375a7f] bg-[var(--bg-card)]" 
              />
              <label htmlFor="remember" className="text-xs font-bold text-[var(--text-primary)] cursor-pointer">Remember me</label>
            </div>
            <Link to="/forgot-password" title="Forgot password?" className="text-xs font-bold text-red-500 hover:text-red-600">Forgot password?</Link>
          </div>
          
          <button 
            type="submit"
            disabled={loading || googleLoading || !identifier || password.length < 6}
            style={{ backgroundColor: '#375a7f' }}
            className="w-full text-white text-sm font-bold py-4 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            <span>{loading ? 'Signing in...' : 'Sign in'}</span>
          </button>

          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-2 rounded-lg"
            >
              {error}
            </motion.p>
          )}

          <div className="text-center py-2">
            <button 
              type="button"
              onClick={() => setShowSocial(!showSocial)}
              className="text-[11px] font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors tracking-tight"
            >
              {showSocial ? (
                <>I'm not using grixchat on web browser <span className="text-blue-600">click here</span></>
              ) : (
                <>I'm using grixchat on web browser <span className="text-blue-600">click here</span></>
              )}
            </button>
          </div>

          <AnimatePresence>
            {showSocial && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <button 
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading || googleLoading || githubLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-4 rounded-2xl text-sm font-bold text-[var(--text-primary)] hover:bg-zinc-50/10 transition-all active:scale-[0.98]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
                  <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <button 
                  type="button"
                  onClick={handleGithubSignIn}
                  disabled={loading || googleLoading || githubLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-4 rounded-2xl text-sm font-bold text-[var(--text-primary)] hover:bg-zinc-50/10 transition-all active:scale-[0.98]"
                >
                  <Github size={20} />
                  <span>{githubLoading ? 'Connecting...' : 'Continue with GitHub'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center pt-8">
            <span className="text-xs font-bold text-[var(--text-secondary)]">Don't have an account? </span>
            <Link to="/signup" className="text-xs font-bold text-[var(--text-primary)] hover:underline">Sign up</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
