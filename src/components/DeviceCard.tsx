import React from 'react';
import { SafeDevice, SensorReading } from '../types';
import { resolveDeviceFields, getFieldValue } from '../utils/telemetry';

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
  const fields = resolveDeviceFields(device, null, latestReading ? [latestReading] : []);
  // Display up to 4 primary fields in card
  const displayFields = fields.slice(0, 4);

  const getMetricIcon = (field: ReturnType<typeof resolveDeviceFields>[0]) => {
    const lower = field.label.toLowerCase();
    if (field.zone === 'cold' || (field.metric === 'temperature' && lower.includes('cold'))) return '❄️';
    if (field.zone === 'hot' || (field.metric === 'temperature' && lower.includes('hot'))) return '🔥';
    if (field.metric === 'humidity' || lower.includes('humid')) return '💧';
    if (lower.includes('volt') || lower.includes('battery')) return '⚡';
    return '📊';
  };

  const getMetricColor = (field: ReturnType<typeof resolveDeviceFields>[0]) => {
    const lower = field.label.toLowerCase();
    if (field.zone === 'cold' || (field.metric === 'temperature' && lower.includes('cold'))) return 'text-[var(--cold)]';
    if (field.zone === 'hot' || (field.metric === 'temperature' && lower.includes('hot'))) return 'text-[var(--hot)]';
    if (field.metric === 'humidity' || lower.includes('humid')) return 'text-sky-400';
    if (lower.includes('volt') || lower.includes('battery')) return 'text-amber-400';
    return 'text-purple-400';
  };

  const gridClass = displayFields.length === 1 ? 'grid-cols-1' : displayFields.length === 3 ? 'grid-cols-3' : 'grid-cols-2';

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

      {/* Mini Dynamic Readings Grid */}
      <div className={`grid ${gridClass} gap-1.5 mb-3`}>
        {displayFields.map((field) => {
          const val = getFieldValue(field.fieldKey, field, latestReading, null);
          const formattedVal = val !== null ? `${val.toFixed(1)}${field.unit}` : '—';
          const icon = getMetricIcon(field);
          const colorClass = getMetricColor(field);

          return (
            <div key={field.fieldKey} className="bg-[var(--surface2)] rounded-lg p-[9px_8px] text-center min-w-0 overflow-hidden">
              <div className="text-[0.58rem] font-semibold uppercase tracking-wider text-[var(--muted)] truncate flex items-center justify-center gap-1" title={field.label}>
                <span>{icon}</span>
                <span className="truncate">{field.label}</span>
              </div>
              <div className={`font-display text-[0.95rem] font-bold ${colorClass} mt-0.5 leading-tight truncate`}>
                {formattedVal}
              </div>
            </div>
          );
        })}
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
