import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, CheckCircle2, AlertCircle, KeySquare } from 'lucide-react';
import { APP_CONFIG } from '../../config/appConfig';
import { supabase } from '../../lib/supabase';
import { authService } from './services/authService.ts';

export default function ForgotPasswordScreen() {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) return;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      let email = identifier;

      // If identifier is not an email, try to find it via username
      if (!identifier.includes('@')) {
        const { data, error: fetchError } = await supabase
          .from('users')
          .select('email')
          .eq('username', identifier.toLowerCase().trim())
          .maybeSingle();
        
        if (fetchError) throw fetchError;
        if (!data) {
          throw new Error("Username not found");
        }
        
        email = data.email;
      }

      await authService.resetPassword(email);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-main)] flex flex-col items-center relative font-sans">
      <div className="w-full px-8 pt-8 pb-12 z-10 flex flex-col items-center min-h-full relative max-w-md mx-auto">
        {/* Header Section */}
        <div className="w-full relative flex items-center justify-center mb-4">
          <button 
            onClick={() => navigate('/login')}
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
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">Forgot Password</h2>
          <p className="text-[var(--text-secondary)] text-xs leading-relaxed max-w-[240px] mx-auto opacity-80">
            Enter your email or username to receive a password reset link.
          </p>
        </div>

        {success ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-[var(--bg-card)] p-8 rounded-3xl border border-[var(--border-color)] text-center shadow-xl flex flex-col items-center"
          >
            <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Email Sent!</h3>
            <p className="text-sm text-[var(--text-secondary)] mb-8 leading-relaxed">
              We've sent a password reset link to your registered email address. Please check your inbox.
            </p>
            <Link 
              to="/login"
              className="w-full bg-[var(--primary)] text-white text-sm font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20"
            >
              Back to Login
            </Link>
          </motion.div>
        ) : (
          <form onSubmit={handleResetPassword} className="w-full space-y-6">
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

            {error && (
              <motion.p 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-500 text-[10px] font-bold text-center bg-red-500/5 py-2 rounded-lg flex items-center justify-center gap-2 px-4"
              >
                <AlertCircle size={14} />
                {error}
              </motion.p>
            )}

            <button 
              type="submit"
              disabled={loading || !identifier}
              className="w-full bg-[var(--primary)] text-white text-sm font-bold py-4 rounded-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 active:scale-[0.98] shadow-sm shadow-[var(--primary)]/20 mt-2"
            >
              <span>{loading ? 'Sending link...' : 'Send Reset Link'}</span>
            </button>

            <div className="text-center pt-8">
              <Link to="/login" className="text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                Remember your password? <span className="text-[var(--primary)] hover:underline">Sign in</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
