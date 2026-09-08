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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            PostgreSQL Analytics Summary
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3 text-cyan-400" />
            Total Readings:{' '}
            <strong className="text-slate-200 font-mono">
              {summary?.readingCount ?? 0}
            </strong>
          </span>
          {summary && summary.activeAlertsCount > 0 && (
            <span className="flex items-center gap-1 text-rose-400 font-medium">
              <AlertOctagon className="w-3 h-3" />
              {summary.activeAlertsCount} Active Alerts
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Matrix */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/60 text-slate-400 uppercase tracking-wider text-[10px] border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Sensor Channel</th>
              <th className="py-2.5 px-3 font-semibold text-center">Minimum</th>
              <th className="py-2.5 px-3 font-semibold text-center">Average</th>
              <th className="py-2.5 px-3 font-semibold text-center">Maximum</th>
              <th className="py-2.5 px-3 font-semibold text-center">Latest Recorded</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            <tr className="hover:bg-slate-800/30 transition">
              <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                Cold Compartment
              </td>
              <td className="py-3 px-3 text-center text-cyan-300">
                {formatVal(summary?.minimum.coldTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-slate-200 font-semibold">
                {formatVal(summary?.average.coldTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-cyan-400">
                {formatVal(summary?.maximum.coldTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-slate-100 font-bold">
                {formatVal(summary?.latest.coldTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-slate-800/30 transition">
              <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                Hot Compartment
              </td>
              <td className="py-3 px-3 text-center text-orange-300">
                {formatVal(summary?.minimum.hotTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-slate-200 font-semibold">
                {formatVal(summary?.average.hotTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-orange-400">
                {formatVal(summary?.maximum.hotTemperature, '°C')}
              </td>
              <td className="py-3 px-3 text-center text-slate-100 font-bold">
                {formatVal(summary?.latest.hotTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-slate-800/30 transition">
              <td className="py-3 px-3 font-sans font-medium text-slate-200 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Relative Humidity
              </td>
              <td className="py-3 px-3 text-center text-blue-300">
                {formatVal(summary?.minimum.humidity, '%')}
              </td>
              <td className="py-3 px-3 text-center text-slate-200 font-semibold">
                {formatVal(summary?.average.humidity, '%')}
              </td>
              <td className="py-3 px-3 text-center text-blue-400">
                {formatVal(summary?.maximum.humidity, '%')}
              </td>
              <td className="py-3 px-3 text-center text-slate-100 font-bold">
                {formatVal(summary?.latest.humidity, '%')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dataset Range Metadata */}
      <div className="pt-2 border-t border-slate-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-500" />
          <span>
            First Recorded Reading: <strong className="text-slate-300">{formatDate(summary?.firstReadingTimestamp)}</strong>
          </span>
        </div>
        <div>
          <span>
            Latest Recorded Reading: <strong className="text-slate-300">{formatDate(summary?.latestReadingTimestamp)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
