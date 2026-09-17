import React from 'react';
import logoImg from '../assets/logo.png';
import { LogOut, LogIn, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SafeDevice } from '../types';

export type NavTab = 'dashboard' | 'devices' | 'analytics' | 'alerts';

interface HeaderProps {
  selectedDevice: SafeDevice | null;
  activeNavTab: NavTab;
  onSelectNavTab: (tab: NavTab) => void;
  onOpenAddDevice: () => void;
  onOpenAuth: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
  activeAlertsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  selectedDevice,
  activeNavTab,
  onSelectNavTab,
  onOpenAddDevice,
  onOpenAuth,
  isLightMode,
  onToggleTheme,
  activeAlertsCount = 0,
}) => {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="sticky top-0 z-[200] flex items-center justify-between px-4 sm:px-6 h-[52px] bg-[var(--nav-bg)] backdrop-blur-xl border-b border-[var(--border)] transition-[background-color,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] select-none">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-2 cursor-pointer transition-[transform,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98]" onClick={() => onSelectNavTab('dashboard')}>
        <div className="w-[26px] h-[26px] rounded-[7px] bg-gradient-to-br from-[#ff7c50] to-[#ff3d00] flex items-center justify-center shadow-md shadow-orange-500/30 overflow-hidden shrink-0">
          <img src={logoImg} alt="INFINOS logo" className="w-full h-full object-cover" />
        </div>
        <span className="font-display font-bold text-[0.95rem] tracking-tight text-[var(--text)]">
          INFINOS
        </span>
      </div>

      {/* Center: Absolutely Centered Nav Links (Desktop & Tablet) */}
      <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
        <button
          onClick={() => onSelectNavTab('dashboard')}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] ${
            activeNavTab === 'dashboard'
              ? 'text-[var(--orange)] bg-[var(--orange-dim)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectNavTab('devices')}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] ${
            activeNavTab === 'devices'
              ? 'text-[var(--orange)] bg-[var(--orange-dim)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          Devices
        </button>
        <button
          onClick={() => onSelectNavTab('analytics')}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] ${
            activeNavTab === 'analytics'
              ? 'text-[var(--orange)] bg-[var(--orange-dim)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => onSelectNavTab('alerts')}
          className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] flex items-center gap-1.5 ${
            activeNavTab === 'alerts'
              ? 'text-[var(--orange)] bg-[var(--orange-dim)] font-semibold'
              : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-white/5'
          }`}
        >
          <span>Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-rose-500 text-white font-bold">
              {activeAlertsCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* LIVE Indicator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-blink" />
          <span>LIVE</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle theme"
          title="Toggle light/dark mode"
          className="w-8 h-8 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] hover:rotate-12 active:rotate-0 active:scale-[0.95] flex items-center justify-center cursor-pointer transition-[transform,color,background-color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          {isLightMode ? (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Claim Bag Primary Button */}
        <button
          onClick={onOpenAddDevice}
          className="px-3.5 py-1.5 rounded-full bg-gradient-to-r from-[var(--orange)] to-[#e83800] text-white font-body text-xs font-semibold shadow-md shadow-orange-500/25 hover:-translate-y-0.5 hover:shadow-orange-500/40 active:translate-y-0 active:scale-[0.97] active:shadow-none cursor-pointer transition-[transform,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] whitespace-nowrap"
        >
          + Claim Bag
        </button>

        {/* Auth / Account Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[var(--border)]">
            <span className="hidden xl:inline text-xs font-medium text-[var(--text)] line-clamp-1 max-w-[100px]">
              {user.name}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] active:scale-[0.95] rounded-lg transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] active:scale-[0.95] rounded-lg transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer text-xs font-medium flex items-center gap-1"
            title="Sign In"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Sign In</span>
          </button>
        )}
      </div>
    </nav>
  );
};
