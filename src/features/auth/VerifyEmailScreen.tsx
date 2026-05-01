import React, { useState, useEffect } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { auth } from '../../services/firebase.ts';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, RefreshCw, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

export default function VerifyEmailScreen() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkVerification = setInterval(async () => {
      await auth.currentUser?.reload();
      if (auth.currentUser?.emailVerified) {
        clearInterval(checkVerification);
        navigate('/');
      }
    }, 3000);

    return () => clearInterval(checkVerification);
  }, [navigate]);

  const handleResend = async () => {
    if (!auth.currentUser) return;
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent! Please check your inbox.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
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

        {/* Back Button (Sign out) */}
        <button 
          onClick={handleLogout}
          className="absolute top-6 left-8 py-1.5 flex items-center text-xs font-bold text-[var(--text-primary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          Back
        </button>

        <div className="text-center mb-10 mt-8">
          <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Verify your email</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[240px] mx-auto">
            We've sent a verification link to <span className="font-bold text-[#375a7f]">{auth.currentUser?.email}</span>. Please click the link to continue.
          </p>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <p className="text-[10px] text-amber-500 font-bold text-center leading-relaxed">
              Don't forget to check your <span className="uppercase underline">Spam folder</span> if you don't see it!
            </p>
          </div>

          {message && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-emerald-600 text-xs font-bold text-center bg-emerald-500/10 py-3 rounded-xl"
            >
              {message}
            </motion.p>
          )}
          
          {error && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-500 text-xs font-bold text-center bg-red-500/10 py-3 rounded-xl"
            >
              {error}
            </motion.p>
          )}

          <button 
            onClick={handleResend}
            disabled={loading}
            style={{ backgroundColor: '#375a7f' }}
            className="w-full text-white text-sm font-bold py-4 rounded-2xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm"
          >
            {loading ? <RefreshCw className="animate-spin" size={18} /> : (
              <>
                <span>Resend Email</span>
                <Mail size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
