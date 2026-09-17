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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-[150] bg-[#F8F3E8]/95 backdrop-blur-xl border-t border-[#171512]/10 bottom-nav-safe transition-[background-color,border-color] duration-[var(--dur-base)] ease-[var(--ease-out)]">
      <div className="flex items-center justify-around px-1 py-1.5 max-w-lg mx-auto">
        {/* Dashboard */}
        <button
          onClick={() => onSelectNavTab('dashboard')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'dashboard' ? 'text-[#FC4731] font-bold' : 'text-[#7B746A] hover:text-[#171512]'
          }`}
        >
          <span className="text-lg leading-none">📊</span>
          <span className="text-[10px] font-bold tracking-tight hidden xs:inline">Dashboard</span>
        </button>

        {/* Devices */}
        <button
          onClick={() => onSelectNavTab('devices')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'devices' ? 'text-[#FC4731] font-bold' : 'text-[#7B746A] hover:text-[#171512]'
          }`}
        >
          <span className="text-lg leading-none">📦</span>
          <span className="text-[10px] font-bold tracking-tight hidden xs:inline">Devices</span>
        </button>

        {/* Claim Bag (Center Emphasized Button) */}
        <button
          onClick={onOpenAddDevice}
          className="flex-1 flex flex-col items-center gap-0.5 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95]"
        >
          <span className="text-xl leading-none text-[#FC4731] font-extrabold">＋</span>
          <span className="text-[10px] font-extrabold text-[#FC4731] tracking-tight">Claim</span>
        </button>

        {/* Analytics */}
        <button
          onClick={() => onSelectNavTab('analytics')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'analytics' ? 'text-[#FC4731] font-bold' : 'text-[#7B746A] hover:text-[#171512]'
          }`}
        >
          <span className="text-lg leading-none">📈</span>
          <span className="text-[10px] font-bold tracking-tight hidden xs:inline">Analytics</span>
        </button>

        {/* Alerts */}
        <button
          onClick={() => onSelectNavTab('alerts')}
          className={`flex-1 flex flex-col items-center gap-1 py-1 px-1 bg-transparent border-0 cursor-pointer font-body transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.95] ${
            activeNavTab === 'alerts' ? 'text-[#FC4731] font-bold' : 'text-[#7B746A] hover:text-[#171512]'
          }`}
        >
          <span className="text-lg leading-none relative">
            🔔
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-3.5 h-3.5 rounded-full bg-[#E11D48] text-white text-[8px] font-bold flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold tracking-tight hidden xs:inline">Alerts</span>
        </button>
      </div>
    </nav>
  );
};
