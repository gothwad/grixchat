import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, githubProvider } from '../../services/firebase.ts';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, AtSign, Lock, Eye, EyeOff, Mail, ArrowRight, Github, HelpCircle, Phone } from 'lucide-react';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [showSocial, setShowSocial] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
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

      // 2. Check if username is unique
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", cleanUsername));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      // 3. Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 4. Send Verification Email
      await sendEmailVerification(user);

      await updateProfile(user, { displayName: fullName });

      // 5. Save user data to Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: fullName,
        username: cleanUsername,
        phoneNumber: phoneNumber.trim(),
        photoURL: user.photoURL || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
        followers: [],
        following: [],
        createdAt: new Date().toISOString()
      });

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
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
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

  const handleGithubSignUp = async () => {
    setGithubLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, githubProvider);
      const user = result.user;
      
      // Check if user exists in Firestore
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
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Sign up Account</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[240px] mx-auto">
            Create an account to start chatting, sharing stories, and connecting with GrixChat.
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Name</label>
            <input 
              type="text" 
              placeholder="Enter you name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Email</label>
            <input 
              type="email" 
              placeholder="Enter you email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Phone Number</label>
            <input 
              type="tel" 
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Username</label>
            <div className="relative">
              <input 
                type="text" 
                placeholder="Choose a username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
                className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                required
              />
              <div className="group absolute right-5 top-1/2 -translate-y-1/2">
                <HelpCircle size={18} className="text-[var(--text-secondary)] cursor-help" />
                <span className="hidden group-hover:block absolute right-0 bottom-full mb-2 w-48 p-2 bg-zinc-800 text-white text-[10px] rounded-lg shadow-xl z-50">
                  Only small letters (a-z), numbers (0-9), and underscores (_) allowed. No spaces.
                </span>
              </div>
            </div>
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

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Confirm Password</label>
            <div className="relative">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                required
              />
              <button 
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
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
          </div>
          
          <button 
            type="submit"
            disabled={loading || googleLoading || githubLoading || !email || !username || !phoneNumber || password.length < 6 || password !== confirmPassword}
            style={{ backgroundColor: '#375a7f' }}
            className="w-full text-white text-sm font-bold py-4 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            <span>{loading ? 'Creating account...' : 'Sign up'}</span>
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
                  onClick={handleGoogleSignUp}
                  disabled={loading || googleLoading || githubLoading}
                  className="w-full flex items-center justify-center gap-3 bg-[var(--bg-card)] border border-[var(--border-color)] py-4 rounded-2xl text-sm font-bold text-[var(--text-primary)] hover:bg-zinc-50/10 transition-all active:scale-[0.98]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
                  <span>{googleLoading ? 'Connecting...' : 'Continue with Google'}</span>
                </button>

                <button 
                  type="button"
                  onClick={handleGithubSignUp}
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
            <span className="text-xs font-bold text-[var(--text-secondary)]">Already have an account? </span>
            <Link to="/login" className="text-xs font-bold text-[var(--text-primary)] hover:underline">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
