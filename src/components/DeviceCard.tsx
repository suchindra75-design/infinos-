import React from 'react';
import { SafeDevice, SensorReading } from '../types';

interface DeviceCardProps {
  device: SafeDevice;
  isActive: boolean;
  onSelect: (device: SafeDevice) => void;
  onDelete: (e: React.MouseEvent, device: SafeDevice) => void;
  latestReading?: SensorReading | null;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
  device,
  isActive,
  onSelect,
  onDelete,
  latestReading,
}) => {
  const hotTemp = latestReading?.hotTemperature != null ? `${latestReading.hotTemperature.toFixed(1)}°C` : '—';
  const coldTemp = latestReading?.coldTemperature != null ? `${latestReading.coldTemperature.toFixed(1)}°C` : '—';

  return (
    <div
      onClick={() => onSelect(device)}
      className={`relative overflow-hidden bg-[var(--surface)] border rounded-[var(--radius)] p-[16px_14px_14px] cursor-pointer transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] active:translate-y-0 active:scale-[0.98] active:shadow-none select-none ${
        isActive
          ? 'border-[var(--orange)] shadow-[0_0_0_1px_var(--orange)]'
          : 'border-[var(--border)] hover:border-[var(--border-strong)] hover:-translate-y-0.5 hover:shadow-xl'
      }`}
    >
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--orange)] to-transparent" />

      {/* Top Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-[var(--surface3)] flex items-center justify-center text-base">
          🌡️
        </div>
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[0.6rem] font-bold tracking-wide">
          <span className="w-1 h-1 rounded-full bg-emerald-400 animate-live-blink" />
          <span>LIVE</span>
        </div>
      </div>

      {/* Name & Code */}
      <div className="font-display font-bold text-[0.875rem] text-[var(--text)] mb-0.5 leading-snug truncate min-w-0" title={device.name}>
        {device.name}
      </div>
      <div className="text-[0.65rem] text-[var(--muted)] font-mono mb-2.5 truncate min-w-0">
        {device.deviceCode}
      </div>

      {/* 2-up Mini Readings Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        <div className="bg-[var(--surface2)] rounded-lg p-[9px_8px] text-center">
          <div className="text-[0.58rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
            🔥 Hot
          </div>
          <div className="font-display text-[1rem] font-bold text-[var(--hot)] mt-0.5 leading-tight">
            {hotTemp}
          </div>
        </div>
        <div className="bg-[var(--surface2)] rounded-lg p-[9px_8px] text-center">
          <div className="text-[0.58rem] font-semibold uppercase tracking-wider text-[var(--muted)]">
            ❄️ Cold
          </div>
          <div className="font-display text-[1rem] font-bold text-[var(--cold)] mt-0.5 leading-tight">
            {coldTemp}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end pt-2.5 border-t border-[var(--border)]">
        <button
          onClick={(e) => onDelete(e, device)}
          className="flex items-center gap-1 p-[5px_10px] rounded-[7px] bg-transparent border border-rose-500/20 text-[var(--red)] font-body text-[0.65rem] font-semibold opacity-70 hover:opacity-100 hover:bg-rose-500/10 hover:border-rose-500/40 active:scale-[0.95] cursor-pointer transition-[transform,background-color,border-color,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
          </svg>
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
