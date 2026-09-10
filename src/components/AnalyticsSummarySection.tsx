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
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4 sm:p-5 space-y-3.5 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--orange)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-display">
            PostgreSQL Telemetry Analytics
          </h3>
        </div>
        <div className="flex items-center gap-3 text-xs text-[var(--muted)] font-body">
          <span className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[var(--orange)]" />
            Total Readings:{' '}
            <strong className="text-[var(--text)] font-data font-normal">
              {summary?.readingCount ?? 0}
            </strong>
          </span>
          {summary && summary.activeAlertsCount > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--red)] font-medium font-body bg-[var(--red)]/10 border border-[var(--red)]/30 px-2 py-0.5 rounded-full text-[11px]">
              <AlertOctagon className="w-3 h-3" />
              {summary.activeAlertsCount} Active Alerts
            </span>
          )}
        </div>
      </div>

      {/* Aggregate Statistics Matrix */}
      <div className="overflow-x-auto rounded-[var(--radius-sm)] border border-[var(--border)]">
        <table className="w-full text-left text-xs text-[var(--text)]">
          <thead className="bg-[var(--surface2)] text-[var(--muted)] uppercase tracking-wider text-[10px] font-display border-b border-[var(--border)]">
            <tr>
              <th className="py-2.5 px-3 font-bold">Compartment</th>
              <th className="py-2.5 px-3 font-bold text-center">Minimum</th>
              <th className="py-2.5 px-3 font-bold text-center">Average</th>
              <th className="py-2.5 px-3 font-bold text-center">Maximum</th>
              <th className="py-2.5 px-3 font-bold text-center">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)] font-data bg-[var(--surface)]">
            <tr className="hover:bg-[var(--surface2)]/50 transition">
              <td className="py-2.5 px-3 font-body font-medium text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--cold)]" />
                Cold Compartment
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--cold)]">
                {formatVal(summary?.minimum.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-medium">
                {formatVal(summary?.average.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--cold)]">
                {formatVal(summary?.maximum.coldTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-bold">
                {formatVal(summary?.latest.coldTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-[var(--surface2)]/50 transition">
              <td className="py-2.5 px-3 font-body font-medium text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--hot)]" />
                Hot Compartment
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--hot)]">
                {formatVal(summary?.minimum.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-medium">
                {formatVal(summary?.average.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--hot)]">
                {formatVal(summary?.maximum.hotTemperature, '°C')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-bold">
                {formatVal(summary?.latest.hotTemperature, '°C')}
              </td>
            </tr>

            <tr className="hover:bg-[var(--surface2)]/50 transition">
              <td className="py-2.5 px-3 font-body font-medium text-[var(--text)] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                Relative Humidity
              </td>
              <td className="py-2.5 px-3 text-center text-[#38bdf8]">
                {formatVal(summary?.minimum.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-medium">
                {formatVal(summary?.average.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-[#38bdf8]">
                {formatVal(summary?.maximum.humidity, '%')}
              </td>
              <td className="py-2.5 px-3 text-center text-[var(--text)] font-bold">
                {formatVal(summary?.latest.humidity, '%')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Dataset Range Metadata */}
      <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[var(--muted)] gap-2 font-body">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[var(--muted)]" />
          <span>
            First Recorded Reading: <strong className="text-[var(--text)] font-data font-normal">{formatDate(summary?.firstReadingTimestamp)}</strong>
          </span>
        </div>
        <div>
          <span>
            Latest Recorded Reading: <strong className="text-[var(--text)] font-data font-normal">{formatDate(summary?.latestReadingTimestamp)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};

