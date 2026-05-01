import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../../services/firebase.ts';
import { sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let email = identifier;

      // If identifier is not an email, try to find it via username or phone
      if (!identifier.includes('@')) {
        const usersRef = collection(db, "users");
        let q;
        
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
        
        email = (querySnapshot.docs[0].data() as any).email;
      }

      await sendPasswordResetEmail(auth, email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center relative font-sans">
      <div className="w-full px-8 pt-16 pb-12 z-10 flex flex-col min-h-full relative">
        {/* Branding Overlay */}
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

        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-6 left-8 py-1.5 flex items-center text-xs font-bold text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Back
        </button>

        <div className="text-center mb-10 mt-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Forgot Password</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[240px] mx-auto">
            Enter your email, username or phone number to receive a password reset link.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center space-y-6 py-8"
          >
            <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 size={40} />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Email Sent!</h3>
              <p className="text-sm text-[var(--text-secondary)] px-4">
                We've sent a password reset link to your registered email address. Please check your inbox.
              </p>
            </div>
            <Link 
              to="/login"
              style={{ backgroundColor: '#375a7f' }}
              className="w-full text-white text-sm font-bold py-4 rounded-2xl transition-all active:scale-[0.98] shadow-sm"
            >
              Back to Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-primary)] ml-1">Email, Username or Phone</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Enter email, username or phone"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full px-5 py-4 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#375a7f]/20 transition-all placeholder:text-[var(--text-secondary)]/50 text-[var(--text-primary)]"
                  required
                />
                <Mail size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" />
              </div>
            </div>

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-3 rounded-xl flex items-center justify-center gap-2 px-4"
              >
                <AlertCircle size={14} />
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loading || !identifier}
              style={{ backgroundColor: '#375a7f' }}
              className="w-full text-white text-sm font-bold py-4 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
            >
              <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            </button>

            <div className="text-center pt-4">
              <Link to="/login" className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Remember your password? <span className="text-[var(--text-primary)] hover:underline">Sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
