import React from 'react';
import { BarChart3, Database, Calendar, AlertOctagon, TrendingUp, ThermometerSnowflake, Flame, Droplets } from 'lucide-react';
import { AnalyticsSummary } from '../types';

interface AnalyticsSummaryProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

export const AnalyticsSummarySection: React.FC<AnalyticsSummaryProps> = ({
  summary,
  isLoading,
}) => {
  const formatVal = (val: number | null | undefined, unit: string) => {
    if (val === null || val === undefined) return '—';
    return `${val.toFixed(1)}${unit}`;
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!summary && !isLoading) {
    return null;
  }

  return (
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-lg shadow-black/30">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff6b00] shrink-0" />
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300 font-display">
            PostgreSQL Telemetry Analytics
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-400 font-body">
          <span className="flex items-center gap-1.5 bg-[#07080a] px-2 py-0.5 rounded-lg border border-white/[0.06]">
            <Database className="w-3 h-3 text-[#ff6b00] shrink-0" />
            <span>Readings:</span>
            <strong className="text-zinc-200 font-data font-normal">
              {summary?.readingCount ?? 0}
            </strong>
          </span>
          {summary && summary.activeAlertsCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400 font-medium font-body bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg text-[10px] sm:text-[11px]">
              <AlertOctagon className="w-3 h-3 shrink-0" />
              {summary.activeAlertsCount} Active
            </span>
          )}
        </div>
      </div>

      {/* Mobile Card View (< 640px) */}
      <div className="sm:hidden space-y-2.5 font-body">
        {/* Cold Metrics */}
        <div className="bg-[#07080a] border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.04] text-[#00a3ff]">
            <ThermometerSnowflake className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-zinc-200 font-display">Cold Compartment</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Min</div>
              <div className="text-xs font-data font-semibold text-[#00a3ff]">
                {formatVal(summary?.minimum.coldTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Avg</div>
              <div className="text-xs font-data font-semibold text-zinc-200">
                {formatVal(summary?.average.coldTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Max</div>
              <div className="text-xs font-data font-semibold text-[#00a3ff]">
                {formatVal(summary?.maximum.coldTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Latest</div>
              <div className="text-xs font-data font-bold text-white">
                {formatVal(summary?.latest.coldTemperature, '°C')}
              </div>
            </div>
          </div>
        </div>

        {/* Hot Metrics */}
        <div className="bg-[#07080a] border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.04] text-[#ff6b00]">
            <Flame className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-zinc-200 font-display">Hot Compartment</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Min</div>
              <div className="text-xs font-data font-semibold text-[#ff8533]">
                {formatVal(summary?.minimum.hotTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Avg</div>
              <div className="text-xs font-data font-semibold text-zinc-200">
                {formatVal(summary?.average.hotTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Max</div>
              <div className="text-xs font-data font-semibold text-[#ff6b00]">
                {formatVal(summary?.maximum.hotTemperature, '°C')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Latest</div>
              <div className="text-xs font-data font-bold text-white">
                {formatVal(summary?.latest.hotTemperature, '°C')}
              </div>
            </div>
          </div>
        </div>

        {/* Humidity Metrics */}
        <div className="bg-[#07080a] border border-white/[0.06] rounded-lg p-3">
          <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.04] text-sky-400">
            <Droplets className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold text-zinc-200 font-display">Relative Humidity</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5 text-center">
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Min</div>
              <div className="text-xs font-data font-semibold text-sky-300">
                {formatVal(summary?.minimum.humidity, '%')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Avg</div>
              <div className="text-xs font-data font-semibold text-zinc-200">
                {formatVal(summary?.average.humidity, '%')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Max</div>
              <div className="text-xs font-data font-semibold text-sky-400">
                {formatVal(summary?.maximum.humidity, '%')}
              </div>
            </div>
            <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
              <div className="text-[9px] uppercase text-zinc-500 font-display">Latest</div>
              <div className="text-xs font-data font-bold text-white">
                {formatVal(summary?.latest.humidity, '%')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-[#07080a] text-zinc-400 uppercase tracking-wider text-[10px] font-display border-b border-white/[0.08]">
            <tr>
              <th className="py-2.5 px-3 font-bold">Compartment</th>
              <th className="py-2.5 px-3 font-bold text-center">Minimum</th>
              <th className="py-2.5 px-3 font-bold text-center">Average</th>
              <th className="py-2.5 px-3 font-bold text-center">Maximum</th>
              <th className="py-2.5 px-3 font-bold text-center">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-data bg-[#0b0c10]">
            <tr className="hover:bg-white/[0.02] transition">
              <td className="py-2.5 px-3 font-body font-medium text-zinc-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#00a3ff]" />
                Cold Compartment
              </td>
              <td className="py-2.5 px-3 text-center text-[#00a3ff]">
                {formatVal(summary?.minimum.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-zinc-200 font-medium">
                {formatVal(summary?.average.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[#00a3ff]">
                {formatVal(summary?.maximum.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-white font-bold">
                {formatVal(summary?.latest.coldTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-white/[0.02] transition">
              <td className="py-2.5 px-3 font-body font-medium text-zinc-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#ff6b00]" />
                Hot Compartment
              </td>
              <td className="py-2.5 px-3 text-center text-[#ff8533]">
                {formatVal(summary?.minimum.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-zinc-200 font-medium">
                {formatVal(summary?.average.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[#ff6b00]">
                {formatVal(summary?.maximum.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-white font-bold">
                {formatVal(summary?.latest.hotTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-white/[0.02] transition">
              <td className="py-2.5 px-3 font-body font-medium text-zinc-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                Relative Humidity
              </td>
              <td className="py-2.5 px-3 text-center text-sky-300">
                {formatVal(summary?.minimum.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-zinc-200 font-medium">
                {formatVal(summary?.average.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-sky-400">
                {formatVal(summary?.maximum.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-white font-bold">
                {formatVal(summary?.latest.humidity, '%')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dataset Range Metadata */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between text-[11px] sm:text-xs text-zinc-400 gap-1.5 font-body">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
          <span>
            First Record: <strong className="text-zinc-300 font-data font-normal">{formatDate(summary?.firstReadingTimestamp)}</strong>
          </span>
        </div>
        <div>
          <span>
            Latest Record: <strong className="text-zinc-300 font-data font-normal">{formatDate(summary?.latestReadingTimestamp)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
