import React from 'react';
import {
  RefreshCw,
  Plus,
  LogOut,
  LogIn,
  ShieldCheck,
  Radio,
  Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SafeDevice } from '../types';

interface HeaderProps {
  selectedDevice: SafeDevice | null;
  onOpenAddDevice: () => void;
  onOpenAuth: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  refreshInterval: number; // in seconds, 0 = paused
  onChangeRefreshInterval: (interval: number) => void;
  lastRefreshed: Date | null;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDevice,
  onOpenAddDevice,
  onOpenAuth,
  onManualSync,
  isSyncing,
  refreshInterval,
  onChangeRefreshInterval,
  lastRefreshed,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-900/60 text-purple-200 border-purple-700/60';
      case 'OPERATOR':
        return 'bg-blue-900/60 text-blue-200 border-blue-700/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const formatLastRefreshed = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="bg-slate-900/95 border-b border-slate-800 backdrop-blur-md sticky top-0 z-30 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Identity */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div className="truncate">
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-lg text-slate-100">INFINOS</span>
              <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-medium">
                Telemetry Core
              </span>
            </div>
            <p className="text-xs text-slate-400 truncate hidden sm:block">
              Smart Delivery Bag Cold/Hot Chain Monitoring
            </p>
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Last Refreshed & Auto-Refresh Controls */}
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300">Updated: {formatLastRefreshed(lastRefreshed)}</span>
            <span className="text-slate-600">|</span>
            <label className="text-slate-400 flex items-center gap-1.5">
              <span>Auto:</span>
              <select
                value={refreshInterval}
                onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={0}>Off</option>
              </select>
            </label>
          </div>

          {/* Manual Sync Button */}
          {selectedDevice && (
            <button
              onClick={onManualSync}
              disabled={isSyncing}
              title="Trigger immediate ThingSpeak to PostgreSQL synchronization"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-cyan-400' : ''}`} />
              <span className="hidden sm:inline">{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          )}

          {/* Add / Claim Bag Button */}
          {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OPERATOR') && (
            <button
              onClick={onOpenAddDevice}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm shadow-cyan-900/30 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Add Bag</span>
            </button>
          )}

          {/* User Account / Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-medium text-slate-200">{user.name}</div>
                <div className="text-[10px] text-slate-400">{user.email}</div>
              </div>
              <span
                className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
              <button
                onClick={logout}
                title="Sign out of INFINOS"
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
