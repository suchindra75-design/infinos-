import React from 'react';
import {
  Plus,
  Radio,
  SlidersHorizontal,
  Download,
  AlertCircle,
} from 'lucide-react';
import { SafeDevice, AnalyticsSummary } from '../types';
import { useAuth } from '../context/AuthContext';

interface DeviceSelectorProps {
  devices: SafeDevice[];
  selectedDevice: SafeDevice | null;
  onSelectDevice: (device: SafeDevice) => void;
  onOpenSettings: () => void;
  onOpenExport: () => void;
  onOpenAddDevice: () => void;
  isLoading: boolean;
  summary?: AnalyticsSummary | null;
}

export const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  devices,
  selectedDevice,
  onSelectDevice,
  onOpenSettings,
  onOpenExport,
  onOpenAddDevice,
  isLoading,
  summary,
}) => {
  const { user, isAuthenticated } = useAuth();
  const canManageSettings =
    isAuthenticated &&
    (user?.role === 'ADMIN' || (user?.role === 'OPERATOR' && selectedDevice?.ownerId === user.id));

  if (devices.length === 0 && !isLoading) {
    return (
      <div className="mb-6">
        <div className="section-title">
          <i />
          <span>Your Bags</span>
        </div>
        <div className="devices-grid">
          <div className="col-span-full text-center py-12 px-5 text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)]">
            <div className="text-4xl mb-3 opacity-25">📦</div>
            <div className="font-display text-sm font-bold text-[var(--text)] mb-1">
              No bags claimed yet
            </div>
            <div className="text-xs text-[var(--muted)]">
              Tap{' '}
              <button
                onClick={onOpenAddDevice}
                className="font-bold text-[var(--orange)] hover:underline cursor-pointer"
              >
                + Claim Bag
              </button>{' '}
              to get started
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-2.5">
        <div className="section-title mb-0">
          <i />
          <span>Your Bags ({devices.length})</span>
        </div>
        <button
          onClick={onOpenAddDevice}
          className="text-xs text-[var(--orange)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
          <span>Add Bag</span>
        </button>
      </div>

      {/* Grid of INFINOS Bag Cards */}
      <div className="devices-grid">
        {devices.map((device) => {
          const isSelected = selectedDevice?.id === device.id;
          const isOnline = device.status === 'ONLINE';

          // If active bag, display live telemetry; otherwise display fallback
          const hotVal =
            isSelected && summary?.latest?.hotTemperature != null
              ? `${summary.latest.hotTemperature.toFixed(1)}°C`
              : '—';
          const coldVal =
            isSelected && summary?.latest?.coldTemperature != null
              ? `${summary.latest.coldTemperature.toFixed(1)}°C`
              : '—';

          return (
            <div
              key={device.id}
              onClick={() => onSelectDevice(device)}
              className={`device-card ${isSelected ? 'active' : ''}`}
              style={
                {
                  '--card-color': isSelected ? 'var(--orange)' : 'rgba(255,255,255,0.06)',
                } as React.CSSProperties
              }
            >
              <div className="dcard-top">
                <div className="dcard-icon">🌡️</div>
                <div className={`dcard-status ${isOnline ? 'online' : 'offline'}`}>
                  {isOnline ? 'LIVE' : 'OFFLINE'}
                </div>
              </div>

              <div className="dcard-name truncate" title={device.name}>
                {device.name}
              </div>

              <div className="dcard-code">
                {device.deviceCode} · Ch: {device.thingSpeakChannelId}
              </div>

              <div className="dcard-readings">
                <div className="dread">
                  <div className="dread-label">🔥 Hot</div>
                  <div className="dread-val text-[var(--hot)]">{hotVal}</div>
                </div>
                <div className="dread">
                  <div className="dread-label">❄️ Cold</div>
                  <div className="dread-val text-[var(--cold)]">{coldVal}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

