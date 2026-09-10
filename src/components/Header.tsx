import React, { useState } from 'react';
import {
  RefreshCw,
  Plus,
  LogOut,
  LogIn,
  Clock,
  Menu,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SafeDevice } from '../types';

export type NavTab = 'dashboard' | 'devices' | 'analytics';

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
}) => {
  const { user, isAuthenticated, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-orange-500/20 text-orange-400 border border-orange-500/40';
      case 'OPERATOR':
        return 'bg-blue-500/20 text-blue-400 border border-blue-500/40';
      default:
        return 'bg-[var(--surface3)] text-[var(--muted)] border border-[var(--border)]';
    }
  };

  const formatLastRefreshed = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <header className="sticky top-0 z-40 w-full h-[52px] bg-[var(--nav-bg)] backdrop-blur-[20px] saturate-[1.4] border-b border-[var(--border)] transition-colors duration-250">
      <div className="max-w-[1180px] h-full mx-auto px-4 sm:px-5 flex items-center justify-between relative">
        {/* Brand with Original INFINOS Logo */}
        <div
          className="nav-brand cursor-pointer select-none"
          onClick={() => onSelectNavTab('dashboard')}
          id="navBrandLogo"
        >
          <div className="nav-logo">
            <img
              src="/logo.png"
              alt="INFINOS logo"
              width={26}
              height={26}
              className="w-full h-full object-cover rounded-[inherit] block"
              loading="eager"
            />
          </div>
          <span className="font-bold text-[0.95rem] tracking-tight text-[var(--text)]">INFINOS</span>
        </div>

        {/* Centered Nav Links (Desktop) */}
        <div className="hidden md:flex items-center gap-0.5 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => onSelectNavTab('dashboard')}
            className={`nav-link ${activeNavTab === 'dashboard' ? 'active' : ''}`}
          >
            Dashboard
          </button>
          <button
            onClick={() => onSelectNavTab('devices')}
            className={`nav-link ${activeNavTab === 'devices' ? 'active' : ''}`}
          >
            Devices
          </button>
          <button
            onClick={() => onSelectNavTab('analytics')}
            className={`nav-link ${activeNavTab === 'analytics' ? 'active' : ''}`}
          >
            Analytics
          </button>
        </div>

        {/* Right Nav Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Live Indicator Pill */}
          <div className="live-badge hidden sm:flex" id="liveIndicator">
            LIVE
          </div>

          {/* Theme Toggle Button */}
          <button
            className="btn-theme"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              /* Moon icon: shown in dark mode */
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              /* Sun icon: shown in light mode */
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>

          {/* Claim Bag Button */}
          <button
            className="btn-claim"
            onClick={onOpenAddDevice}
            title="Claim or connect a new Smart Bag"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Claim Bag</span>
          </button>

          {/* User Account Menu / Auth */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-xs text-[var(--text)] hover:border-[var(--border-strong)] transition cursor-pointer"
                title={`${user.name} (${user.role})`}
              >
                <div className="w-5 h-5 rounded-full bg-[var(--surface3)] flex items-center justify-center text-[10px] font-bold text-[var(--orange)]">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-medium max-w-[90px] truncate">
                  {user.name}
                </span>
                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full hidden sm:inline ${getRoleBadge(user.role)}`}>
                  {user.role}
                </span>
              </button>

              {userDropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-52 bg-[var(--surface)] border border-[var(--border-strong)] rounded-xl shadow-xl py-2 z-50 text-xs"
                  onClick={() => setUserDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 border-b border-[var(--border)]">
                    <p className="font-semibold text-[var(--text)] truncate">{user.name}</p>
                    <p className="text-[10px] text-[var(--muted)] truncate font-data">{user.email}</p>
                  </div>
                  {selectedDevice && (
                    <button
                      onClick={onManualSync}
                      disabled={isSyncing}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-[var(--text)] hover:bg-[var(--surface2)] transition"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[var(--orange)]' : 'text-[var(--muted)]'}`} />
                      <span>{isSyncing ? 'Syncing...' : 'Sync ThingSpeak'}</span>
                    </button>
                  )}
                  <div className="px-3 py-1.5 text-[10px] text-[var(--muted)] border-t border-[var(--border)] flex items-center justify-between">
                    <span>Auto-refresh</span>
                    <select
                      value={refreshInterval}
                      onChange={(e) => onChangeRefreshInterval(Number(e.target.value))}
                      className="bg-[var(--surface2)] text-[var(--text)] border border-[var(--border)] rounded px-1 py-0.5 text-[10px]"
                    >
                      <option value={15}>15s</option>
                      <option value={30}>30s</option>
                      <option value={60}>60s</option>
                      <option value={0}>Off</option>
                    </select>
                  </div>
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-rose-400 hover:bg-rose-500/10 transition border-t border-[var(--border)]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--surface2)] hover:bg-[var(--surface3)] text-[var(--text)] border border-[var(--border)] text-xs font-medium transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-[var(--muted)]" />
              <span>Sign In</span>
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-[var(--muted)] hover:text-[var(--text)] rounded-lg"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[var(--nav-bg)] border-b border-[var(--border)] px-4 py-3 space-y-2 backdrop-blur-xl">
          <div className="flex gap-2 pb-2 border-b border-[var(--border)]">
            <button
              onClick={() => {
                onSelectNavTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium text-center ${
                activeNavTab === 'dashboard'
                  ? 'bg-[var(--orange-dim)] text-[var(--orange)]'
                  : 'text-[var(--muted)] bg-[var(--surface2)]'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                onSelectNavTab('devices');
                setMobileMenuOpen(false);
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium text-center ${
                activeNavTab === 'devices'
                  ? 'bg-[var(--orange-dim)] text-[var(--orange)]'
                  : 'text-[var(--muted)] bg-[var(--surface2)]'
              }`}
            >
              Devices
            </button>
            <button
              onClick={() => {
                onSelectNavTab('analytics');
                setMobileMenuOpen(false);
              }}
              className={`flex-1 py-1.5 rounded-full text-xs font-medium text-center ${
                activeNavTab === 'analytics'
                  ? 'bg-[var(--orange-dim)] text-[var(--orange)]'
                  : 'text-[var(--muted)] bg-[var(--surface2)]'
              }`}
            >
              Analytics
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-xs text-[var(--muted)]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatLastRefreshed(lastRefreshed)}</span>
            </div>
            {!isAuthenticated && (
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="text-xs text-[var(--orange)] font-semibold"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
