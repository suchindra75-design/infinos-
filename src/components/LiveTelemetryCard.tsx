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
        <span className="text-zinc-600 font-data text-3xl sm:text-4xl" title="Sensor reading unavailable">
          —
        </span>
      );
    }
    return (
      <div className="flex items-baseline gap-1.5">
        <span className="font-data tracking-tight font-extrabold text-4xl sm:text-5xl text-white">
          {val.toFixed(1)}
        </span>
        <span className="text-sm sm:text-base font-body font-semibold text-zinc-400">{unit}</span>
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
      <div className="bg-rose-950/25 border border-rose-900/50 rounded-xl p-4 sm:p-5 text-rose-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <div className="text-xs sm:text-sm font-body">
          <p className="font-semibold text-rose-200">Telemetry Data Unavailable</p>
          <p className="text-rose-300/80 text-xs mt-0.5">{error}</p>
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
      {/* Telemetry Header with Timestamps & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 px-0.5">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#ff6b00] shrink-0" />
          <h2 className="text-xs sm:text-xs font-extrabold uppercase tracking-wider text-zinc-200 font-display">
            Live Compartment Telemetry
          </h2>
          {isLoading && (
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-pulse">
              Syncing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 font-body">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span>Recorded: <strong className="font-data text-zinc-200 font-medium">{formatTimestamp(summary?.latestReadingTimestamp)}</strong></span>
          </div>
          {statusInfo?.message && (
            <span className="hidden xl:inline text-zinc-500">• {statusInfo.message}</span>
          )}
        </div>
      </div>

      {/* 3 Compartment Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {/* Cold Compartment Card */}
        <div className="bg-[#0e1014] border border-white/[0.08] hover:border-[#00a3ff]/40 rounded-xl p-4 sm:p-5 transition relative overflow-hidden group shadow-lg shadow-black/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00a3ff]" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#00a3ff]/10 border border-[#00a3ff]/25 flex items-center justify-center text-[#00a3ff] shrink-0">
                <ThermometerSnowflake className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                Cold Compartment
              </span>
            </div>
            <span
              className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${coldStatus.color}`}
            >
              {coldStatus.label}
            </span>
          </div>

          <div className="my-3 pl-1">
            {formatValue(latest?.coldTemperature, '°C')}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
            <span>Target Range</span>
            <span className="font-data text-zinc-200 font-semibold text-xs">
              {settings?.coldTempMin ?? 0.0}°C – {settings?.coldTempMax ?? 8.0}°C
            </span>
          </div>
        </div>

        {/* Hot Compartment Card */}
        <div className="bg-[#0e1014] border border-white/[0.08] hover:border-orange-500/40 rounded-xl p-4 sm:p-5 transition relative overflow-hidden group shadow-lg shadow-black/40">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ff6b00]" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[#ff6b00] shrink-0">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                Hot Compartment
              </span>
            </div>
            <span
              className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${hotStatus.color}`}
            >
              {hotStatus.label}
            </span>
          </div>

          <div className="my-3 pl-1">
            {formatValue(latest?.hotTemperature, '°C')}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
            <span>Target Range</span>
            <span className="font-data text-zinc-200 font-semibold text-xs">
              {settings?.hotTempMin ?? 50.0}°C – {settings?.hotTempMax ?? 70.0}°C
            </span>
          </div>
        </div>

        {/* Relative Humidity Card */}
        <div className="bg-[#0e1014] border border-white/[0.08] hover:border-sky-500/40 rounded-xl p-4 sm:p-5 transition relative overflow-hidden group shadow-lg shadow-black/40 sm:col-span-2 lg:col-span-1">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                Relative Humidity
              </span>
            </div>
            <span
              className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 ${humidityStatus.color}`}
            >
              {humidityStatus.label}
            </span>
          </div>

          <div className="my-3 pl-1">
            {formatValue(latest?.humidity, '%')}
          </div>

          <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
            <span>Target Range</span>
            <span className="font-data text-zinc-200 font-semibold text-xs">
              {settings?.humidityMin ?? 20.0}% – {settings?.humidityMax ?? 85.0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

