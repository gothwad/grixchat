import React, { useState, useEffect } from 'react';
import { APP_CONFIG } from '../../config/appConfig';
import { auth } from '../../services/firebase.ts';
import { sendEmailVerification, signOut } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, RefreshCw, LogOut, ArrowLeft, CheckCircle2 } from 'lucide-react';
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
      <div className="w-full px-8 pt-12 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-8">
          <button 
            onClick={handleLogout}
            className="absolute left-0 w-10 h-10 flex items-center justify-center bg-[var(--bg-card)] rounded-full border border-[var(--border-color)] text-[var(--text-primary)] active:scale-95 transition-all"
            title="Logout"
          >
            <LogOut size={20} />
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
        <div className="text-center mb-8">
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">Verify your email</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[280px] mx-auto opacity-80">
            We've sent a verification link to <span className="font-bold text-[var(--primary)]">{auth.currentUser?.email}</span>. Click the link to secure your account.
          </p>
        </div>

        <div className="w-full space-y-6">
          <div className="bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border-color)] text-center shadow-xl">
            <div className="w-16 h-16 bg-[var(--primary)]/10 text-[var(--primary)] rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail size={32} />
            </div>

            <div className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-xl mb-6">
              <p className="text-[10px] text-amber-500 font-bold text-center leading-relaxed">
                Check your <span className="uppercase underline">Spam folder</span> if you don't see the email!
              </p>
            </div>

            {message && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-center gap-2 text-green-500 font-bold mb-6 text-[11px]"
              >
                <CheckCircle2 size={16} />
                {message}
              </motion.div>
            )}
            
            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[10px] font-bold text-center bg-red-500/5 py-3 rounded-xl mb-6"
              >
                {error}
              </motion.p>
            )}

            <button 
              onClick={handleResend}
              disabled={loading}
              className="w-full bg-[var(--primary)] text-white text-sm font-bold py-4 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20"
            >
              {loading ? <RefreshCw className="animate-spin" size={18} /> : (
                <>
                  <span>Resend Email</span>
                  <Mail size={18} />
                </>
              )}
            </button>
          </div>

          <div className="text-center pt-4">
            <button 
              onClick={() => window.location.reload()}
              className="text-[12px] font-bold text-[var(--primary)] hover:underline"
            >
              I've verified my email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
