import React from 'react';
import { WifiOff, AlertTriangle, Database, Info } from 'lucide-react';
import { DeviceStatusResponse } from '../types';

interface StatusBannerProps {
  backendConnected: boolean;
  statusInfo: DeviceStatusResponse | null;
  errorMessage: string | null;
}

export const StatusBanner: React.FC<StatusBannerProps> = ({
  backendConnected,
  statusInfo,
  errorMessage,
}) => {
  if (!backendConnected) {
    return (
      <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 sm:p-3.5 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 shadow-lg shadow-black/40 font-body">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 sm:p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-400 shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-amber-100 block font-display text-xs sm:text-sm">
              Backend Service Offline or Unreachable
            </span>
            <span className="text-amber-300/80 text-[10px] sm:text-[11px] leading-tight block mt-0.5">
              Unable to reach INFINOS backend API. PostgreSQL telemetry requires active connection.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 text-[10px] sm:text-[11px] bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-700/40 self-stretch sm:self-auto justify-center">
          <Database className="w-3 h-3 text-amber-400" />
          <span>Source: PostgreSQL</span>
        </div>
      </div>
    );
  }

  if (statusInfo && statusInfo.status === 'OFFLINE') {
    return (
      <div className="bg-rose-950/25 border border-rose-500/30 rounded-xl p-3 text-rose-200 text-xs flex items-center justify-between gap-2.5 font-body shadow-md shadow-black/30">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <strong className="font-display">Warning:</strong> Bag [{statusInfo.deviceCode}] is currently <strong>OFFLINE</strong>.{' '}
            {statusInfo.secondsSinceLastSeen
              ? `Last seen ${Math.round(statusInfo.secondsSinceLastSeen / 60)} min ago.`
              : statusInfo.message}
          </span>
        </div>
      </div>
    );
  }

  if (statusInfo && statusInfo.status === 'STALE') {
    return (
      <div className="bg-amber-950/25 border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs flex items-center justify-between gap-2.5 font-body shadow-md shadow-black/30">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="text-[11px] sm:text-xs">
            <strong className="font-display">Notice:</strong> Bag [{statusInfo.deviceCode}] telemetry is <strong>STALE</strong>. Verify hardware transmission.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
