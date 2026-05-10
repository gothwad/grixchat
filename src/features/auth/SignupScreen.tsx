import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db, googleProvider, githubProvider } from '../../services/firebase.ts';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { User as UserIcon, AtSign, Lock, Eye, EyeOff, Mail, ArrowRight, Github, HelpCircle, Phone, ArrowLeft } from 'lucide-react';

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
      <div className="w-full px-8 pt-12 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-8">
          <button 
            onClick={() => navigate(-1)}
            className="absolute left-0 w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] text-[var(--text-primary)] active:scale-95 transition-all"
          >
            <ArrowLeft size={20} />
          </button>

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
        <div className="text-center mb-6">
          <h2 className="text-[26px] font-bold text-[var(--text-primary)] mb-2">Join GrixChat families</h2>
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
            <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type="tel" 
              placeholder="Phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
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
            disabled={loading || googleLoading || githubLoading || !fullName || !email || !username || !phoneNumber || password.length < 6 || password !== confirmPassword}
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
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" />
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
