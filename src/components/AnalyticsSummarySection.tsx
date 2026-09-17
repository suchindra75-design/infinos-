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

  let rows: ProcessedMetricRow[] = [];

  if (summary?.fieldSummaries && typeof summary.fieldSummaries === 'object' && Object.keys(summary.fieldSummaries).length > 0) {
    const list = Object.values(summary.fieldSummaries) as FieldSummary[];
    list.sort((a, b) => (a.fieldNumber || 1) - (b.fieldNumber || 1));

    rows = list.map((fs) => {
      const lower = fs.label.toLowerCase();
      let color = '#8B5CF6';
      let icon = <TrendingUp className="w-4 h-4" />;

      if (fs.zone === 'cold' || (fs.metric === 'temperature' && lower.includes('cold'))) {
        color = '#0284C7';
        icon = <ThermometerSnowflake className="w-4 h-4" />;
      } else if (fs.zone === 'hot' || (fs.metric === 'temperature' && lower.includes('hot'))) {
        color = '#FC4731';
        icon = <Flame className="w-4 h-4" />;
      } else if (fs.metric === 'humidity' || lower.includes('humid')) {
        color = '#0EA5E9';
        icon = <Droplets className="w-4 h-4" />;
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
        color: '#0284C7',
        icon: <ThermometerSnowflake className="w-4 h-4" />,
        min: summary.minimum.coldTemperature,
        avg: summary.average.coldTemperature,
        max: summary.maximum.coldTemperature,
        latest: summary.latest.coldTemperature,
      },
      {
        key: 'hot',
        label: 'Hot Compartment',
        unit: '°C',
        color: '#FC4731',
        icon: <Flame className="w-4 h-4" />,
        min: summary.minimum.hotTemperature,
        avg: summary.average.hotTemperature,
        max: summary.maximum.hotTemperature,
        latest: summary.latest.hotTemperature,
      },
      {
        key: 'humidity',
        label: 'Relative Humidity',
        unit: '%',
        color: '#0EA5E9',
        icon: <Droplets className="w-4 h-4" />,
        min: summary.minimum.humidity,
        avg: summary.average.humidity,
        max: summary.maximum.humidity,
        latest: summary.latest.humidity,
      },
    ];
  }

  return (
    <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md shadow-[#171512]/04">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#FC4731] shrink-0" />
          <h3 className="text-xs sm:text-xs font-bold uppercase tracking-widest text-[#171512] font-display">
            PostgreSQL Telemetry Analytics
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-[#7B746A] font-body">
          <span className="flex items-center gap-1.5 bg-[#F2ECE0] px-3 py-1 rounded-xl border border-[#171512]/06">
            <Database className="w-3.5 h-3.5 text-[#FC4731] shrink-0" />
            <span>Readings:</span>
            <strong className="text-[#171512] font-data font-bold">
              {summary?.readingCount ?? 0}
            </strong>
          </span>
          {summary && summary.activeAlertsCount > 0 && (
            <span className="flex items-center gap-1.5 text-[#E11D48] font-bold font-body bg-[#E11D48]/10 border border-[#E11D48]/20 px-3 py-1 rounded-xl text-xs">
              <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
              {summary.activeAlertsCount} Active Alerts
            </span>
          )}
        </div>
      </div>

      {/* Mobile Card View (< 640px) */}
      <div className="sm:hidden space-y-3 font-body">
        {rows.map((row) => (
          <div key={row.key} className="bg-[#F2ECE0]/60 border border-[#171512]/06 rounded-xl p-3.5">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#171512]/06" style={{ color: row.color }}>
              {row.icon}
              <span className="text-xs font-bold text-[#171512] font-display">{row.label}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-[#FFF9EF] p-2 rounded-lg border border-[#171512]/05">
                <div className="text-[9px] uppercase font-bold text-[#7B746A] font-display">Min</div>
                <div className="text-xs font-data font-bold" style={{ color: row.color }}>
                  {formatVal(row.min, row.unit)}
                </div>
              </div>
              <div className="bg-[#FFF9EF] p-2 rounded-lg border border-[#171512]/05">
                <div className="text-[9px] uppercase font-bold text-[#7B746A] font-display">Avg</div>
                <div className="text-xs font-data font-bold text-[#171512]">
                  {formatVal(row.avg, row.unit)}
                </div>
              </div>
              <div className="bg-[#FFF9EF] p-2 rounded-lg border border-[#171512]/05">
                <div className="text-[9px] uppercase font-bold text-[#7B746A] font-display">Max</div>
                <div className="text-xs font-data font-bold" style={{ color: row.color }}>
                  {formatVal(row.max, row.unit)}
                </div>
              </div>
              <div className="bg-[#FFF9EF] p-2 rounded-lg border border-[#171512]/05">
                <div className="text-[9px] uppercase font-bold text-[#7B746A] font-display">Latest</div>
                <div className="text-xs font-data font-extrabold text-[#171512]">
                  {formatVal(row.latest, row.unit)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Table View (>= 640px) */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-[#171512]/08">
        <table className="w-full text-left text-xs text-[#171512]">
          <thead className="bg-[#F2ECE0] text-[#7B746A] uppercase tracking-wider text-[10px] font-display border-b border-[#171512]/08">
            <tr>
              <th className="py-3 px-4 font-bold">Compartment / Field</th>
              <th className="py-3 px-4 font-bold text-center">Minimum</th>
              <th className="py-3 px-4 font-bold text-center">Average</th>
              <th className="py-3 px-4 font-bold text-center">Maximum</th>
              <th className="py-3 px-4 font-bold text-center">Latest</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171512]/06 font-data bg-[#FFF9EF]">
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-[#F2ECE0]/50 transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]">
                <td className="py-3 px-4 font-body font-bold text-[#171512] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                  {row.label}
                </td>
                <td className="py-3 px-4 text-center font-semibold" style={{ color: row.color }}>
                  {formatVal(row.min, row.unit)}
                </td>
                <td className="py-3 px-4 text-center text-[#171512] font-semibold">
                  {formatVal(row.avg, row.unit)}
                </td>
                <td className="py-3 px-4 text-center font-semibold" style={{ color: row.color }}>
                  {formatVal(row.max, row.unit)}
                </td>
                <td className="py-3 px-4 text-center text-[#171512] font-extrabold">
                  {formatVal(row.latest, row.unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dataset Range Metadata */}
      <div className="pt-3 border-t border-[#171512]/08 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#7B746A] gap-2 font-body">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#7B746A] shrink-0" />
          <span>
            First Record: <strong className="text-[#171512] font-data font-semibold">{formatDate(summary?.firstReadingTimestamp)}</strong>
          </span>
        </div>
        <div>
          <span>
            Latest Record: <strong className="text-[#171512] font-data font-semibold">{formatDate(summary?.latestReadingTimestamp)}</strong>
          </span>
        </div>
      </div>
    </div>
  );
};
