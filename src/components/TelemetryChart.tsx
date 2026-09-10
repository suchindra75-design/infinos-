import React, { useState, useMemo, useRef } from 'react';
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

  const svgRef = useRef<SVGSVGElement | null>(null);

  // SVG dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 20, right: 25, bottom: 35, left: 45 };

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

  // Handle touch drag on mobile
  const handleTouch = (e: React.TouchEvent<SVGSVGElement>) => {
    if (!svgRef.current || readings.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const touch = e.touches[0];
    const clientX = touch.clientX - rect.left;
    const svgX = (clientX / rect.width) * width;

    // Find nearest reading
    const relativeX = svgX - padding.left;
    const ratio = Math.max(0, Math.min(1, relativeX / chartWidth));
    const index = Math.round(ratio * (readings.length - 1));

    if (readings[index]) {
      setHoveredPoint({
        index,
        x: getX(index),
        y: padding.top,
        reading: readings[index],
      });
    }
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
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-lg shadow-black/30">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <LineChart className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ff6b00] shrink-0" />
          <h3 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-300 font-display">
            Compartment Telemetry History
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500 font-data">
            ({readings.length} pts)
          </span>
        </div>

        {/* Time Range Selector & Metric Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Channel Filters */}
          <div className="flex items-center bg-[#07080a] p-0.5 rounded-lg border border-white/[0.08] text-[11px] sm:text-xs font-body">
            <button
              onClick={() => setActiveChannel('all')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeChannel === 'all'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveChannel('cold')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeChannel === 'cold'
                  ? 'bg-[#00a3ff]/20 text-[#00a3ff] border border-[#00a3ff]/40'
                  : 'text-[#00a3ff] hover:opacity-80'
              }`}
            >
              Cold
            </button>
            <button
              onClick={() => setActiveChannel('hot')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeChannel === 'hot'
                  ? 'bg-orange-500/20 text-[#ff6b00] border border-orange-500/40'
                  : 'text-orange-400 hover:opacity-80'
              }`}
            >
              Hot
            </button>
            <button
              onClick={() => setActiveChannel('humidity')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                activeChannel === 'humidity'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'text-sky-400 hover:opacity-80'
              }`}
            >
              Hum
            </button>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#07080a] p-0.5 rounded-lg border border-white/[0.08] text-[11px] sm:text-xs font-body">
            <button
              onClick={() => onChangeTimeRange('1h')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                timeRange === '1h'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              1h
            </button>
            <button
              onClick={() => onChangeTimeRange('6h')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                timeRange === '6h'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              6h
            </button>
            <button
              onClick={() => onChangeTimeRange('24h')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                timeRange === '24h'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              24h
            </button>
            <button
              onClick={() => onChangeTimeRange('7d')}
              className={`px-2 py-1 rounded font-medium transition cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7d
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {error ? (
        <div className="h-56 sm:h-64 flex items-center justify-center text-rose-400 text-xs sm:text-sm gap-2 p-4 text-center">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span>Failed to load timeseries data: {error}</span>
        </div>
      ) : readings.length === 0 ? (
        <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-zinc-500 text-xs sm:text-sm gap-2 p-4 text-center">
          <Calendar className="w-7 h-7 sm:w-8 sm:h-8 text-zinc-600" />
          <span className="font-body">No sensor readings recorded for this bag within the selected time window.</span>
          <span className="text-[11px] text-zinc-600 font-body">
            Telemetry is synchronized automatically from ThingSpeak to PostgreSQL.
          </span>
        </div>
      ) : (
        <div className="relative overflow-hidden w-full touch-pan-y">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredPoint(null)}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
          >
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
                    stroke="rgba(255, 255, 255, 0.05)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-zinc-500 font-data"
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
                  y={height - 10}
                  textAnchor="start"
                  className="text-[10px] fill-zinc-500 font-data"
                >
                  {new Date(readings[0].recordedAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </text>
                {readings.length > 1 && (
                  <text
                    x={width - padding.right}
                    y={height - 10}
                    textAnchor="end"
                    className="text-[10px] fill-zinc-500 font-data"
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
                stroke="#00a3ff"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hot Line */}
            {(activeChannel === 'all' || activeChannel === 'hot') && (
              <path
                d={generatePath('hotTemperature')}
                fill="none"
                stroke="#ff6b00"
                strokeWidth={2.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Humidity Line */}
            {(activeChannel === 'all' || activeChannel === 'humidity') && (
              <path
                d={generatePath('humidity')}
                fill="none"
                stroke="#38bdf8"
                strokeWidth={2.4}
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

          {/* Hover Tooltip Popup (Clamped) */}
          {hoveredPoint && (
            <div
              className="absolute z-30 bg-[#08090b]/95 border border-white/[0.12] rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs text-zinc-200 backdrop-blur-md max-w-[200px]"
              style={{
                left: `${Math.min(Math.max((hoveredPoint.x / width) * 100, 15), 75)}%`,
                top: '8px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-semibold text-zinc-300 pb-1 mb-1 border-b border-white/[0.08] font-body text-[10px]">
                {new Date(hoveredPoint.reading.recordedAt).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </div>
              <div className="space-y-1 font-data text-[11px]">
                <div className="flex items-center justify-between gap-3 text-[#00a3ff]">
                  <span>Cold:</span>
                  <strong>
                    {hoveredPoint.reading.coldTemperature !== null
                      ? `${hoveredPoint.reading.coldTemperature.toFixed(1)}°C`
                      : '—'}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-[#ff6b00]">
                  <span>Hot:</span>
                  <strong>
                    {hoveredPoint.reading.hotTemperature !== null
                      ? `${hoveredPoint.reading.hotTemperature.toFixed(1)}°C`
                      : '—'}
                  </strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sky-400">
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
      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] sm:text-xs text-zinc-400 font-body">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#00a3ff] rounded-full" />
          <span>Cold (°C)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-[#ff6b00] rounded-full" />
          <span>Hot (°C)</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-sky-400 rounded-full" />
          <span>Humidity (%)</span>
        </span>
      </div>
    </div>
  );
};
