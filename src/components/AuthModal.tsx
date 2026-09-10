import React, { useState } from 'react';
import { X, LogIn, UserPlus, Shield, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'VIEWER' | 'ADMIN'>('OPERATOR');
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!email || !password) {
      setLocalError('Email and password are required.');
      return;
    }

    try {
      if (isRegister) {
        if (!name.trim()) {
          setLocalError('Name is required for registration.');
          return;
        }
        await register(name.trim(), email.trim(), password, role);
      } else {
        await login(email.trim(), password);
      }
      onClose();
    } catch (err: any) {
      // Error handled in context or locally
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-backdrop-fade overflow-y-auto">
      <div className="bg-[#0e1014] border border-white/[0.1] rounded-2xl w-full max-w-sm my-auto shadow-2xl shadow-black/80 animate-modal-pop overflow-hidden flex flex-col max-h-[90vh] text-zinc-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00] shrink-0">
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white font-display">
                {isRegister ? 'Create Account' : 'Sign In to INFINOS'}
              </h3>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-body">
                {isRegister ? 'Join cold-chain telemetry platform' : 'Enter credentials to access controls'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto font-body">
          {(error || localError) && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{localError || error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Alex Morgan"
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
                required
              />
            </div>
          )}

          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@infinos.com"
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
              required
            />
          </div>

          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1">
                Requested Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
              >
                <option value="OPERATOR">Operator (Manage & Sync Bags)</option>
                <option value="VIEWER">Viewer (Read-only Telemetry)</option>
                <option value="ADMIN">Admin (Fleetwide Administration)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 sm:py-2.5 text-xs sm:text-sm font-semibold rounded-lg bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] text-white transition shadow-lg shadow-orange-500/20 disabled:opacity-50 mt-2 cursor-pointer font-body min-h-[44px]"
          >
            {isLoading
              ? 'Authenticating...'
              : isRegister
              ? 'Register Account'
              : 'Sign In'}
          </button>

          <div className="pt-3 border-t border-white/[0.08] text-center text-xs text-zinc-400 font-body">
            {isRegister ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    clearError();
                    setLocalError(null);
                  }}
                  className="text-[#ff6b00] hover:underline font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </span>
            ) : (
              <span>
                Need access?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    clearError();
                    setLocalError(null);
                  }}
                  className="text-[#ff6b00] hover:underline font-semibold cursor-pointer"
                >
                  Create an account
                </button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};
