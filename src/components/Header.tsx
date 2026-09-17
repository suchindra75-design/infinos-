import React from 'react';
import logoImg from '../assets/logo.png';
import { LogOut, LogIn } from 'lucide-react';
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
    <nav className="sticky top-0 z-[200] flex items-center justify-between px-4 sm:px-8 h-[58px] bg-[#F8F3E8]/90 backdrop-blur-xl border-b border-[#171512]/10 transition-[background-color,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)] select-none">
      {/* Left: Brand Identity */}
      <div
        className="flex items-center gap-2.5 cursor-pointer transition-[transform,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98]"
        onClick={() => onSelectNavTab('dashboard')}
      >
        <div className="w-7 h-7 rounded-lg bg-[#FC4731] flex items-center justify-center shadow-sm shadow-[#FC4731]/20 overflow-hidden shrink-0">
          <img src={logoImg} alt="INFINOS logo" className="w-full h-full object-cover" />
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="font-editorial text-xl sm:text-2xl font-bold tracking-tight text-[#171512]">
            INFINOS
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#7B746A] hidden xs:inline">
            Telemetry
          </span>
        </div>
      </div>

      {/* Center: Absolutely Centered Nav Links (Desktop & Tablet) */}
      <div className="hidden md:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2 bg-[#FFF9EF] p-1 rounded-full border border-[#171512]/08 shadow-xs">
        <button
          onClick={() => onSelectNavTab('dashboard')}
          className={`px-3.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] ${
            activeNavTab === 'dashboard'
              ? 'text-[#FC4731] bg-[#FC4731]/10 font-bold'
              : 'text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => onSelectNavTab('devices')}
          className={`px-3.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] ${
            activeNavTab === 'devices'
              ? 'text-[#FC4731] bg-[#FC4731]/10 font-bold'
              : 'text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05'
          }`}
        >
          Devices
        </button>
        <button
          onClick={() => onSelectNavTab('analytics')}
          className={`px-3.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] ${
            activeNavTab === 'analytics'
              ? 'text-[#FC4731] bg-[#FC4731]/10 font-bold'
              : 'text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => onSelectNavTab('alerts')}
          className={`px-3.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] flex items-center gap-1.5 ${
            activeNavTab === 'alerts'
              ? 'text-[#FC4731] bg-[#FC4731]/10 font-bold'
              : 'text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05'
          }`}
        >
          <span>Alerts</span>
          {activeAlertsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-[#E11D48] text-white font-bold">
              {activeAlertsCount}
            </span>
          )}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* LIVE Indicator Pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-bold tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-live-blink" />
          <span>LIVE</span>
        </div>

        {/* Claim Bag Primary Button */}
        <button
          onClick={onOpenAddDevice}
          className="px-4 py-1.5 rounded-full bg-[#FC4731] text-white font-body text-xs font-bold shadow-sm shadow-[#FC4731]/25 hover:-translate-y-0.5 hover:bg-[#e03a25] active:translate-y-0 active:scale-[0.97] active:shadow-none cursor-pointer transition-[transform,box-shadow,background-color] duration-[var(--dur-base)] ease-[var(--ease-out)] whitespace-nowrap"
        >
          + Claim Bag
        </button>

        {/* Auth / Account Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-1.5 pl-2 border-l border-[#171512]/10">
            <span className="hidden xl:inline text-xs font-bold text-[#171512] line-clamp-1 max-w-[100px]">
              {user.name}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.95] rounded-lg transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="p-1.5 text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.95] rounded-lg transition-[transform,color,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer text-xs font-semibold flex items-center gap-1"
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
