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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-[var(--text)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 border border-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)] font-display">
                {isRegister ? 'Create INFINOS Account' : 'Sign In to INFINOS'}
              </h3>
              <p className="text-xs text-[var(--muted)] font-body">
                {isRegister ? 'Join the cold-chain telemetry platform' : 'Enter credentials to access controls'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-body">
          {(error || localError) && (
            <div className="p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--red)]" />
              <span>{localError || error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Alex Morgan"
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@infinos.com"
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1">
                Requested Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
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
            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white transition shadow-sm disabled:opacity-50 mt-2 cursor-pointer font-body"
          >
            {isLoading
              ? 'Authenticating...'
              : isRegister
              ? 'Register Account'
              : 'Sign In'}
          </button>

          <div className="pt-3 border-t border-[var(--border)] text-center text-xs text-[var(--muted)] font-body">
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
                  className="text-[var(--orange)] hover:underline font-medium cursor-pointer"
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
                  className="text-[var(--orange)] hover:underline font-medium cursor-pointer"
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
