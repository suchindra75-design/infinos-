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
        <span className="text-slate-500 font-mono text-xl" title="Sensor reading unavailable">
          —
        </span>
      );
    }
    return (
      <span className="font-mono tracking-tight font-bold text-3xl">
        {val.toFixed(1)}
        <span className="text-sm font-sans font-normal text-slate-400 ml-1">{unit}</span>
      </span>
    );
  };

  const getColdStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
    const min = settings?.coldTempMin ?? 0.0;
    const max = settings?.coldTempMax ?? 8.0;
    if (val < min || val > max) {
      return { label: 'Out of Range', color: 'text-rose-400 bg-rose-950/60 border-rose-800' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
  };

  const getHotStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
    const min = settings?.hotTempMin ?? 50.0;
    const max = settings?.hotTempMax ?? 70.0;
    if (val < min || val > max) {
      return { label: 'Out of Range', color: 'text-rose-400 bg-rose-950/60 border-rose-800' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
  };

  const getHumidityStatus = (val: number | null | undefined) => {
    if (val === null || val === undefined) return { label: 'Unavailable', color: 'text-slate-400 bg-slate-800/80 border-slate-700' };
    const min = settings?.humidityMin ?? 20.0;
    const max = settings?.humidityMax ?? 85.0;
    if (val < min || val > max) {
      return { label: 'Warning', color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
    }
    return { label: 'Optimal', color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
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
      <div className="bg-rose-950/20 border border-rose-900/60 rounded-xl p-6 text-rose-300 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <div className="text-sm">
          <p className="font-semibold text-rose-200">Telemetry Data Unavailable</p>
          <p className="text-rose-300/80 mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const latest = summary?.latest;
  const coldStatus = getColdStatus(latest?.coldTemperature);
  const hotStatus = getHotStatus(latest?.hotTemperature);
  const humidityStatus = getHumidityStatus(latest?.humidity);

  return (
    <div className="space-y-4">
      {/* Telemetry Header with Timestamps & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
            Live Compartment Telemetry
          </h2>
          {isLoading && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-900/40 text-cyan-300 border border-cyan-700/50 animate-pulse">
              Refreshing...
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>Recorded: {formatTimestamp(summary?.latestReadingTimestamp)}</span>
          </div>
          {statusInfo?.message && (
            <span className="hidden lg:inline text-slate-500">• {statusInfo.message}</span>
          )}
        </div>
      </div>

      {/* 3 Compartment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cold Compartment Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-cyan-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <ThermometerSnowflake className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Cold Compartment
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${coldStatus.color}`}
            >
              {coldStatus.label}
            </span>
          </div>

          <div className="my-2">
            {formatValue(latest?.coldTemperature, '°C')}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Target Range</span>
            <span className="font-mono text-slate-300">
              {settings?.coldTempMin ?? 0.0}°C – {settings?.coldTempMax ?? 8.0}°C
            </span>
          </div>
        </div>

        {/* Hot Compartment Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Flame className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Hot Compartment
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${hotStatus.color}`}
            >
              {hotStatus.label}
            </span>
          </div>

          <div className="my-2">
            {formatValue(latest?.hotTemperature, '°C')}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Target Range</span>
            <span className="font-mono text-slate-300">
              {settings?.hotTempMin ?? 50.0}°C – {settings?.hotTempMax ?? 70.0}°C
            </span>
          </div>
        </div>

        {/* Relative Humidity Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                <Droplets className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Relative Humidity
              </span>
            </div>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${humidityStatus.color}`}
            >
              {humidityStatus.label}
            </span>
          </div>

          <div className="my-2">
            {formatValue(latest?.humidity, '%')}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Target Range</span>
            <span className="font-mono text-slate-300">
              {settings?.humidityMin ?? 20.0}% – {settings?.humidityMax ?? 85.0}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
