import React from 'react';
import { BarChart3, Database, Calendar, AlertOctagon } from 'lucide-react';
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
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-4 sm:p-5 space-y-3.5 shadow-lg shadow-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#ff6b00]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display">
            PostgreSQL Telemetry Analytics
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400 font-body">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#ff6b00]" />
            Total Readings:{' '}
            <strong className="text-zinc-200 font-data font-normal">
              {summary?.readingCount ?? 0}
            </strong>
          </span>
          {summary && summary.activeAlertsCount > 0 && (
            <span className="flex items-center gap-1.5 text-rose-400 font-medium font-body bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-full text-[11px]">
              <AlertOctagon className="w-3 h-3" />
              {summary.activeAlertsCount} Active Alerts
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Matrix */}
      <div className="overflow-x-auto rounded-lg border border-white/[0.06]">
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
      <div className="pt-2 border-t border-white/[0.06] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-zinc-400 gap-2 font-body">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
          <span>
            First Recorded Reading: <strong className="text-zinc-300 font-data font-normal">{formatDate(summary?.firstReadingTimestamp)}</strong>
          </span>
        </div>
        <div>
          <span>
            Latest Recorded Reading: <strong className="text-zinc-300 font-data font-normal">{formatDate(summary?.latestReadingTimestamp)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
