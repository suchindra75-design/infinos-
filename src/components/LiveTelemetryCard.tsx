import React, { useState, useEffect, useRef } from 'react';
import {
  ThermometerSnowflake,
  Flame,
  Droplets,
  Activity,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { AnalyticsSummary, DeviceStatusResponse, DeviceSettings, DeviceFieldMapping, SensorReading } from '../types';

interface LiveTelemetryProps {
  summary: AnalyticsSummary | null;
  statusInfo: DeviceStatusResponse | null;
  settings: DeviceSettings | null;
  isLoading: boolean;
  error: string | null;
  fieldMappings?: DeviceFieldMapping[] | null;
  latestReading?: SensorReading | null;
}

/**
 * Custom hook to smoothly interpolate live numeric sensor readouts.
 * Operates purely on visual rendering layer without altering underlying API data.
 */
function useAnimatedNumber(value: number | null | undefined): number | null {
  const [displayVal, setDisplayVal] = useState<number | null>(value ?? null);
  const prevValRef = useRef<number | null>(value ?? null);

  useEffect(() => {
    if (value === null || value === undefined) {
      setDisplayVal(null);
      prevValRef.current = null;
      return;
    }

    if (prevValRef.current === null) {
      setDisplayVal(value);
      prevValRef.current = value;
      return;
    }

    const start = prevValRef.current;
    const end = value;
    if (start === end) return;

    const duration = 500; // ms easing transition
    const startTime = performance.now();
    let animId: number;

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease out curve
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayVal(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayVal(end);
        prevValRef.current = end;
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  return displayVal;
}

export const LiveTelemetryCard: React.FC<LiveTelemetryProps> = ({
  summary,
  statusInfo,
  settings,
  isLoading,
  error,
  fieldMappings,
  latestReading,
}) => {
  const latest = summary?.latest;
  const animCold = useAnimatedNumber(latest?.coldTemperature);
  const animHot = useAnimatedNumber(latest?.hotTemperature);
  const animHumidity = useAnimatedNumber(latest?.humidity);

  // Fresh reading pulse glow state
  const [isFreshReading, setIsFreshReading] = useState<boolean>(false);
  const prevTsRef = useRef<string | null>(summary?.latestReadingTimestamp || null);

  useEffect(() => {
    if (summary?.latestReadingTimestamp && summary.latestReadingTimestamp !== prevTsRef.current) {
      prevTsRef.current = summary.latestReadingTimestamp;
      setIsFreshReading(true);
      const timer = setTimeout(() => setIsFreshReading(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [summary?.latestReadingTimestamp]);

  const formatValue = (val: number | null, unit: string) => {
    if (val === null) {
      return (
        <span className="text-zinc-600 font-data text-3xl sm:text-4xl" title="Sensor reading unavailable">
          —
        </span>
      );
    }
    return (
      <div className="flex items-baseline gap-1.5 transition-all duration-300">
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
      <div className="bg-rose-950/25 border border-rose-900/50 rounded-xl p-4 sm:p-5 text-rose-300 flex items-center gap-3 animate-in fade-in duration-200">
        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
        <div className="text-xs sm:text-sm font-body">
          <p className="font-semibold text-rose-200">Telemetry Data Unavailable</p>
          <p className="text-rose-300/80 text-xs mt-0.5">{error}</p>
        </div>
      </div>
    );
  }

  const coldStatus = getColdStatus(latest?.coldTemperature);
  const hotStatus = getHotStatus(latest?.hotTemperature);
  const humidityStatus = getHumidityStatus(latest?.humidity);

  const hasDynamicMappings = fieldMappings && fieldMappings.length > 0;

  return (
    <div className="space-y-3">
      {/* Telemetry Header with Timestamps & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 px-0.5">
        <div className="flex items-center gap-2">
          <Activity className={`w-4 h-4 text-[#ff6b00] shrink-0 transition-transform duration-300 ${isFreshReading ? 'scale-125 text-orange-400' : ''}`} />
          <h2 className="text-xs sm:text-xs font-extrabold uppercase tracking-wider text-zinc-200 font-display">
            Live Compartment Telemetry
          </h2>
          {isLoading ? (
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 animate-pulse">
              Syncing...
            </span>
          ) : isFreshReading ? (
            <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-in fade-in duration-200">
              Fresh Data
            </span>
          ) : null}
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

      {/* Dynamic or Legacy Compartment Cards Grid */}
      {hasDynamicMappings ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
          {fieldMappings.map((m) => {
            const rawVal = latestReading?.fieldValues?.[m.fieldKey] ?? (
              m.zone === 'cold' ? latest?.coldTemperature :
              m.zone === 'hot' ? latest?.hotTemperature :
              m.metric === 'humidity' ? latest?.humidity : null
            );

            const isCold = m.zone === 'cold';
            const isHot = m.zone === 'hot';
            const isHum = m.metric === 'humidity';

            const status = isCold ? getColdStatus(rawVal) : isHot ? getHotStatus(rawVal) : isHum ? getHumidityStatus(rawVal) : (
              rawVal !== null
                ? { label: 'Optimal', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' }
                : { label: 'Unavailable', color: 'text-zinc-400 bg-zinc-800/80 border-zinc-700' }
            );

            const unit = m.unit || (m.metric === 'temperature' ? '°C' : m.metric === 'humidity' ? '%' : '');
            const accentColor = isCold ? '#00a3ff' : isHot ? '#ff6b00' : isHum ? '#38bdf8' : '#10b981';

            return (
              <div
                key={m.fieldKey}
                className={`bg-[#0e1014] border rounded-xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/40 ${
                  isFreshReading
                    ? 'border-white/40 shadow-white/5'
                    : 'border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: accentColor }} />
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform"
                      style={{
                        backgroundColor: `${accentColor}15`,
                        borderColor: `${accentColor}40`,
                        color: accentColor,
                        borderWidth: '1px',
                      }}
                    >
                      {isCold ? (
                        <ThermometerSnowflake className="w-4 h-4" />
                      ) : isHot ? (
                        <Flame className="w-4 h-4" />
                      ) : isHum ? (
                        <Droplets className="w-4 h-4" />
                      ) : (
                        <Activity className="w-4 h-4" />
                      )}
                    </div>
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate" title={m.label}>
                      {m.label}
                    </span>
                  </div>
                  <span className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors duration-300 ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="my-3 pl-1">
                  {formatValue(rawVal, unit)}
                </div>

                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
                  <span>Target Range</span>
                  <span className="font-data text-zinc-200 font-semibold text-xs">
                    {isCold ? (
                      `${settings?.coldTempMin ?? 0.0}°C – ${settings?.coldTempMax ?? 8.0}°C`
                    ) : isHot ? (
                      `${settings?.hotTempMin ?? 50.0}°C – ${settings?.hotTempMax ?? 70.0}°C`
                    ) : isHum ? (
                      `${settings?.humidityMin ?? 20.0}% – ${settings?.humidityMax ?? 85.0}%`
                    ) : (
                      `Field ${m.fieldNumber}`
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Legacy 3 Compartment Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
          {/* Cold Compartment Card */}
          <div className={`bg-[#0e1014] border rounded-xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/40 ${
            isFreshReading
              ? 'border-[#00a3ff]/60 shadow-[#00a3ff]/10'
              : 'border-white/[0.08] hover:border-[#00a3ff]/40'
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#00a3ff]" />
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#00a3ff]/10 border border-[#00a3ff]/25 flex items-center justify-center text-[#00a3ff] shrink-0 group-hover:scale-105 transition-transform">
                  <ThermometerSnowflake className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                  Cold Compartment
                </span>
              </div>
              <span
                className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors duration-300 ${coldStatus.color}`}
              >
                {coldStatus.label}
              </span>
            </div>

            <div className="my-3 pl-1">
              {formatValue(animCold, '°C')}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
              <span>Target Range</span>
              <span className="font-data text-zinc-200 font-semibold text-xs">
                {settings?.coldTempMin ?? 0.0}°C – {settings?.coldTempMax ?? 8.0}°C
              </span>
            </div>
          </div>

          {/* Hot Compartment Card */}
          <div className={`bg-[#0e1014] border rounded-xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/40 ${
            isFreshReading
              ? 'border-[#ff6b00]/60 shadow-[#ff6b00]/10'
              : 'border-white/[0.08] hover:border-orange-500/40'
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-[#ff6b00]" />
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/25 flex items-center justify-center text-[#ff6b00] shrink-0 group-hover:scale-105 transition-transform">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                  Hot Compartment
                </span>
              </div>
              <span
                className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors duration-300 ${hotStatus.color}`}
              >
                {hotStatus.label}
              </span>
            </div>

            <div className="my-3 pl-1">
              {formatValue(animHot, '°C')}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
              <span>Target Range</span>
              <span className="font-data text-zinc-200 font-semibold text-xs">
                {settings?.hotTempMin ?? 50.0}°C – {settings?.hotTempMax ?? 70.0}°C
              </span>
            </div>
          </div>

          {/* Relative Humidity Card */}
          <div className={`bg-[#0e1014] border rounded-xl p-4 sm:p-5 transition-all duration-300 relative overflow-hidden group shadow-lg shadow-black/40 sm:col-span-2 lg:col-span-1 ${
            isFreshReading
              ? 'border-sky-500/60 shadow-sky-500/10'
              : 'border-white/[0.08] hover:border-sky-500/40'
          }`}>
            <div className="absolute top-0 left-0 w-1.5 h-full bg-sky-500" />
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
                  <Droplets className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display truncate">
                  Relative Humidity
                </span>
              </div>
              <span
                className={`text-[9px] sm:text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border shrink-0 transition-colors duration-300 ${humidityStatus.color}`}
              >
                {humidityStatus.label}
              </span>
            </div>

            <div className="my-3 pl-1">
              {formatValue(animHumidity, '%')}
            </div>

            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-zinc-400 font-body">
              <span>Target Range</span>
              <span className="font-data text-zinc-200 font-semibold text-xs">
                {settings?.humidityMin ?? 20.0}% – {settings?.humidityMax ?? 85.0}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
