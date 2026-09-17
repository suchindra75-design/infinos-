import React from 'react';
import { BarChart3, Database, Calendar, AlertOctagon, TrendingUp, ThermometerSnowflake, Flame, Droplets } from 'lucide-react';
import { AnalyticsSummary, FieldSummary } from '../types';

interface AnalyticsSummaryProps {
  summary: AnalyticsSummary | null;
  isLoading: boolean;
}

interface ProcessedMetricRow {
  key: string;
  label: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
  min: number | null;
  avg: number | null;
  max: number | null;
  latest: number | null;
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

  // Process rows dynamically based on summary.fieldSummaries or fallback to legacy latest/minimum/maximum/average
  let rows: ProcessedMetricRow[] = [];

  if (summary?.fieldSummaries && typeof summary.fieldSummaries === 'object' && Object.keys(summary.fieldSummaries).length > 0) {
    const list = Object.values(summary.fieldSummaries) as FieldSummary[];
    list.sort((a, b) => (a.fieldNumber || 1) - (b.fieldNumber || 1));

    rows = list.map((fs) => {
      const lower = fs.label.toLowerCase();
      let color = '#a855f7';
      let icon = <TrendingUp className="w-3.5 h-3.5" />;

      if (fs.zone === 'cold' || (fs.metric === 'temperature' && lower.includes('cold'))) {
        color = '#00a3ff';
        icon = <ThermometerSnowflake className="w-3.5 h-3.5" />;
      } else if (fs.zone === 'hot' || (fs.metric === 'temperature' && lower.includes('hot'))) {
        color = '#ff6b00';
        icon = <Flame className="w-3.5 h-3.5" />;
      } else if (fs.metric === 'humidity' || lower.includes('humid')) {
        color = '#38bdf8';
        icon = <Droplets className="w-3.5 h-3.5" />;
      }

      return {
        key: fs.fieldKey,
        label: fs.label,
        unit: fs.unit || (fs.metric === 'temperature' ? '°C' : fs.metric === 'humidity' ? '%' : ''),
        color,
        icon,
        min: fs.minimum,
        avg: fs.average,
        max: fs.maximum,
        latest: fs.latest,
      };
    });
  } else if (summary) {
    rows = [
      {
        key: 'cold',
        label: 'Cold Compartment',
        unit: '°C',
        color: '#00a3ff',
        icon: <ThermometerSnowflake className="w-3.5 h-3.5" />,
        min: summary.minimum.coldTemperature,
        avg: summary.average.coldTemperature,
        max: summary.maximum.coldTemperature,
        latest: summary.latest.coldTemperature,
      },
      {
        key: 'hot',
        label: 'Hot Compartment',
        unit: '°C',
        color: '#ff6b00',
        icon: <Flame className="w-3.5 h-3.5" />,
        min: summary.minimum.hotTemperature,
        avg: summary.average.hotTemperature,
        max: summary.maximum.hotTemperature,
        latest: summary.latest.hotTemperature,
      },
      {
        key: 'humidity',
        label: 'Relative Humidity',
        unit: '%',
        color: '#38bdf8',
        icon: <Droplets className="w-3.5 h-3.5" />,
        min: summary.minimum.humidity,
        avg: summary.average.humidity,
        max: summary.maximum.humidity,
        latest: summary.latest.humidity,
      },
    ];
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
        {rows.map((row) => (
          <div key={row.key} className="bg-[#07080a] border border-white/[0.06] rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/[0.04]" style={{ color: row.color }}>
              {row.icon}
              <span className="text-xs font-semibold text-zinc-200 font-display">{row.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 text-center">
              <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
                <div className="text-[9px] uppercase text-zinc-500 font-display">Min</div>
                <div className="text-xs font-data font-semibold" style={{ color: row.color }}>
                  {formatVal(row.min, row.unit)}
                </div>
              </div>
              <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
                <div className="text-[9px] uppercase text-zinc-500 font-display">Avg</div>
                <div className="text-xs font-data font-semibold text-zinc-200">
                  {formatVal(row.avg, row.unit)}
                </div>
              </div>
              <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
                <div className="text-[9px] uppercase text-zinc-500 font-display">Max</div>
                <div className="text-xs font-data font-semibold" style={{ color: row.color }}>
                  {formatVal(row.max, row.unit)}
                </div>
              </div>
              <div className="bg-[#0e1014] p-1.5 rounded border border-white/[0.04]">
                <div className="text-[9px] uppercase text-zinc-500 font-display">Latest</div>
                <div className="text-xs font-data font-bold text-white">
                  {formatVal(row.latest, row.unit)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto rounded-lg border border-white/[0.06]">
        <table className="w-full text-left text-xs text-zinc-300">
          <thead className="bg-[#07080a] text-zinc-400 uppercase tracking-wider text-[10px] font-display border-b border-white/[0.08]">
            <tr>
              <th className="py-2.5 px-3 font-bold">Compartment / Field</th>
              <th className="py-2.5 px-3 font-bold text-center">Minimum</th>
              <th className="py-2.5 px-3 font-bold text-center">Average</th>
              <th className="py-2.5 px-3 font-bold text-center">Maximum</th>
              <th className="py-2.5 px-3 font-bold text-center">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04] font-data bg-[#0b0c10]">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-white/[0.02] transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]">
                <td className="py-2.5 px-3 font-body font-medium text-zinc-200 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </td>
                <td className="py-2.5 px-3 text-center" style={{ color: row.color }}>
                  {formatVal(row.min, row.unit)}
                </td>
                <td className="py-2.5 px-3 text-center text-zinc-200 font-medium">
                  {formatVal(row.avg, row.unit)}
                </td>
                <td className="py-2.5 px-3 text-center" style={{ color: row.color }}>
                  {formatVal(row.max, row.unit)}
                </td>
                <td className="py-2.5 px-3 text-center text-white font-bold">
                  {formatVal(row.latest, row.unit)}
                </td>
              </tr>
            ))}
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
