import React from 'react';
import { NavTab } from './Header';

interface MobileBottomNavProps {
  activeNavTab: NavTab;
  onSelectNavTab: (tab: NavTab) => void;
  onOpenAddDevice: () => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
  activeAlertsCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeNavTab,
  onSelectNavTab,
  onOpenAddDevice,
  isLightMode,
  onToggleTheme,
  activeAlertsCount = 0,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-[var(--nav-bg)] backdrop-blur-md border-t border-[var(--border)] bottom-nav-safe transition-[background-color,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]">
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => onSelectNavTab('dashboard')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'dashboard' ? 'text-[var(--orange)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg leading-none">📊</span>
          <span className="text-[10px] font-semibold tracking-tight hidden xs:inline">Dashboard</span>
        </button>

        {/* Devices */}
        <button
          onClick={() => onSelectNavTab('devices')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'devices' ? 'text-[var(--orange)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg leading-none">📦</span>
          <span className="text-[10px] font-semibold tracking-tight hidden xs:inline">Devices</span>
        </button>

        {/* Claim Bag (Center Emphasized Button) */}
        <button
          onClick={onOpenAddDevice}
          className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95]"
        >
          <span className="text-xl leading-none text-[var(--orange)] font-bold">＋</span>
          <span className="text-[10px] font-bold text-[var(--orange)] tracking-tight">Claim</span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => onSelectNavTab('analytics')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'analytics' ? 'text-[var(--orange)] font-semibold' : 'text-[var(--muted)] hover:text-[var(--text)]'
          }`}
        >
          <span className="text-lg leading-none">📈</span>
          <span className="text-[10px] font-semibold tracking-tight hidden xs:inline">Analytics</span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body text-[var(--muted)] hover:text-[var(--text)] transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95]"
          aria-label="Toggle theme"
        >
          <span className="text-lg leading-none">{isLightMode ? '☀️' : '🌙'}</span>
          <span className="text-[10px] font-semibold tracking-tight hidden xs:inline">Theme</span>
        </button>
      </div>
    </nav>
  );
};
