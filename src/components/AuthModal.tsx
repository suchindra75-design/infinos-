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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              {isRegister ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">
                {isRegister ? 'Create INFINOS Account' : 'Sign In to INFINOS'}
              </h3>
              <p className="text-xs text-slate-400">
                {isRegister ? 'Join the cold-chain telemetry platform' : 'Enter credentials to access controls'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {(error || localError) && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{localError || error}</span>
            </div>
          )}

          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Alex Morgan"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@infinos.com"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">
                Requested Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500"
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
            className="w-full py-2.5 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition shadow-sm disabled:opacity-50 mt-2"
          >
            {isLoading
              ? 'Authenticating...'
              : isRegister
              ? 'Register Account'
              : 'Sign In'}
          </button>

          <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
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
                  className="text-cyan-400 hover:underline font-medium"
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
                  className="text-cyan-400 hover:underline font-medium"
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
