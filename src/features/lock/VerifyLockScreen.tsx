import React, { useState } from 'react';
import { ArrowLeft, ShieldCheck, Delete, ArrowRight, Lock, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LockService } from '../../services/LockService.ts';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../providers/AuthProvider';

export default function VerifyLockScreen() {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);
  
  const lockData = LockService.getLockDataFromProfile(userData);
  const isNumeric = lockData.type === 'pin4' || lockData.type === 'pin6';
  const maxLength = lockData.type === 'pin4' ? 4 : lockData.type === 'pin6' ? 6 : 20;

  const handleKeyPress = (key: string) => {
    setError('');
    if (key === 'delete') {
      setValue(value.slice(0, -1));
    } else if (value.length < maxLength) {
      setValue(value + key);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError('');
    setValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.length > 0) {
      handleVerify();
    }
  };

  const handleVerify = async () => {
    if (verifying) return;
    
    if (LockService.verifyLock(value, lockData.hash)) {
      setVerifying(true);
      try {
        await LockService.disableLock();
        navigate('/app-lock');
      } catch (err) {
        setError('Failed to disable lock');
        setVerifying(false);
        console.error(err);
      }
    } else {
      setError('Incorrect ' + (isNumeric ? 'PIN' : 'Password'));
      setValue('');
    }
  };

  const renderKeypad = () => {
    if (!isNumeric) return null;
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'check', '0', 'delete'];
    return (
      <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mt-8">
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() => {
              if (key === 'check') handleVerify();
              else if (key === 'delete') handleKeyPress('delete');
              else if (key) handleKeyPress(key);
            }}
            className={`h-16 rounded-2xl flex items-center justify-center text-xl font-black transition-all active:scale-90 ${
              key === 'check' 
              ? 'bg-primary text-white shadow-lg shadow-[var(--primary-shadow)]' 
              : 'bg-white text-zinc-900 shadow-sm border border-zinc-100'
            }`}
          >
            {key === 'delete' ? <Delete size={24} /> : key === 'check' ? <Check size={24} /> : key}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-[#F8F9FA] overflow-hidden font-sans">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 h-16 bg-gradient-to-r from-[#1e3a8a] via-[#1d4ed8] to-[#2563eb] z-50 shadow-lg border-b border-white/10">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-white" />
        </button>
        <h1 className="text-lg font-black text-white tracking-tight uppercase">
          Verify Lock
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="flex flex-col items-center w-full">
          <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center text-primary mb-6 border border-primary/10">
            <Lock size={32} />
          </div>
          
          <h2 className="text-xl font-black text-zinc-900 uppercase tracking-tight mb-2 text-center">
            Confirm to Disable
          </h2>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-8 text-center">
            Enter your current {isNumeric ? 'PIN' : 'Password'}
          </p>

          {isNumeric ? (
            <div className="flex gap-3 mb-4">
              {[...Array(maxLength)].map((_, i) => (
                <div 
                  key={i}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    value.length > i 
                    ? 'bg-primary border-primary scale-110' 
                    : 'border-zinc-200'
                  }`}
                />
              ))}
            </div>
          ) : (
            <div className="w-full max-w-[280px] mb-4">
              <input 
                type="password"
                value={value}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                className="w-full bg-white border border-zinc-100 rounded-2xl px-6 py-4 text-center text-lg font-black tracking-widest outline-none focus:border-primary shadow-sm"
                placeholder="••••••••"
                autoFocus
              />
            </div>
          )}

          {error && (
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-4 animate-bounce">
              {error}
            </p>
          )}

          {renderKeypad()}

          <button 
            onClick={handleVerify}
            disabled={value.length === 0}
            className="mt-12 w-full max-w-[280px] bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-lg shadow-zinc-200 flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            Verify & Disable
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      <div className="p-8 flex flex-col items-center gap-1 opacity-30">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-zinc-900" />
          <span className="text-zinc-900 text-[9px] font-black tracking-[0.2em] uppercase">Security Verification</span>
        </div>
      </div>
    </div>
  );
}
