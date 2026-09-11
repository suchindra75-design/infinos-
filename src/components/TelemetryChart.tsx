import React, { useState, useMemo, useRef } from 'react';
import { LineChart, Calendar, AlertCircle } from 'lucide-react';
import { SensorReading, DeviceFieldMapping } from '../types';

interface TelemetryChartProps {
  readings: SensorReading[];
  isLoading: boolean;
  timeRange: string;
  onChangeTimeRange: (range: string) => void;
  error: string | null;
  fieldMappings?: DeviceFieldMapping[] | null;
}

interface SeriesDef {
  key: string;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  getValue: (r: SensorReading) => number | null;
}

const COLOR_PALETTE = [
  '#00a3ff', // blue
  '#ff6b00', // orange
  '#38bdf8', // sky blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6366f1', // indigo
];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  isLoading,
  timeRange,
  onChangeTimeRange,
  error,
  fieldMappings,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('all');
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
  const padding = { top: 25, right: 25, bottom: 35, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Build series definitions based on fieldMappings or fallback to legacy 3 metrics
  const seriesDefs: SeriesDef[] = useMemo(() => {
    if (fieldMappings && fieldMappings.length > 0) {
      return fieldMappings.map((m, idx) => {
        let color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
        if (m.zone === 'cold') color = '#00a3ff';
        else if (m.zone === 'hot') color = '#ff6b00';
        else if (m.metric === 'humidity') color = '#38bdf8';
        else if (m.zone === 'ambient') color = '#10b981';

        const unit = m.unit || (m.metric === 'temperature' ? '°C' : m.metric === 'humidity' ? '%' : '');

        return {
          key: m.fieldKey,
          label: m.label,
          unit,
          color,
          gradientId: `gradient_${m.fieldKey}`,
          getValue: (r: SensorReading) => {
            if (r.fieldValues && r.fieldValues[m.fieldKey] !== undefined && r.fieldValues[m.fieldKey] !== null) {
              return r.fieldValues[m.fieldKey];
            }
            if (m.zone === 'cold') return r.coldTemperature;
            if (m.zone === 'hot') return r.hotTemperature;
            if (m.metric === 'humidity') return r.humidity;
            return null;
          },
        };
      });
    }

    return [
      {
        key: 'cold',
        label: 'Cold',
        unit: '°C',
        color: '#00a3ff',
        gradientId: 'coldGradient',
        getValue: (r: SensorReading) => r.coldTemperature,
      },
      {
        key: 'hot',
        label: 'Hot',
        unit: '°C',
        color: '#ff6b00',
        gradientId: 'hotGradient',
        getValue: (r: SensorReading) => r.hotTemperature,
      },
      {
        key: 'humidity',
        label: 'Humidity',
        unit: '%',
        color: '#38bdf8',
        gradientId: 'humidityGradient',
        getValue: (r: SensorReading) => r.humidity,
      },
    ];
  }, [fieldMappings]);

  // Reset active channel filter if current selection is invalid
  const validActiveChannel = useMemo(() => {
    if (activeChannel === 'all') return 'all';
    const exists = seriesDefs.some((s) => s.key === activeChannel);
    return exists ? activeChannel : 'all';
  }, [activeChannel, seriesDefs]);

  // Compute min/max bounds for the active series
  const bounds = useMemo(() => {
    if (readings.length === 0) return { min: 0, max: 100 };

    let min = Infinity;
    let max = -Infinity;

    readings.forEach((r) => {
      seriesDefs.forEach((s) => {
        if (validActiveChannel === 'all' || validActiveChannel === s.key) {
          const val = s.getValue(r);
          if (val !== null) {
            min = Math.min(min, val);
            max = Math.max(max, val);
          }
        }
      });
    });

    if (min === Infinity || max === -Infinity) {
      return { min: 0, max: 100 };
    }

    const span = Math.max(max - min, 10);
    return {
      min: Math.floor(min - span * 0.1),
      max: Math.ceil(max + span * 0.1),
    };
  }, [readings, seriesDefs, validActiveChannel]);

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

  // Generate SVG path for a series
  const generatePath = (s: SeriesDef) => {
    let d = '';
    let isDrawing = false;

    readings.forEach((r, idx) => {
      const val = s.getValue(r);
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

  // Generate SVG gradient area path under line
  const generateAreaPath = (s: SeriesDef) => {
    const linePath = generatePath(s);
    if (!linePath) return '';
    const lastX = getX(readings.length - 1);
    const firstX = getX(0);
    const bottomY = padding.top + chartHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  };

  const latestIndex = readings.length - 1;
  const latestX = readings.length > 0 ? getX(latestIndex) : 0;

  return (
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-3.5 sm:p-5 space-y-3 sm:space-y-4 shadow-lg shadow-black/30 transition-all duration-300">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[#ff6b00] shrink-0" />
          <h3 className="text-xs sm:text-xs font-extrabold uppercase tracking-wider text-zinc-200 font-display">
            Compartment Telemetry History
          </h3>
          <span className="text-[10px] sm:text-xs text-zinc-500 font-data">
            ({readings.length} pts)
          </span>
        </div>

        {/* Time Range Selector & Metric Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Channel Filters */}
          <div className="flex flex-wrap items-center bg-[#07080a] p-0.5 rounded-lg border border-white/[0.08] text-[11px] sm:text-xs font-body gap-0.5">
            <button
              onClick={() => setActiveChannel('all')}
              className={`px-2.5 py-1 rounded font-medium transition-all duration-200 cursor-pointer ${
                validActiveChannel === 'all'
                  ? 'bg-zinc-800 text-white font-semibold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All
            </button>
            {seriesDefs.map((s) => {
              const isActive = validActiveChannel === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setActiveChannel(s.key)}
                  style={{
                    color: isActive ? s.color : s.color,
                    borderColor: isActive ? `${s.color}60` : 'transparent',
                    backgroundColor: isActive ? `${s.color}20` : 'transparent',
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-all duration-200 cursor-pointer border ${
                    isActive ? 'font-semibold shadow-xs opacity-100' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#07080a] p-0.5 rounded-lg border border-white/[0.08] text-[11px] sm:text-xs font-body">
            {(['1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onChangeTimeRange(range)}
                className={`px-2.5 py-1 rounded font-medium transition-all duration-200 cursor-pointer ${
                  timeRange === range
                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white font-semibold shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {range}
              </button>
            ))}
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
        <div className="relative overflow-hidden w-full touch-pan-y animate-in fade-in duration-300">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoveredPoint(null)}
            onTouchStart={handleTouch}
            onTouchMove={handleTouch}
          >
            <defs>
              {seriesDefs.map((s) => (
                <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
                </linearGradient>
              ))}
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

            {/* Gradient Area Fills */}
            {seriesDefs.map((s) => {
              const isVisible = validActiveChannel === 'all' || validActiveChannel === s.key;
              if (!isVisible) return null;
              return (
                <path
                  key={`area_${s.key}`}
                  d={generateAreaPath(s)}
                  fill={`url(#${s.gradientId})`}
                  className="transition-opacity duration-300"
                  style={{ opacity: isVisible ? 1 : 0.2 }}
                />
              );
            })}

            {/* Series Lines */}
            {seriesDefs.map((s) => {
              const isVisible = validActiveChannel === 'all' || validActiveChannel === s.key;
              if (!isVisible) return null;
              return (
                <path
                  key={`line_${s.key}`}
                  d={generatePath(s)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={validActiveChannel === s.key ? 3 : 2.4}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="chart-path-transition"
                  style={{ opacity: isVisible ? 1 : 0.2 }}
                />
              );
            })}

            {/* Live Playhead / Current Time Line */}
            {readings.length > 0 && !hoveredPoint && (
              <g className="animate-playhead">
                <line
                  x1={latestX}
                  y1={padding.top}
                  x2={latestX}
                  y2={padding.top + chartHeight}
                  stroke="rgba(255, 107, 0, 0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle cx={latestX} cy={padding.top + 4} r={3} fill="#ff6b00" />
              </g>
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
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={padding.top + chartHeight}
                  stroke="rgba(255, 107, 0, 0.7)"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              </g>
            )}
          </svg>

          {/* Hover Tooltip Popup */}
          {hoveredPoint && (
            <div
              className="absolute z-30 bg-[#08090b]/95 border border-white/[0.15] rounded-lg p-2.5 shadow-2xl pointer-events-none text-xs text-zinc-200 backdrop-blur-md max-w-[220px] transition-all duration-150 ease-out"
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
                {seriesDefs.map((s) => {
                  const val = s.getValue(hoveredPoint.reading);
                  return (
                    <div key={s.key} className="flex items-center justify-between gap-3" style={{ color: s.color }}>
                      <span className="truncate max-w-[120px]">{s.label}:</span>
                      <strong>{val !== null ? `${val.toFixed(1)}${s.unit}` : '—'}</strong>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Chart Legend */}
      <div className="pt-2 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[11px] sm:text-xs text-zinc-400 font-body">
        {seriesDefs.map((s) => {
          const isActive = validActiveChannel === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveChannel(isActive ? 'all' : s.key)}
              className="flex items-center gap-1.5 cursor-pointer transition hover:text-zinc-200"
              style={{ color: isActive ? s.color : undefined, fontWeight: isActive ? 'bold' : 'normal' }}
            >
              <span className="w-3 h-1 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.label} ({s.unit})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
