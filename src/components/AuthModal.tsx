import React, { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { useAuth } from '../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isStandalone?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, isStandalone = false }) => {
  const { login, register, error, clearError, isLoading } = useAuth();
  const [isRegister, setIsRegister] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'OPERATOR' | 'VIEWER' | 'ADMIN'>('OPERATOR');
  const [localError, setLocalError] = useState<string | null>(null);

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
      // Error handled in context
    }
  };

  const cardContent = (
    <div className="w-full bg-[#FFF9EF] border border-[#171512]/15 rounded-2xl overflow-hidden shadow-xl shadow-[#171512]/10 text-[#171512] flex flex-col font-body">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#171512]/08 flex items-center justify-between shrink-0 bg-[#F2ECE0]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FC4731]/10 border border-[#FC4731]/20 flex items-center justify-center text-[#FC4731] shrink-0">
            {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="font-bold text-base text-[#171512] font-display">
              {isRegister ? 'Create Account' : 'Sign In to INFINOS'}
            </h3>
            <p className="text-xs text-[#7B746A] font-body">
              {isRegister ? 'Join cold-chain telemetry platform' : 'Enter credentials to access controls'}
            </p>
          </div>
        </div>
        {!isStandalone && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.92] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto font-body flex-1 min-h-0 bg-[#FFF9EF]">
        {(error || localError) && (
          <div className="p-3 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/25 text-[#E11D48] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{localError || error}</span>
          </div>
        )}

        {isRegister && (
          <div>
            <label className="text-xs font-bold text-[#171512] uppercase tracking-wider block mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Alex Morgan"
              className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
              required
            />
          </div>
        )}

        <div>
          <label className="text-xs font-bold text-[#171512] uppercase tracking-wider block mb-1">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@infinos.com"
            className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
            required
          />
        </div>

        <div>
          <label className="text-xs font-bold text-[#171512] uppercase tracking-wider block mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
            required
          />
        </div>

        {isRegister && (
          <div>
            <label className="text-xs font-bold text-[#171512] uppercase tracking-wider block mb-1">
              Requested Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
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
          className="w-full py-2.5 text-sm font-bold rounded-xl bg-[#FC4731] hover:bg-[#e03a25] text-white transition-[background-color,transform,box-shadow,opacity] active:scale-[0.97] active:shadow-none duration-[var(--dur-fast)] ease-[var(--ease-out)] shadow-sm shadow-[#FC4731]/25 disabled:opacity-50 mt-2 cursor-pointer font-body min-h-[44px] flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin-fast shrink-0" />
              <span>Authenticating...</span>
            </>
          ) : isRegister ? (
            'Register Account'
          ) : (
            'Sign In'
          )}
        </button>

        <div className="pt-3 border-t border-[#171512]/08 text-center text-xs text-[#7B746A] font-body">
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
                className="text-[#FC4731] hover:underline font-bold cursor-pointer"
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
                className="text-[#FC4731] hover:underline font-bold cursor-pointer"
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </form>
    </div>
  );

  if (isStandalone) {
    return cardContent;
  }

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-sm" ariaLabel={isRegister ? 'Create Account' : 'Sign In'}>
      {cardContent}
    </ModalShell>
  );
};
