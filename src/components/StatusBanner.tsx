import React from 'react';
import { Wifi, WifiOff, AlertTriangle, Database, Info } from 'lucide-react';
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
      <div className="bg-amber-950/40 border border-amber-800/60 rounded-xl p-4 text-amber-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-amber-100 block">
              Backend Service Offline or Unreachable
            </span>
            <span className="text-amber-300/80 text-[11px]">
              Unable to reach INFINOS backend API. PostgreSQL sensor readings and background ThingSpeak synchronization require the backend server.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px] bg-amber-900/40 px-3 py-1.5 rounded-lg border border-amber-700/50">
          <Database className="w-3.5 h-3.5 text-amber-400" />
          <span>Source of Truth: PostgreSQL</span>
        </div>
      </div>
    );
  }

  if (statusInfo && statusInfo.status === 'OFFLINE') {
    return (
      <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl p-3 text-rose-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            <strong>Warning:</strong> Bag [{statusInfo.deviceCode}] is currently <strong>OFFLINE</strong>.{' '}
            {statusInfo.secondsSinceLastSeen
              ? `Last transmission was ${Math.round(statusInfo.secondsSinceLastSeen / 60)} minutes ago.`
              : statusInfo.message}
          </span>
        </div>
      </div>
    );
  }

  if (statusInfo && statusInfo.status === 'STALE') {
    return (
      <div className="bg-amber-950/30 border border-amber-900/50 rounded-xl p-3 text-amber-200 text-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong>Notice:</strong> Bag [{statusInfo.deviceCode}] telemetry is <strong>STALE</strong>. Verify hardware transmission.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
