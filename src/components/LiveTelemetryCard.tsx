import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SafeDevice, AnalyticsSummary, DeviceStatusResponse, SensorReading } from '../types';
import { resolveDeviceFields, getFieldValue } from '../utils/telemetry';
import { WaveformCanvas } from './WaveformCanvas';

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
      duration: 0.18,
      ease: EASE_OUT,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.12,
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
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);

  const updatedTime = summary?.latestReadingTimestamp
    ? new Date(summary.latestReadingTimestamp).toLocaleTimeString()
    : new Date().toLocaleTimeString();

  const fields = resolveDeviceFields(selectedDevice, summary, latestReading ? [latestReading] : []);
  const activeField = fields.find((f) => f.fieldKey === selectedFieldKey) || fields[0] || null;

  const activeVal = activeField ? getFieldValue(activeField.fieldKey, activeField, latestReading, summary) : null;
  const hasActiveAlert = summary?.activeAlertsCount ? summary.activeAlertsCount > 0 : false;

  const getMetricStyle = (field: ReturnType<typeof resolveDeviceFields>[0]) => {
    const labelLower = field.label.toLowerCase();
    if (field.zone === 'cold' || (field.metric === 'temperature' && labelLower.includes('cold'))) {
      return {
        icon: '❄️',
        cardBg: 'bg-[#0284C7]/05 border-[#0284C7]/20 hover:border-[#0284C7]/40',
        activeBg: 'bg-[#0284C7]/10 border-[#0284C7] shadow-xs',
        valueColor: 'text-[#0284C7]',
      };
    }
    if (field.zone === 'hot' || (field.metric === 'temperature' && labelLower.includes('hot'))) {
      return {
        icon: '🔥',
        cardBg: 'bg-[#FC4731]/05 border-[#FC4731]/20 hover:border-[#FC4731]/40',
        activeBg: 'bg-[#FC4731]/10 border-[#FC4731] shadow-xs',
        valueColor: 'text-[#FC4731]',
      };
    }
    if (field.metric === 'humidity' || labelLower.includes('humid')) {
      return {
        icon: '💧',
        cardBg: 'bg-[#0EA5E9]/05 border-[#0EA5E9]/20 hover:border-[#0EA5E9]/40',
        activeBg: 'bg-[#0EA5E9]/10 border-[#0EA5E9] shadow-xs',
        valueColor: 'text-[#0EA5E9]',
      };
    }
    return {
      icon: '📊',
      cardBg: 'bg-[#8B5CF6]/05 border-[#8B5CF6]/20 hover:border-[#8B5CF6]/40',
      activeBg: 'bg-[#8B5CF6]/10 border-[#8B5CF6] shadow-xs',
      valueColor: 'text-purple-600',
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
    <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl overflow-hidden shadow-md shadow-[#171512]/04">
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
            <div className="text-4xl mb-3 opacity-30">📡</div>
            <div className="font-editorial text-2xl font-bold mb-1 text-[#171512]">Select a bag to monitor</div>
            <div className="text-xs text-[#7B746A] max-w-xs leading-relaxed font-body">
              Tap any bag card above to view real-time telemetry waveforms and chronological history.
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
            <div className="p-4 sm:px-6 border-b border-[#171512]/08 bg-[#F2ECE0]/60 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-editorial text-lg sm:text-xl font-bold text-[#171512] truncate" title={selectedDevice.name}>
                    {selectedDevice.name}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-[#171512]/06 text-[10px] font-mono font-bold text-[#7B746A]">
                    {selectedDevice.deviceCode}
                  </span>
                </div>
                <div className="text-xs text-[#7B746A] mt-0.5 font-body truncate min-w-0">
                  Channel {selectedDevice.thingSpeakChannelId} · Syncs every 15s · PostgreSQL Persisted
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {(() => {
                  const currentStatus = statusInfo?.status || selectedDevice.status;
                  if (currentStatus === 'ONLINE') {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[#10B981] text-[10px] font-bold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-live-blink" />
                        <span>ONLINE</span>
                      </div>
                    );
                  }
                  if (currentStatus === 'STALE') {
                    return (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-600 text-[10px] font-bold tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        <span>STALE</span>
                      </div>
                    );
                  }
                  return (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#7B746A]/10 border border-[#7B746A]/20 text-[#7B746A] text-[10px] font-bold tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7B746A]" />
                      <span>OFFLINE</span>
                    </div>
                  );
                })()}
                {onExportPdf && (
                  <button
                    onClick={onExportPdf}
                    className="px-3 py-1 rounded-full border border-[#171512]/15 bg-[#FFF9EF] text-[#171512] hover:bg-[#F2ECE0] active:scale-[0.97] text-xs font-semibold cursor-pointer transition-[transform,background-color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  >
                    Export PDF
                  </button>
                )}
              </div>
            </div>

            {/* Monitor Body */}
            <div className="p-4 sm:p-6 space-y-4">
              {/* Signature Organic Waveform Display (Waveform 1, 2, 3, 4) */}
              <div className="relative bg-[#F8F3E8] border border-[#171512]/08 rounded-xl p-3 sm:p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FC4731]" />
                    <span className="text-xs font-bold uppercase tracking-widest text-[#171512] font-display">
                      {activeField ? activeField.label : 'Telemetry Waveform'}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-[#7B746A]">
                    Updated: {updatedTime}
                  </span>
                </div>

                {/* Animated Organic Canvas Waveform */}
                <WaveformCanvas
                  fieldKey={activeField?.fieldKey}
                  metricType={activeField?.metric}
                  zoneType={activeField?.zone}
                  latestValue={activeVal}
                  hasAlert={hasActiveAlert}
                  isUpdating={isLoading}
                  height={65}
                />
              </div>

              {/* Dynamic Telemetry Metric Cards */}
              <div className={`grid ${gridColsClass} gap-3`}>
                {fields.map((field) => {
                  const val = getFieldValue(field.fieldKey, field, latestReading, summary);
                  const formattedVal = val !== null ? val.toFixed(2) : '—';
                  const style = getMetricStyle(field);
                  const isSelected = activeField?.fieldKey === field.fieldKey;

                  return (
                    <div
                      key={field.fieldKey}
                      onClick={() => setSelectedFieldKey(field.fieldKey)}
                      className={`rounded-xl p-4 cursor-pointer border transition-[transform,border-color,background-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.98] ${
                        isSelected ? style.activeBg : `${style.cardBg} bg-[#FFF9EF]`
                      }`}
                    >
                      <div className="text-xs font-bold uppercase tracking-wider text-[#7B746A] flex items-center justify-between mb-1 truncate" title={field.label}>
                        <span className="truncate flex items-center gap-1">
                          <span>{style.icon}</span>
                          <span className="truncate">{field.label}</span>
                        </span>
                        <span className="text-[10px] font-mono text-[#7B746A]/70">{field.fieldKey}</span>
                      </div>

                      <div className={`font-data text-2xl sm:text-3xl font-bold tracking-tight my-1 leading-none ${style.valueColor}`}>
                        <motion.span
                          key={`${updatedTime}-${field.fieldKey}`}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.12, ease: EASE_OUT }}
                          className="inline-block"
                        >
                          {formattedVal}
                        </motion.span>
                        <span className="text-xs font-medium text-[#7B746A] ml-1">{field.unit}</span>
                      </div>

                      <div className="text-[10px] text-[#7B746A] font-body truncate mt-2 border-t border-[#171512]/05 pt-1.5 flex justify-between">
                        <span>ThingSpeak Feed</span>
                        <span className="font-semibold text-[#171512]">Active</span>
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
