import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LineChart, Calendar, AlertCircle } from 'lucide-react';
import { SensorReading, DeviceFieldMapping } from '../types';
import { resolveDeviceFields } from '../utils/telemetry';

interface TelemetryChartProps {
  readings: SensorReading[];
  isLoading: boolean;
  timeRange: string;
  onChangeTimeRange: (range: string) => void;
  error: string | null;
  fieldMappings?: DeviceFieldMapping[] | null;
  deviceId?: string;
}

interface SeriesDef {
  key: string;
  label: string;
  unit: string;
  color: string;
  gradientId: string;
  getValue: (r: SensorReading) => number | null;
}

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const COLOR_PALETTE = [
  '#FC4731', // primary orange
  '#0284C7', // cold blue
  '#0EA5E9', // humidity cyan
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#10B981', // emerald
  '#F59E0B', // amber
  '#6366F1', // indigo
];

export const TelemetryChart: React.FC<TelemetryChartProps> = ({
  readings,
  isLoading,
  timeRange,
  onChangeTimeRange,
  error,
  fieldMappings,
  deviceId,
}) => {
  const [activeChannel, setActiveChannel] = useState<string>('all');
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    reading: SensorReading;
  } | null>(null);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const isInitialRenderRef = useRef<boolean>(true);
  const prevDeviceIdRef = useRef<string | undefined>(deviceId);
  const [isInitialDraw, setIsInitialDraw] = useState<boolean>(true);
  const [animationStarted, setAnimationStarted] = useState<boolean>(false);

  useEffect(() => {
    if (prevDeviceIdRef.current !== deviceId) {
      prevDeviceIdRef.current = deviceId;
      isInitialRenderRef.current = true;
    }

    if (isInitialRenderRef.current) {
      setIsInitialDraw(true);
      setAnimationStarted(false);

      const startTimer = setTimeout(() => {
        setAnimationStarted(true);
      }, 180);

      const completeTimer = setTimeout(() => {
        setIsInitialDraw(false);
        isInitialRenderRef.current = false;
      }, 880);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(completeTimer);
      };
    }
  }, [deviceId]);

  // SVG dimensions
  const width = 800;
  const height = 260;
  const padding = { top: 25, right: 25, bottom: 35, left: 45 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Build series definitions based on resolved field mappings & discovered readings
  const seriesDefs: SeriesDef[] = useMemo(() => {
    const resolved = resolveDeviceFields(
      fieldMappings ? ({ fieldMappings } as any) : null,
      null,
      readings
    );

    return resolved.map((field, idx) => {
      let color = COLOR_PALETTE[idx % COLOR_PALETTE.length];
      if (field.zone === 'cold') color = '#0284C7';
      else if (field.zone === 'hot') color = '#FC4731';
      else if (field.metric === 'humidity') color = '#0EA5E9';

      return {
        key: field.fieldKey,
        label: field.label,
        unit: field.unit,
        color,
        gradientId: `gradient_${field.fieldKey}`,
        getValue: (r: SensorReading) => {
          if (r.fieldValues && r.fieldValues[field.fieldKey] !== undefined && r.fieldValues[field.fieldKey] !== null) {
            return toFiniteNumber(r.fieldValues[field.fieldKey]);
          }
          if (field.zone === 'cold' || (field.fieldKey === 'field1' && field.metric === 'temperature')) {
            return toFiniteNumber(r.coldTemperature);
          }
          if (field.zone === 'hot' || (field.fieldKey === 'field3' && field.metric === 'temperature')) {
            return toFiniteNumber(r.hotTemperature);
          }
          if (field.metric === 'humidity' || field.fieldKey === 'field4') {
            return toFiniteNumber(r.humidity);
          }
          return null;
        },
      };
    });
  }, [fieldMappings, readings]);

  const validActiveChannel = useMemo(() => {
    if (activeChannel === 'all') return 'all';
    const exists = seriesDefs.some((s) => s.key === activeChannel);
    return exists ? activeChannel : 'all';
  }, [activeChannel, seriesDefs]);

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

  const getX = (index: number) => {
    if (readings.length <= 1) return padding.left + chartWidth / 2;
    return padding.left + (index / (readings.length - 1)) * chartWidth;
  };

  const getY = (val: number | null) => {
    if (val === null) return null;
    const ratio = (val - bounds.min) / (bounds.max - bounds.min || 1);
    return padding.top + chartHeight - ratio * chartHeight;
  };

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
    <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md shadow-[#171512]/04 transition-[border-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-out)]">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LineChart className="w-4 h-4 text-[#FC4731] shrink-0" />
          <h3 className="text-xs sm:text-xs font-extrabold uppercase tracking-widest text-[#171512] font-display">
            Compartment Telemetry History
          </h3>
          <span className="text-xs text-[#7B746A] font-mono">
            ({readings.length} pts)
          </span>
        </div>

        {/* Time Range Selector & Channel Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Channel Filters */}
          <div className="flex flex-wrap items-center bg-[#F2ECE0] p-1 rounded-xl border border-[#171512]/06 text-xs font-body gap-1">
            <button
              onClick={() => setActiveChannel('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer ${
                validActiveChannel === 'all'
                  ? 'bg-[#171512] text-[#F8F3E8] shadow-xs'
                  : 'text-[#7B746A] hover:text-[#171512]'
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
                    color: isActive ? s.color : '#7B746A',
                    backgroundColor: isActive ? `${s.color}15` : 'transparent',
                    borderColor: isActive ? s.color : 'transparent',
                  }}
                  className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer border ${
                    isActive ? 'shadow-xs' : 'hover:text-[#171512]'
                  }`}
                >
                  {s.label}
                </button>
              );
            })}
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center bg-[#F2ECE0] p-1 rounded-xl border border-[#171512]/06 text-xs font-body">
            {(['all', '1h', '6h', '24h', '7d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => onChangeTimeRange(range)}
                className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer ${
                  timeRange === range
                    ? 'bg-[#FC4731] text-white shadow-xs'
                    : 'text-[#7B746A] hover:text-[#171512]'
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
        <div className="h-56 sm:h-64 flex items-center justify-center text-[#E11D48] text-xs sm:text-sm gap-2 p-4 text-center">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>Failed to load timeseries data: {error}</span>
        </div>
      ) : readings.length === 0 ? (
        <div className="h-56 sm:h-64 flex flex-col items-center justify-center text-[#7B746A] text-xs sm:text-sm gap-2 p-4 text-center">
          <Calendar className="w-8 h-8 text-[#7B746A]/60" />
          <span className="font-body">No sensor readings recorded for this bag within the selected time window.</span>
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
            <defs>
              {seriesDefs.map((s) => (
                <linearGradient key={s.gradientId} id={s.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.20" />
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
                    stroke="rgba(23, 21, 18, 0.06)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={padding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-[#7B746A] font-data font-medium"
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
                  className="text-[10px] fill-[#7B746A] font-data font-medium"
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
                    className="text-[10px] fill-[#7B746A] font-data font-medium"
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
              const targetOpacity = isVisible ? 1 : 0.2;
              const currentOpacity = isInitialDraw ? (animationStarted ? targetOpacity : 0) : targetOpacity;

              return (
                <path
                  key={`area_${s.key}`}
                  d={generateAreaPath(s)}
                  fill={`url(#${s.gradientId})`}
                  style={{
                    opacity: currentOpacity,
                    transition: 'opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 180ms',
                  }}
                />
              );
            })}

            {/* Series Lines */}
            {seriesDefs.map((s) => {
              const isVisible = validActiveChannel === 'all' || validActiveChannel === s.key;
              if (!isVisible) return null;
              const targetOpacity = isVisible ? 1 : 0.2;

              const lineStyle: React.CSSProperties = isInitialDraw
                ? {
                    strokeDasharray: 1000,
                    strokeDashoffset: animationStarted ? 0 : 1000,
                    opacity: targetOpacity,
                    transition:
                      'stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1) 180ms, opacity 700ms cubic-bezier(0.16, 1, 0.3, 1) 180ms',
                  }
                : {
                    opacity: targetOpacity,
                    transition: 'd 320ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms ease-out',
                  };

              return (
                <path
                  key={`line_${s.key}`}
                  d={generatePath(s)}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={validActiveChannel === s.key ? 3 : 2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={isInitialDraw ? 1000 : undefined}
                  style={lineStyle}
                />
              );
            })}

            {/* Live Playhead Line */}
            {readings.length > 0 && !hoveredPoint && (
              <g>
                <line
                  x1={latestX}
                  y1={padding.top}
                  x2={latestX}
                  y2={padding.top + chartHeight}
                  stroke="rgba(252, 71, 49, 0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="3 3"
                />
                <circle cx={latestX} cy={padding.top + 4} r={3.5} fill="#FC4731" />
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

            {/* Active Hover Line */}
            {hoveredPoint && (
              <g>
                <line
                  x1={hoveredPoint.x}
                  y1={padding.top}
                  x2={hoveredPoint.x}
                  y2={padding.top + chartHeight}
                  stroke="rgba(252, 71, 49, 0.7)"
                  strokeWidth={1.5}
                  strokeDasharray="2 2"
                />
              </g>
            )}
          </svg>

          {/* Hover Tooltip Popup */}
          {hoveredPoint && (
            <div
              className="absolute z-30 bg-[#FFF9EF]/95 border border-[#171512]/15 rounded-xl p-3 shadow-xl pointer-events-none text-xs text-[#171512] backdrop-blur-md max-w-[230px] transition-[left,top,opacity] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
              style={{
                left: `${Math.min(Math.max((hoveredPoint.x / width) * 100, 15), 75)}%`,
                top: '8px',
                transform: 'translateX(-50%)',
              }}
            >
              <div className="font-bold text-[#7B746A] pb-1 mb-1 border-b border-[#171512]/08 font-body text-[10px]">
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
                      <span className="truncate max-w-[130px]">{s.label}:</span>
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
      <div className="pt-3 border-t border-[#171512]/08 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-[#7B746A] font-body">
        {seriesDefs.map((s) => {
          const isActive = validActiveChannel === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActiveChannel(isActive ? 'all' : s.key)}
              className="flex items-center gap-2 cursor-pointer transition-[color] duration-[var(--dur-fast)] ease-[var(--ease-out)] hover:text-[#171512]"
              style={{ color: isActive ? s.color : undefined, fontWeight: isActive ? 'bold' : '500' }}
            >
              <span className="w-3 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span>{s.label}{s.unit ? ` (${s.unit})` : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
