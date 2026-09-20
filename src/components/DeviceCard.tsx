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
    if (field.zone === 'cold' || (field.metric === 'temperature' && lower.includes('cold'))) return 'text-[#0284C7]';
    if (field.zone === 'hot' || (field.metric === 'temperature' && lower.includes('hot'))) return 'text-[#FC4731]';
    if (field.metric === 'humidity' || lower.includes('humid')) return 'text-[#0EA5E9]';
    if (lower.includes('volt') || lower.includes('battery')) return 'text-amber-600';
    return 'text-purple-600';
  };

  const isOnline = device.status === 'ONLINE';

  return (
    <div
      onClick={() => onSelect(device)}
      className={`relative overflow-hidden bg-[#FFF9EF] border rounded-2xl p-4 cursor-pointer transition-[transform,border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)] active:translate-y-0 active:scale-[0.98] active:shadow-none select-none ${
        isActive
          ? 'border-[#FC4731] shadow-[0_0_0_1px_#FC4731] shadow-[#FC4731]/10 bg-[#FFFDF7]'
          : 'border-[#171512]/10 hover:border-[#171512]/20 hover:-translate-y-0.5 hover:shadow-md hover:shadow-[#171512]/05'
      }`}
    >
      {/* Top Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#FC4731] to-transparent" />

      {/* Top Row: Icon + Status */}
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-xl bg-[#F2ECE0] flex items-center justify-center text-base shadow-xs">
          📦
        </div>
        {(() => {
          const status = device.status;
          if (status === 'ONLINE') {
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide bg-[#10B981]/10 border-[#10B981]/25 text-[#10B981]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-live-blink" />
                <span>ONLINE</span>
              </div>
            );
          }
          if (status === 'STALE') {
            return (
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide bg-amber-500/10 border-amber-500/25 text-amber-600">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>STALE</span>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide bg-[#7B746A]/10 border-[#7B746A]/20 text-[#7B746A]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7B746A]" />
              <span>OFFLINE</span>
            </div>
          );
        })()}
      </div>

      {/* Name & Code */}
      <div className="font-display font-extrabold text-sm sm:text-base text-[#171512] mb-0.5 leading-snug truncate min-w-0" title={device.name}>
        {device.name}
      </div>
      <div className="text-xs text-[#7B746A] font-mono mb-3 truncate min-w-0">
        {device.deviceCode}
      </div>

      {/* Dynamic Telemetry Preview Grid */}
      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {displayFields.map((field) => {
          const val = getFieldValue(field.fieldKey, field, latestReading, null);
          const formattedVal = val !== null ? `${val.toFixed(1)}` : '—';
          const icon = getMetricIcon(field);
          const colorClass = getMetricColor(field);

          return (
            <div key={field.fieldKey} className="bg-[#F2ECE0]/70 rounded-xl p-2 text-center min-w-0 overflow-hidden border border-[#171512]/05">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#7B746A] truncate flex items-center justify-center gap-1" title={field.label}>
                <span>{icon}</span>
                <span className="truncate">{field.label}</span>
              </div>
              <div className={`font-data text-sm font-bold ${colorClass} mt-0.5 leading-tight truncate`}>
                {formattedVal}<span className="text-[10px] font-medium text-[#7B746A] ml-0.5">{field.unit}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2.5 border-t border-[#171512]/08">
        <span className="text-[10px] font-medium text-[#7B746A]">
          {device.lastSeenAt ? new Date(device.lastSeenAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never synced'}
        </span>
        <button
          onClick={(e) => onDelete(e, device)}
          className="flex items-center gap-1 p-[4px_8px] rounded-md bg-transparent text-[#E11D48] font-body text-[11px] font-semibold opacity-70 hover:opacity-100 hover:bg-[#E11D48]/10 active:scale-[0.95] cursor-pointer transition-[transform,background-color,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
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
