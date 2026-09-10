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
      <div className="bg-[var(--yellow)]/10 border border-[var(--yellow)]/30 rounded-[var(--radius)] p-3.5 text-[var(--yellow)] text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-body">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[var(--yellow)]/15 border border-[var(--yellow)]/30 text-[var(--yellow)] shrink-0">
            <WifiOff className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-[var(--text)] block font-display">
              Backend Service Offline or Unreachable
            </span>
            <span className="text-[var(--muted)] text-[11px]">
              Unable to reach INFINOS backend API. PostgreSQL sensor readings and background ThingSpeak synchronization require the backend server.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-[11px] bg-[var(--surface)] text-[var(--text)] px-3 py-1.5 rounded-lg border border-[var(--border)]">
          <Database className="w-3.5 h-3.5 text-[var(--yellow)]" />
          <span>Source of Truth: PostgreSQL</span>
        </div>
      </div>
    );
  }

  if (statusInfo && statusInfo.status === 'OFFLINE') {
    return (
      <div className="bg-[var(--red)]/10 border border-[var(--red)]/30 rounded-[var(--radius)] p-3 text-[var(--red)] text-xs flex items-center justify-between gap-3 font-body">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[var(--red)] shrink-0" />
          <span className="text-[var(--text)]">
            <strong className="font-display text-[var(--red)]">Warning:</strong> Bag [{statusInfo.deviceCode}] is currently <strong>OFFLINE</strong>.{' '}
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
      <div className="bg-[var(--yellow)]/10 border border-[var(--yellow)]/30 rounded-[var(--radius)] p-3 text-[var(--yellow)] text-xs flex items-center justify-between gap-3 font-body">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[var(--yellow)] shrink-0" />
          <span className="text-[var(--text)]">
            <strong className="font-display text-[var(--yellow)]">Notice:</strong> Bag [{statusInfo.deviceCode}] telemetry is <strong>STALE</strong>. Verify hardware transmission.
          </span>
        </div>
      </div>
    );
  }

  return null;
};
