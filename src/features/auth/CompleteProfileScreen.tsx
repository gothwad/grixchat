import React, { useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { updateProfile, updatePassword } from 'firebase/auth';
import { User, AtSign, Lock, Check, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function CompleteProfileScreen() {
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState(auth.currentUser?.displayName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    if (password && password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 1. Check if username is unique
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("username", "==", username.toLowerCase().trim()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error("Username is already taken. Please choose another one.");
      }

      // 2. Update Profile & Password
      await updateProfile(auth.currentUser, { displayName: fullName });
      if (password) {
        await updatePassword(auth.currentUser, password);
      }

      // 3. Save to Firestore
      await setDoc(doc(db, "users", auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        email: auth.currentUser.email,
        fullName: fullName,
        username: username.toLowerCase().trim(),
        photoURL: auth.currentUser.photoURL || `https://cdn-icons-png.flaticon.com/512/149/149071.png`,
        followers: [],
        following: [],
        createdAt: new Date().toISOString(),
        isGoogleUser: true
      });

      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
              className="w-full pl-12 pr-12 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
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
              placeholder="New Password"
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

          <div className="relative group">
            <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] group-focus-within:text-[var(--primary)] transition-colors" />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/10 focus:border-[var(--primary)]/40 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
              required
            />
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
            disabled={loading || !username || !password}
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
