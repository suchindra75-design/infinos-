import React from 'react';
import {
  ThermometerSnowflake,
  Flame,
  Droplets,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { AnalyticsSummary, DeviceStatusResponse, DeviceSettings } from '../types';

interface LiveTelemetryProps {
  summary: AnalyticsSummary | null;
  statusInfo: DeviceStatusResponse | null;
  settings: DeviceSettings | null;
  isLoading: boolean;
  error: string | null;
}

export const LiveTelemetryCard: React.FC<LiveTelemetryProps> = ({
  summary,
  statusInfo,
  settings,
  isLoading,
  error,
}) => {
  const formatValue = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined) {
      return (
        <span className="text-zinc-600 font-data text-2xl" title="Sensor reading unavailable">
          —
        </span>
      );
    }
    return (
      <div className="flex items-baseline gap-1">
        <span className="font-data tracking-tight font-bold text-3xl sm:text-4xl text-white">
          {val.toFixed(1)}
        </span>
        <span className="text-sm font-body text-zinc-400">{unit}</span>
      </div>
    );
  };

  const getColdStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' };
    const min = settings?.coldTempMin ?? 0.0;
    const max = settings?.coldTempMax ?? 8.0;
    if (val < min || val > max) {
      return { label: 'Out of Range', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
  };

  const getHotStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' };
    const min = settings?.hotTempMin ?? 50.0;
    const max = settings?.hotTempMax ?? 70.0;
    if (val < min || val > max) {
      return { label: 'Out of Range', color: 'text-rose-400 bg-rose-500/15 border-rose-500/30' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
  };

  const getHumidityStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' };
    const min = settings?.humidityMin ?? 20.0;
    const max = settings?.humidityMax ?? 85.0;
    if (val < min || val > max) {
      return { label: 'Warning', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' };
  };

  const formatTimestamp = (ts: string | null | undefined) => {
    if (!ts) return 'No readings yet';
    const date = new Date(ts);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (error) {
    return (
      <div className="bg-[var(--surface)] border border-[var(--red)]/40 rounded-[var(--radius)] p-4 text-[var(--red)] flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-[var(--red)] shrink-0" />
        <div className="text-xs font-body">
          <p className="font-semibold text-[var(--text)]">Telemetry Data Unavailable</p>
          <p className="text-[var(--muted)] text-[11px] mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const latest = summary?.latest;
  const coldStatus = getColdStatus(latest?.coldTemperature);
  const hotStatus = getHotStatus(latest?.hotTemperature);
  const humidityStatus = getHumidityStatus(latest?.humidity);

  return (
    <div className="space-y-3">
      {/* Timestamp bar */}
      <div className="timestamp-bar">
        <span>🕐 Updated: <strong>{formatTimestamp(summary?.latestReadingTimestamp)}</strong></span>
        <span>&nbsp;·&nbsp; {summary?.readingCount ?? 0} readings loaded</span>
        {statusInfo?.message && (
          <span className="hidden sm:inline">&nbsp;·&nbsp; {statusInfo.message}</span>
        )}
      </div>

      {/* Compartment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Hot Zone Card */}
        <div className="rb-card hot">
          <div className="flex items-center justify-between">
            <div className="rb-label">
              <Flame className="w-3.5 h-3.5 text-[var(--hot)]" />
              <span>Hot Zone Temp</span>
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${hotStatus.color}`}
            >
              {hotStatus.label}
            </span>
          </div>
          <div className="rb-value text-[var(--hot)]">
            {latest?.hotTemperature != null ? `${latest.hotTemperature.toFixed(1)}°C` : '—'}
          </div>
          <div className="rb-sub flex items-center justify-between text-[10px]">
            <span>field3 · ThingSpeak</span>
            <span>Target: {settings?.hotTempMin ?? 50.0}°C – {settings?.hotTempMax ?? 70.0}°C</span>
          </div>
        </div>

        {/* Cold Zone Card */}
        <div className="rb-card cold">
          <div className="flex items-center justify-between">
            <div className="rb-label">
              <ThermometerSnowflake className="w-3.5 h-3.5 text-[var(--cold)]" />
              <span>Cold Zone Temp</span>
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${coldStatus.color}`}
            >
              {coldStatus.label}
            </span>
          </div>
          <div className="rb-value text-[var(--cold)]">
            {latest?.coldTemperature != null ? `${latest.coldTemperature.toFixed(1)}°C` : '—'}
          </div>
          <div className="rb-sub flex items-center justify-between text-[10px]">
            <span>field1 · ThingSpeak</span>
            <span>Target: {settings?.coldTempMin ?? 0.0}°C – {settings?.coldTempMax ?? 8.0}°C</span>
          </div>
        </div>

        {/* Relative Humidity Card */}
        <div className="rb-card battery">
          <div className="flex items-center justify-between">
            <div className="rb-label">
              <Droplets className="w-3.5 h-3.5 text-[var(--green)]" />
              <span>Humidity</span>
            </div>
            <span
              className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${humidityStatus.color}`}
            >
              {humidityStatus.label}
            </span>
          </div>
          <div className="rb-value text-[var(--green)]">
            {latest?.humidity != null ? `${latest.humidity.toFixed(1)}%` : '—'}
          </div>
          <div className="rb-sub flex items-center justify-between text-[10px]">
            <span>field4 · ThingSpeak</span>
            <span>Target: {settings?.humidityMin ?? 20.0}% – {settings?.humidityMax ?? 85.0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
