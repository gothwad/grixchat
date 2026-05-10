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
      <div className="w-full px-8 pt-12 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-8">
          <div className="w-16 h-16 bg-[var(--bg-card)] rounded-[20px] shadow-sm flex items-center justify-center border border-[var(--border-color)] p-3">
            <img 
              src={APP_CONFIG.LOGO_URL} 
              alt="Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Header Area */}
        <div className="text-center mb-8">
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">Welcome Back</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[200px] mx-auto opacity-80">
            Connecting you to your world, one message at a time.
          </p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          <div className="relative group">
            <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="text" 
              placeholder="Enter your email or username"
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
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember" 
                className="w-4 h-4 rounded border-[var(--border-color)] text-[var(--primary)] focus:ring-[var(--primary)] accent-[var(--primary)] bg-[var(--bg-card)]" 
              />
              <label htmlFor="remember" className="text-[11px] font-medium text-[var(--text-secondary)] cursor-pointer">Remember me</label>
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
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
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
