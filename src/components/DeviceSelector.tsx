import React from 'react';
import {
  SlidersHorizontal,
  Download,
  AlertCircle,
  Plus,
  Trash2,
  Archive,
} from 'lucide-react';
import { SafeDevice } from '../types';
import { useAuth } from '../context/AuthContext';

interface DeviceSelectorProps {
  devices: SafeDevice[];
  selectedDevice: SafeDevice | null;
  onSelectDevice: (device: SafeDevice) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenAddDevice: () => void;
  onOpenRemoveDevice: () => void;
  isLoading: boolean;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onOpenSettings,
  onOpenExport,
  onOpenAddDevice,
  onOpenRemoveDevice,
  isLoading,
}) => {
  const { user, isAuthenticated } = useAuth();
  const canManageSettings =
    isAuthenticated && (user?.role === 'ADMIN' || (user?.role === 'OPERATOR' && selectedDevice?.ownerId === user.id));

  const getStatusBadge = (device: SafeDevice) => {
    if (device.isArchived) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/25 shrink-0" title="Device is archived (historical telemetry preserved)">
          <Archive className="w-3 h-3 text-amber-600 shrink-0" />
          ARCHIVED
        </span>
      );
    }

    switch (device.status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-live-blink" />
            ONLINE
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            STALE
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E11D48]/10 text-[#E11D48] border border-[#E11D48]/25 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
            OFFLINE
          </span>
        );
    }
  };

  if (devices.length === 0 && !isLoading) {
    return (
      <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-6 text-center shadow-md shadow-[#171512]/04">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-[#FC4731]/10 border border-[#FC4731]/20 text-[#FC4731] flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#171512] font-display">No Smart Delivery Bags Configured</h3>
          <p className="text-xs sm:text-sm text-[#7B746A] font-body mt-1 mb-4">
            Connect a Smart Delivery Bag with its ThingSpeak Channel ID to begin synchronizing live cold and hot compartment telemetry.
          </p>
          {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OPERATOR') ? (
            <button
              onClick={onOpenAddDevice}
              className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold rounded-full bg-[#FC4731] hover:bg-[#e03a25] text-white transition-[transform,box-shadow,background-color] duration-[var(--dur-base)] ease-[var(--ease-out)] active:scale-[0.97] active:shadow-none shadow-sm shadow-[#FC4731]/25 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Claim Smart Bag</span>
            </button>
          ) : (
            <p className="text-xs text-[#7B746A] font-body">Sign in with Operator or Admin privileges to claim a new bag.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 shadow-md shadow-[#171512]/04">
      {/* Device Dropdown & Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 min-w-0">
        <div className="flex items-center justify-between sm:justify-start gap-2 shrink-0">
          <label className="text-xs font-bold uppercase tracking-widest text-[#171512] font-display">
            Active Bag:
          </label>
          {selectedDevice && (
            <div className="flex items-center gap-2 sm:hidden">
              {getStatusBadge(selectedDevice)}
            </div>
          )}
        </div>

        <div className="relative flex-1 sm:max-w-xs">
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const dev = devices.find((d) => d.id === e.target.value);
              if (dev) onSelectDevice(dev);
            }}
            disabled={isLoading || devices.length === 0}
            className="w-full bg-[#F2ECE0] text-[#171512] border border-[#171512]/10 hover:border-[#171512]/20 rounded-xl px-3.5 py-2 text-xs sm:text-sm font-bold font-body focus:outline-none focus:border-[#FC4731] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] appearance-none cursor-pointer pr-8 min-h-[40px]"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.deviceCode} — {device.name} {device.isArchived ? '(Archived)' : ''}
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#7B746A] text-[10px]">
            ▼
          </div>
        </div>

        {selectedDevice && (
          <div className="hidden sm:flex items-center gap-2 shrink-0 min-w-0">
            {getStatusBadge(selectedDevice)}
            <span className="text-xs text-[#7B746A] hidden xl:inline font-body truncate max-w-[160px]">
              Channel: <span className="font-mono text-[#171512] font-bold">{selectedDevice.thingSpeakChannelId}</span>
            </span>
          </div>
        )}
      </div>

      {/* Action Controls for Selected Device */}
      {selectedDevice && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex items-center gap-2 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#171512]/08">
          <button
            onClick={onOpenExport}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#F2ECE0] hover:bg-[#EAE3D5] text-[#171512] border border-[#171512]/08 active:scale-[0.97] transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[40px]"
            title="Download CSV or PDF audit telemetry reports"
          >
            <Download className="w-4 h-4 text-[#FC4731] shrink-0" />
            <span>Audit Export</span>
          </button>

          {canManageSettings && (
            <>
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#F2ECE0] hover:bg-[#EAE3D5] text-[#171512] border border-[#171512]/08 active:scale-[0.97] transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[40px]"
                title="Configure compartment temperature and humidity thresholds"
              >
                <SlidersHorizontal className="w-4 h-4 text-[#7B746A] shrink-0" />
                <span>Thresholds</span>
              </button>

              <button
                onClick={onOpenRemoveDevice}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#F2ECE0] hover:bg-[#E11D48]/10 text-[#E11D48] border border-[#171512]/08 hover:border-[#E11D48]/30 active:scale-[0.97] transition-[transform,background-color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[40px]"
                title="Remove or archive this Smart Delivery Bag"
              >
                <Trash2 className="w-4 h-4 text-[#E11D48] shrink-0" />
                <span>Remove Bag</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};
