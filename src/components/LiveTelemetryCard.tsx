import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeDevice, AnalyticsSummary, DeviceStatusResponse, SensorReading } from '../types';
import { resolveDeviceFields, getFieldValue } from '../utils/telemetry';

interface LiveTelemetryProps {
  selectedDevice: SafeDevice | null;
  summary: AnalyticsSummary | null;
  statusInfo: DeviceStatusResponse | null;
  latestReading?: SensorReading | null;
  readingsCount?: number;
  isLoading: boolean;
  error: string | null;
  onExportPdf?: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1];

const crossfadeVariants = {
  initial: { opacity: 0, y: 6 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.18, // < 200ms total transition time (--dur-base)
      ease: EASE_OUT,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.12, // snappy exit
      ease: EASE_OUT,
    },
  },
};

export const LiveTelemetryCard: React.FC<LiveTelemetryProps> = ({
  selectedDevice,
  summary,
  statusInfo,
  latestReading,
  readingsCount = 0,
  isLoading,
  error,
  onExportPdf,
}) => {
  const updatedTime = summary?.latestReadingTimestamp
    ? new Date(summary.latestReadingTimestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const fields = resolveDeviceFields(selectedDevice, summary, latestReading ? [latestReading] : []);

  const getMetricStyle = (field: ReturnType<typeof resolveDeviceFields>[0]) => {
    const labelLower = field.label.toLowerCase();
    if (field.zone === 'cold' || (field.metric === 'temperature' && labelLower.includes('cold'))) {
      return {
        icon: '❄️',
        cardBg: 'bg-gradient-to-br from-[#00a3ff]/15 to-[#00a3ff]/5 border border-[#00a3ff]/25',
        valueColor: 'text-[var(--cold)]',
      };
    }
    if (field.zone === 'hot' || (field.metric === 'temperature' && labelLower.includes('hot'))) {
      return {
        icon: '🔥',
        cardBg: 'bg-gradient-to-br from-[#ff6b35]/15 to-[#ff6b35]/5 border border-[#ff6b35]/25',
        valueColor: 'text-[var(--hot)]',
      };
    }
    if (field.metric === 'humidity' || labelLower.includes('humid')) {
      return {
        icon: '💧',
        cardBg: 'bg-gradient-to-br from-[#38bdf8]/15 to-[#38bdf8]/5 border border-[#38bdf8]/25',
        valueColor: 'text-sky-400',
      };
    }
    if (labelLower.includes('volt') || labelLower.includes('battery')) {
      return {
        icon: '⚡',
        cardBg: 'bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/25',
        valueColor: 'text-amber-400',
      };
    }
    return {
      icon: '📊',
      cardBg: 'bg-gradient-to-br from-purple-500/15 to-purple-500/5 border border-purple-500/25',
      valueColor: 'text-purple-400',
    };
  };

  const gridColsClass =
    fields.length === 1
      ? 'grid-cols-1'
      : fields.length === 2
      ? 'grid-cols-2'
      : fields.length === 3
      ? 'grid-cols-1 sm:grid-cols-3'
      : 'grid-cols-2 sm:grid-cols-4';

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] overflow-hidden shadow-lg shadow-black/20">
      <AnimatePresence mode="wait">
        {!selectedDevice ? (
          <motion.div
            key="empty-telemetry"
            variants={crossfadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center p-12 text-center select-none"
          >
            <div className="text-4xl mb-3 opacity-25">📡</div>
            <div className="font-display text-base font-bold mb-1 text-[var(--text)]">Select a bag to monitor</div>
            <div className="text-xs text-[var(--muted)] max-w-xs leading-relaxed">
              Tap any bag card above to view real-time temperature readings and history charts.
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={selectedDevice.id}
            variants={crossfadeVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {/* Monitor Header */}
            <div className="p-3.5 sm:px-[18px] border-b border-[var(--border)] bg-[var(--surface2)] flex flex-wrap items-center justify-between gap-2.5">
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-[0.875rem] text-[var(--text)] flex items-center gap-1.5 min-w-0">
                  <span className="truncate min-w-0" title={selectedDevice.name}>🔴 Live: {selectedDevice.name}</span>
                </div>
                <div className="text-[0.68rem] text-[var(--muted)] mt-0.5 font-body truncate min-w-0">
                  Code: {selectedDevice.deviceCode} · Channel {selectedDevice.thingSpeakChannelId} · Auto-refresh every 15s
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-1.2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-live-blink" />
                  <span>LIVE</span>
                </div>
                {onExportPdf && (
                  <button
                    onClick={onExportPdf}
                    className="px-2.5 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--border-strong)] active:scale-[0.97] text-[0.7rem] cursor-pointer transition-[transform,color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  >
                    Download PDF
                  </button>
                )}
              </div>
            </div>

            {/* Monitor Body */}
            <div className="p-4 sm:p-[18px_16px_20px]">
              {/* Timestamp Bar */}
              <div className="flex items-center flex-wrap gap-1.5 px-2.5 py-1.5 bg-[var(--surface2)] rounded-lg text-[0.68rem] text-[var(--muted)] mb-3.5">
                <span>🕐 Updated: <strong className="text-[var(--text)] font-medium">{updatedTime}</strong></span>
                <span>·</span>
                <span>{readingsCount} readings loaded</span>
              </div>

              {/* Dynamic Big Readings Row */}
              <div className={`grid ${gridColsClass} gap-2.5 mb-4`}>
                {fields.map((field) => {
                  const val = getFieldValue(field.fieldKey, field, latestReading, summary);
                  const formattedVal = val !== null ? `${val.toFixed(2)}${field.unit}` : '—';
                  const style = getMetricStyle(field);

                  return (
                    <div
                      key={field.fieldKey}
                      className={`rounded-[11px] p-[16px_14px_14px] ${style.cardBg}`}
                    >
                      <div className="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--text)] opacity-70 flex items-center gap-1 truncate" title={field.label}>
                        <span>{style.icon}</span>
                        <span className="truncate">{field.label}</span>
                      </div>
                      <div className={`font-display text-[1.35rem] font-bold tracking-tight my-1 leading-tight ${style.valueColor}`}>
                        <motion.span
                          key={`${updatedTime}-${field.fieldKey}`}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.12, ease: EASE_OUT }}
                          className="inline-block"
                        >
                          {formattedVal}
                        </motion.span>
                      </div>
                      <div className="text-[0.65rem] opacity-60 text-[var(--muted)] truncate">
                        {field.fieldKey} · ThingSpeak
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
