import React, { useState } from 'react';
import logoImg from '../assets/logo.png';
import {
  RefreshCw,
  Plus,
  LogOut,
  LogIn,
  Radio,
  Clock,
  Menu,
  X,
  LayoutDashboard,
  Cpu,
  BarChart2,
  AlertTriangle,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SafeDevice } from '../types';

export type NavTab = 'dashboard' | 'devices' | 'analytics' | 'alerts';

interface HeaderProps {
  selectedDevice: SafeDevice | null;
  activeNavTab?: NavTab;
  onSelectNavTab?: (tab: NavTab) => void;
  onOpenAddDevice: () => void;
  onOpenAuth: () => void;
  onManualSync: () => void;
  isSyncing: boolean;
  refreshInterval: number;
  onChangeRefreshInterval: (interval: number) => void;
  lastRefreshed: Date | null;
  activeAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDevice,
  activeNavTab = 'dashboard',
  onSelectNavTab = (_tab: NavTab) => {},
  onOpenAddDevice,
  onOpenAuth,
  onManualSync,
  isSyncing,
  refreshInterval,
  onChangeRefreshInterval,
  lastRefreshed,
  activeAlertsCount = 0,
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'OPERATOR':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const formatLastRefreshed = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="bg-[#08090b]/95 border-b border-white/[0.08] backdrop-blur-md sticky top-0 z-40 text-white w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand Identity & Desktop Navigation */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {/* Logo */}
          <div
            className="flex items-center gap-2.5 sm:gap-3.5 shrink-0 cursor-pointer select-none"
            onClick={() => onSelectNavTab('dashboard')}
          >
            <img
              src={logoImg}
              alt="INFINOS Official Logo"
              className="h-8 sm:h-10 w-auto object-contain rounded-md shadow-md border border-white/10 shrink-0"
            />
            <div className="flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <span className="font-display font-black tracking-tight text-base sm:text-xl leading-none text-white">
                  INFI<span className="text-[#ff6b00]">NOS</span>
                </span>
                {/* LIVE Status Pill */}
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                  </span>
                  LIVE
                </div>
              </div>
              <span className="text-[10px] text-zinc-400 font-body leading-none mt-1 hidden sm:block">
                Smart Delivery Bag Telemetry Platform
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-white/[0.08]">
            <button
              onClick={() => onSelectNavTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition flex items-center gap-1.5 cursor-pointer ${
                activeNavTab === 'dashboard'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onSelectNavTab('devices')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition flex items-center gap-1.5 cursor-pointer ${
                activeNavTab === 'devices'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Fleet Bags</span>
            </button>
            <button
              onClick={() => onSelectNavTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition flex items-center gap-1.5 cursor-pointer ${
                activeNavTab === 'analytics'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => onSelectNavTab('alerts')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-body transition flex items-center gap-1.5 cursor-pointer ${
                activeNavTab === 'alerts'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {activeAlertsCount > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
                  {activeAlertsCount}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Right: Operational Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Last Refreshed & Auto-Refresh Controls (Desktop) */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-400 bg-[#0e1014] px-2.5 py-1 rounded-lg border border-white/[0.08]">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span className="text-zinc-300 font-data text-[11px]">{formatLastRefreshed(lastRefreshed)}</span>
            <span className="text-zinc-700">|</span>
            <label className="text-zinc-400 flex items-center gap-1.5 text-[11px]">
              <span>Auto:</span>
              <select
                value={refreshInterval}
                onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                className="bg-[#14171d] text-zinc-200 border border-white/[0.1] rounded px-1.5 py-0.5 text-[11px] focus:outline-none focus:border-orange-500"
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
              className="inline-flex items-center justify-center p-2 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-lg bg-[#0e1014] hover:bg-[#15181f] text-zinc-300 border border-white/[0.08] hover:border-orange-500/30 transition disabled:opacity-50 min-h-[36px] min-w-[36px] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#ff6b00]' : 'text-zinc-400'}`} />
              <span className="hidden md:inline ml-1.5">{isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          {/* Claim Bag Button */}
          {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OPERATOR') ? (
            <button
              onClick={onOpenAddDevice}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#ff6b00] to-[#e05e00] hover:from-[#ff7d1a] hover:to-[#eb6405] text-white shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Claim Bag</span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-[#ff6b00] to-[#e05e00] hover:from-[#ff7d1a] hover:to-[#eb6405] text-white shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden xs:inline sm:inline">Claim Bag</span>
            </button>
          )}

          {/* User Account / Sign In */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1 sm:pl-2 border-l border-white/[0.08]">
              <div className="hidden xl:block text-right">
                <div className="text-xs font-medium text-zinc-200">{user.name}</div>
                <div className="text-[10px] text-zinc-500 font-data">{user.email}</div>
              </div>
              <span
                className={`text-[9px] uppercase font-bold px-1.5 sm:px-2 py-0.5 rounded-full border ${getRoleBadge(
                  user.role
                )}`}
              >
                {user.role}
              </span>
              <button
                onClick={logout}
                title="Sign out of INFINOS"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="inline-flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-white/[0.08] transition cursor-pointer min-h-[36px]"
            >
              <LogIn className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden xs:inline">Sign In</span>
            </button>
          )}

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
            aria-label="Toggle mobile menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0a0b0e] border-b border-white/[0.08] px-3 py-3 space-y-2.5 animate-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-4 gap-1.5 pb-2 border-b border-white/[0.06]">
            <button
              onClick={() => {
                onSelectNavTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center flex flex-col items-center gap-1 transition ${
                activeNavTab === 'dashboard'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 bg-[#0e1014] hover:text-zinc-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => {
                onSelectNavTab('devices');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center flex flex-col items-center gap-1 transition ${
                activeNavTab === 'devices'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 bg-[#0e1014] hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Bags</span>
            </button>
            <button
              onClick={() => {
                onSelectNavTab('analytics');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center flex flex-col items-center gap-1 transition ${
                activeNavTab === 'analytics'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 bg-[#0e1014] hover:text-zinc-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => {
                onSelectNavTab('alerts');
                setMobileMenuOpen(false);
              }}
              className={`py-2 px-1 rounded-lg text-[11px] font-medium text-center flex flex-col items-center gap-1 relative transition ${
                activeNavTab === 'alerts'
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                  : 'text-zinc-400 bg-[#0e1014] hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Alerts</span>
              {activeAlertsCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 px-1 pt-0.5">
            <span className="text-[11px]">Sync: {formatLastRefreshed(lastRefreshed)}</span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>Auto-refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                className="bg-[#14171d] text-zinc-200 border border-white/[0.1] rounded px-1.5 py-0.5 text-[11px]"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={60}>60s</option>
                <option value={0}>Off</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
