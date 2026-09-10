import React from 'react';
import {
  SlidersHorizontal,
  Download,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
} from 'lucide-react';
import { SafeDevice, DeviceStatus } from '../types';
import { useAuth } from '../context/AuthContext';

interface DeviceSelectorProps {
  devices: SafeDevice[];
  selectedDevice: SafeDevice | null;
  onSelectDevice: (device: SafeDevice) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenAddDevice: () => void;
  isLoading: boolean;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onOpenSettings,
  onOpenExport,
  onOpenAddDevice,
  isLoading,
}) => {
  const { user, isAuthenticated } = useAuth();
  const canManageSettings =
    isAuthenticated && (user?.role === 'ADMIN' || (user?.role === 'OPERATOR' && selectedDevice?.ownerId === user.id));

  const getStatusBadge = (status: DeviceStatus) => {
    switch (status) {
      case 'ONLINE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </span>
        );
      case 'STALE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            STALE
          </span>
        );
      case 'OFFLINE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            OFFLINE
          </span>
        );
    }
  };

  if (devices.length === 0 && !isLoading) {
    return (
      <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-6 text-center">
        <div className="max-w-md mx-auto">
          <div className="w-12 h-12 rounded-full bg-zinc-900 border border-white/[0.08] text-orange-400 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-white font-display">No Smart Delivery Bags Configured</h3>
          <p className="text-sm text-zinc-400 font-body mt-1 mb-4">
            Connect a Smart Delivery Bag with its ThingSpeak Channel ID to begin synchronizing live cold and hot compartment telemetry.
          </p>
          {isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OPERATOR') ? (
            <button
              onClick={onOpenAddDevice}
              className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-full bg-gradient-to-r from-[#ff6b00] to-[#e05e00] hover:from-[#ff7d1a] hover:to-[#eb6405] text-white transition shadow-md shadow-orange-500/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Claim Smart Bag
            </button>
          ) : (
            <p className="text-xs text-zinc-500 font-body">Sign in with Operator or Admin privileges to claim a new bag.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-3.5 sm:p-4.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg shadow-black/30">
      {/* Device Dropdown & Basic Meta */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 font-display shrink-0">
          Active Bag:
        </label>
        <div className="relative w-full sm:w-72">
          <select
            value={selectedDevice?.id || ''}
            onChange={(e) => {
              const dev = devices.find((d) => d.id === e.target.value);
              if (dev) onSelectDevice(dev);
            }}
            disabled={isLoading || devices.length === 0}
            className="w-full bg-[#07080a] text-zinc-100 border border-white/[0.1] hover:border-white/[0.2] rounded-lg px-3 py-1.5 text-xs font-medium font-body focus:outline-none focus:border-orange-500 transition appearance-none cursor-pointer pr-9"
          >
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.deviceCode} — {device.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500 text-xs">
            ▼
          </div>
        </div>

        {selectedDevice && (
          <div className="flex items-center gap-2.5 shrink-0">
            {getStatusBadge(selectedDevice.status)}
            <span className="text-xs text-zinc-500 hidden lg:inline font-body">
              Channel: <span className="font-data text-zinc-300 font-normal">{selectedDevice.thingSpeakChannelId}</span>
            </span>
          </div>
        )}
      </div>

      {/* Action Controls for Selected Device */}
      {selectedDevice && (
        <div className="flex items-center gap-2 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/[0.06]">
          <button
            onClick={onOpenExport}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14171d] hover:bg-[#1a1e27] text-zinc-300 border border-white/[0.08] hover:border-orange-500/30 transition cursor-pointer"
            title="Download CSV or PDF audit telemetry reports"
          >
            <Download className="w-3.5 h-3.5 text-orange-400" />
            <span>Audit Export</span>
          </button>

          {canManageSettings && (
            <button
              onClick={onOpenSettings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[#14171d] hover:bg-[#1a1e27] text-zinc-300 border border-white/[0.08] hover:border-orange-500/30 transition cursor-pointer"
              title="Configure compartment temperature and humidity thresholds"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-400" />
              <span>Thresholds</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
