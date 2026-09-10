import React, { useState, useMemo } from 'react';
import { LineChart, Calendar, AlertCircle } from 'lucide-react';
import { SensorReading } from '../types';

interface TelemetryChartProps {
  readings: SensorReading[];
  isLoading: boolean;
  timeRange: string;
  onChangeTimeRange: (range: string) => void;
  error: string | null;
}

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  isLoading,
  timeRange,
  onChangeTimeRange,
  error,
}) => {
  const [activeChannel, setActiveChannel] = useState<'all' | 'cold' | 'hot' | 'humidity'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    reading: SensorReading;
  } | null>(null);

  // SVG dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute min/max bounds for the active metric(s)
  const bounds = useMemo(() => {
    if (readings.length === 0) return { min: 0, max: 100 };

    let min = Infinity;
    let max = -Infinity;

    readings.forEach((r) => {
      if (activeChannel === 'all' || activeChannel === 'cold') {
        if (r.coldTemperature !== null) {
          min = Math.min(min, r.coldTemperature);
          max = Math.max(max, r.coldTemperature);
        }
      }
      if (activeChannel === 'all' || activeChannel === 'hot') {
        if (r.hotTemperature !== null) {
          min = Math.min(min, r.hotTemperature);
          max = Math.max(max, r.hotTemperature);
        }
      }
      if (activeChannel === 'all' || activeChannel === 'humidity') {
        if (r.humidity !== null) {
          min = Math.min(min, r.humidity);
          max = Math.max(max, r.humidity);
        }
      }
    });

    if (min === Infinity || max === -Infinity) {
      return { min: 0, max: 100 };
    }

    // Add padding to bounds
    const span = Math.max(max - min, 10);
    return {
      min: Math.floor(min - span * 0.1),
      max: Math.ceil(max + span * 0.1),
    };
  }, [readings, activeChannel]);

  // Coordinate scales
  const getX = (index: number) => {
    if (readings.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (readings.length - 1)) * chartWidth;
  };

  const getY = (val: number | null) => {
    if (val === null) return null;
    const ratio = (val - bounds.min) / (bounds.max - bounds.min || 1);
    return padding.top + chartHeight - ratio * chartHeight;
  };

  // Generate SVG path for a metric
  const generatePath = (metricKey: 'coldTemperature' | 'hotTemperature' | 'humidity') => {
    let d = '';
    let isDrawing = false;

    readings.forEach((r, idx) => {
      const val = r[metricKey];
      if (val !== null) {
        const x = getX(idx);
        const y = getY(val)!;
        if (!isDrawing) {
          d += `M ${x} ${y}`;
          isDrawing = true;
        } else {
          d += ` L ${x} ${y}`;
        }
      } else {
        isDrawing = false;
      }
    });

    return d;
  };

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-4 sm:p-5 space-y-4 shadow-sm">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[var(--orange)]" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text)] font-display">
            Compartment Telemetry History
          </h3>
          <span className="text-xs text-[var(--muted)] font-data">
            ({readings.length} pts)
          </span>
        </div>

        {/* Time Range Selector & Metric Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Channel Filters */}
          <div className="flex items-center bg-[var(--surface2)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-body">
            <button
              onClick={() => setActiveChannel('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                activeChannel === 'all'
                  ? 'bg-[var(--surface)] text-[var(--text)] shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveChannel('cold')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                activeChannel === 'cold'
                  ? 'bg-[var(--cold)]/20 text-[var(--cold)] font-bold'
                  : 'text-[var(--cold)] hover:opacity-80'
              }`}
            >
              Cold
            </button>
            <button
              onClick={() => setActiveChannel('hot')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                activeChannel === 'hot'
                  ? 'bg-[var(--hot)]/20 text-[var(--hot)] font-bold'
                  : 'text-[var(--hot)] hover:opacity-80'
              }`}
            >
              Hot
            </button>
            <button
              onClick={() => setActiveChannel('humidity')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                activeChannel === 'humidity'
                  ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                  : 'text-emerald-400 hover:opacity-80'
              }`}
            >
              Humidity
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[var(--surface2)] p-0.5 rounded-lg border border-[var(--border)] text-xs font-body">
            <button
              onClick={() => onChangeTimeRange('1h')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '1h'
                  ? 'bg-[var(--orange)] text-white font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => onChangeTimeRange('6h')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '6h'
                  ? 'bg-[var(--orange)] text-white font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              6h
            </button>
            <button
              onClick={() => onChangeTimeRange('24h')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-[var(--orange)] text-white font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => onChangeTimeRange('7d')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-[var(--orange)] text-white font-bold shadow-xs'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              7d
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {error ? (
        <div className="h-64 flex items-center justify-center text-[var(--red)] text-sm gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>Failed to load timeseries data: {error}</span>
        </div>
      ) : readings.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-[var(--muted)] text-sm gap-2">
          <Calendar className="w-8 h-8 text-[var(--muted)]/60" />
          <span className="font-body">No sensor readings recorded for this bag within the selected time window.</span>
          <span className="text-xs text-[var(--muted)] font-body">
            Telemetry is synchronized automatically from ThingSpeak to PostgreSQL.
          </span>
        </div>
      ) : (
        <div className="relative overflow-hidden w-full">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <defs>
              <linearGradient id="hotGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff6b35" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#ff6b35" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="coldGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding.top + ratio * chartHeight;
              const val = bounds.max - ratio * (bounds.max - bounds.min);
              return (
                <g key={ratio}>
                  <line
                    x1={padding.left}
                    y1={y}
                    x2={width - padding.right}
                    y2={y}
                    stroke="var(--border)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[var(--muted)] font-data"
                  >
                    {val.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Timestamps on X-Axis */}
            {readings.length > 0 && (
              <>
                <text
                  x={padding.left}
                  y={height - 12}
                  textAnchor="start"
                  className="text-[10px] fill-[var(--muted)] font-data"
                >
                  {new Date(readings[0].recordedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </text>
                {readings.length > 1 && (
                  <text
                    x={width - padding.right}
                    y={height - 12}
                    textAnchor="end"
                    className="text-[10px] fill-[var(--muted)] font-data"
                  >
                    {new Date(readings[readings.length - 1].recordedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </text>
                )}
              </>
            )}

            {/* Cold Line */}
            {(activeChannel === 'all' || activeChannel === 'cold') && (
              <path
                d={generatePath('coldTemperature')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hot Line */}
            {(activeChannel === 'all' || activeChannel === 'hot') && (
              <path
                d={generatePath('hotTemperature')}
                fill="none"
                stroke="#ff6b35"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Humidity Line */}
            {(activeChannel === 'all' || activeChannel === 'humidity') && (
              <path
                d={generatePath('humidity')}
                fill="none"
                stroke="#34d399"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Points / Hover Triggers */}
            {readings.map((r, idx) => {
              const x = getX(idx);
              return (
                <rect
                  key={r.id || idx}
                  x={x - (chartWidth / readings.length) / 2}
                  y={padding.top}
                  width={chartWidth / readings.length}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => {
                    setHoveredPoint({
                      index: idx,
                      x,
                      y: padding.top,
                      reading: r,
                    });
                  }}
                />
              );
            })}

            {/* Active Hover Indicator Line */}
            {hoveredPoint && (
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + chartHeight}
                stroke="rgba(255, 107, 0, 0.4)"
                strokeWidth={1.5}
                strokeDasharray="3 3"
              />
            )}
          </svg>

          {/* Hover Tooltip Popup */}
          {hoveredPoint && (
            <div
              className="absolute z-20 bg-[#08090b]/95 border border-white/[0.12] rounded-lg p-3 shadow-2xl pointer-events-none text-xs text-zinc-200 backdrop-blur-md"
              style={{
                left: Math.min(Math.max(hoveredPoint.x - 70, 10), width - 180),
                top: 10,
              }}
            >
              <div className="font-semibold text-zinc-300 pb-1 mb-1.5 border-b border-white/[0.08] font-body text-[11px]">
                {new Date(hoveredPoint.reading.recordedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              <div className="space-y-1 font-data text-xs">
                <div className="flex items-center justify-between gap-4 text-[#00a3ff]">
                  <span>Cold Temp:</span>
                  <strong>
                    {hoveredPoint.reading.coldTemperature !== null
                      ? `${hoveredPoint.reading.coldTemperature.toFixed(1)}°C`
                      : '—'}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4 text-[#ff6b00]">
                  <span>Hot Temp:</span>
                  <strong>
                    {hoveredPoint.reading.hotTemperature !== null
                      ? `${hoveredPoint.reading.hotTemperature.toFixed(1)}°C`
                      : '—'}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-4 text-sky-400">
                  <span>Humidity:</span>
                  <strong>
                    {hoveredPoint.reading.humidity !== null
                      ? `${hoveredPoint.reading.humidity.toFixed(1)}%`
                      : '—'}
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Chart Legend */}
      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-center gap-6 text-xs text-zinc-400 font-body">
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#00a3ff] rounded-full" />
          <span>Cold Compartment (°C)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-[#ff6b00] rounded-full" />
          <span>Hot Compartment (°C)</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-sky-400 rounded-full" />
          <span>Relative Humidity (%)</span>
        </span>
      </div>
    </div>
  );
};
