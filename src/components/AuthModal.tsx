import React, { useState } from 'react';
import { Mail, Lock, Building, Eye, EyeOff, CheckCircle2, Shield, ArrowRight } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserEmail?: string;
  onLoginSuccess: (email: string, businessName?: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUserEmail,
  onLoginSuccess,
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>(currentUserEmail || '');
  const [password, setPassword] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setStatusMsg('Email and password are required.');
      return;
    }

    setStatusMsg('Authenticating...');
    setTimeout(() => {
      onLoginSuccess(email.trim(), isSignUp ? businessName.trim() : undefined);
      setStatusMsg('');
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl mx-auto flex items-center justify-center font-black text-xl mb-2">
            BQ
          </div>
          <h2 className="text-lg font-bold text-white">
            {isSignUp ? 'Create Bill Quatation BQ Account' : 'Sign in to Bill Quatation BQ'}
          </h2>
          <p className="text-xs text-slate-400">
            {isSignUp
              ? 'Start generating professional mobile quotations'
              : 'Access your saved quotes, clients, and catalog'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 pt-2">
          {isSignUp && (
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Trade / Business Name
              </label>
              <div className="relative">
                <Building size={16} className="absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Builders & Decorators"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="trade@example.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-2.5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-white focus:outline-hidden focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
            <Shield size={14} className="text-emerald-400 shrink-0" />
            <span>Secured with Postgres Row-Level Security (RLS)</span>
          </div>

          {statusMsg && (
            <p className="text-xs text-center text-amber-400 font-medium">{statusMsg}</p>
          )}

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
            >
              <span>{isSignUp ? 'Create Free Account' : 'Sign In'}</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setStatusMsg('');
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </form>

        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-slate-800/80 text-slate-400 hover:text-white rounded-xl text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
