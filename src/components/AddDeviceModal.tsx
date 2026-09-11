import React, { useState } from 'react';
import { X, Plus, Radio, Key, CheckCircle2, AlertCircle, RefreshCw, ChevronDown, Settings2 } from 'lucide-react';
import { api } from '../api/client';
import { CreateDeviceInput, DeviceFieldMapping } from '../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

const METRIC_OPTIONS = [
  { value: 'temperature', label: 'Temperature' },
  { value: 'humidity', label: 'Humidity' },
  { value: 'other', label: 'Other' },
] as const;

const ZONE_OPTIONS = [
  { value: 'cold', label: 'Cold' },
  { value: 'hot', label: 'Hot' },
  { value: 'ambient', label: 'Ambient' },
  { value: 'none', label: 'None' },
] as const;

const ZONE_COLORS: Record<string, string> = {
  cold: 'text-[#00a3ff] bg-[#00a3ff]/10 border-[#00a3ff]/30',
  hot: 'text-[#ff6b00] bg-orange-500/10 border-orange-500/30',
  ambient: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
  none: 'text-zinc-400 bg-zinc-800/80 border-zinc-700',
  humidity: 'text-sky-400 bg-sky-500/10 border-sky-500/30',
};

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceCreated,
}) => {
  const [deviceCode, setDeviceCode] = useState('');
  const [name, setName] = useState('');
  const [thingSpeakChannelId, setThingSpeakChannelId] = useState('');
  const [thingSpeakReadApiKey, setThingSpeakReadApiKey] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    channelName?: string;
    message: string;
    discoveredFields?: DeviceFieldMapping[];
  } | null>(null);

  // Dynamic field mappings discovered from ThingSpeak
  const [fieldMappings, setFieldMappings] = useState<DeviceFieldMapping[]>([]);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!thingSpeakChannelId.trim()) {
      setError('Enter ThingSpeak Channel ID first to test connection.');
      return;
    }
    setError(null);
    setTestResult(null);
    setIsTesting(true);
    setFieldMappings([]);
    setShowFieldConfig(false);

    try {
      const result = await api.devices.testConnection({
        thingSpeakChannelId: thingSpeakChannelId.trim(),
        thingSpeakReadApiKey: thingSpeakReadApiKey.trim() || undefined,
      });
      setTestResult(result);

      // Pre-populate discovered field mappings
      if (result.connected && result.discoveredFields && result.discoveredFields.length > 0) {
        setFieldMappings(result.discoveredFields);
        setShowFieldConfig(true);
      }
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const updateFieldMapping = (index: number, updates: Partial<DeviceFieldMapping>) => {
    setFieldMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!deviceCode.trim() || !name.trim() || !thingSpeakChannelId.trim()) {
      setError('Device Code, Name, and ThingSpeak Channel ID are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateDeviceInput = {
        deviceCode: deviceCode.trim(),
        name: name.trim(),
        thingSpeakChannelId: thingSpeakChannelId.trim(),
        thingSpeakReadApiKey: thingSpeakReadApiKey.trim() || undefined,
        fieldMappings: fieldMappings.length > 0 ? fieldMappings : undefined,
      };

      await api.devices.create(input);
      setSuccess('Smart Delivery Bag registered successfully.');

      // Clear sensitive field immediately
      setThingSpeakReadApiKey('');

      setTimeout(() => {
        onDeviceCreated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to register Smart Delivery Bag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-backdrop-fade overflow-y-auto">
      <div className="bg-[#0e1014] border border-white/[0.1] rounded-2xl w-full max-w-lg my-auto shadow-2xl shadow-black/80 animate-modal-pop overflow-hidden flex flex-col max-h-[90vh] text-zinc-200">
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00] shrink-0">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white font-display">Register Smart Bag</h3>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-body">Onboard a bag into the INFINOS fleet</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto font-body">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{success}</span>
            </div>
          )}

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                testResult.connected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              <div>
                <span className="font-semibold block">{testResult.message}</span>
                {testResult.channelName && (
                  <span className="text-[10px] text-zinc-400 font-data">Channel: {testResult.channelName}</span>
                )}
                {testResult.connected && fieldMappings.length > 0 && (
                  <span className="text-[10px] text-emerald-400 ml-2">
                    • {fieldMappings.length} field{fieldMappings.length > 1 ? 's' : ''} discovered
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Device Code */}
          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              Device Code <span className="text-[#ff6b00]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BAG-001, MED-BAG-NORTH"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
              required
            />
          </div>

          {/* Bag Name */}
          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              Bag Descriptive Name <span className="text-[#ff6b00]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cold-Chain Pharma Unit #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
              required
            />
          </div>

          {/* ThingSpeak Channel ID */}
          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Channel ID <span className="text-[#ff6b00]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 1234567"
                value={thingSpeakChannelId}
                onChange={(e) => setThingSpeakChannelId(e.target.value)}
                className="flex-1 bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2.5 sm:py-2 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
                required
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !thingSpeakChannelId}
                className="px-3.5 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-white/[0.08] transition disabled:opacity-50 shrink-0 cursor-pointer min-h-[42px] flex items-center justify-center gap-1.5"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* Optional ThingSpeak Read API Key */}
          <div>
            <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Read API Key <span className="text-zinc-500 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Encrypted server-side"
                value={thingSpeakReadApiKey}
                onChange={(e) => setThingSpeakReadApiKey(e.target.value)}
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2.5 sm:py-2 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
                autoComplete="off"
              />
              <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Protected by AES-256 server-side encryption.
            </p>
          </div>

          {/* Dynamic Field Mapping Configuration */}
          {fieldMappings.length > 0 && (
            <div className="border border-white/[0.08] rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setShowFieldConfig(!showFieldConfig)}
                className="w-full px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-200 bg-[#07080a] hover:bg-[#0d0e12] transition cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="w-3.5 h-3.5 text-[#ff6b00]" />
                  <span className="uppercase tracking-wider">Channel Field Mapping</span>
                  <span className="text-[10px] text-zinc-500 font-normal normal-case">
                    ({fieldMappings.length} field{fieldMappings.length > 1 ? 's' : ''})
                  </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${showFieldConfig ? 'rotate-180' : ''}`} />
              </button>

              {showFieldConfig && (
                <div className="p-3 space-y-2.5 bg-[#0a0b0e] border-t border-white/[0.06]">
                  <p className="text-[10px] text-zinc-500 mb-2">
                    Review discovered fields. Adjust metric type, zone, and labels as needed.
                  </p>

                  {fieldMappings.map((mapping, idx) => (
                    <div
                      key={mapping.fieldKey}
                      className="bg-[#0e1014] border border-white/[0.08] rounded-lg p-2.5 space-y-2"
                    >
                      {/* Field header */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/[0.08] font-data">
                            {mapping.fieldKey}
                          </span>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                            ZONE_COLORS[mapping.metric === 'humidity' ? 'humidity' : (mapping.zone || 'none')]
                          }`}>
                            {mapping.zone !== 'none' ? mapping.zone : mapping.metric}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 font-data">{mapping.unit}</span>
                      </div>

                      {/* Label */}
                      <input
                        type="text"
                        value={mapping.label}
                        onChange={(e) => updateFieldMapping(idx, { label: e.target.value })}
                        className="w-full bg-[#07080a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] font-data text-white focus:outline-none focus:border-[#ff6b00]"
                        placeholder="Field label"
                      />

                      {/* Metric + Zone selectors */}
                      <div className="flex gap-2">
                        <select
                          value={mapping.metric}
                          onChange={(e) => {
                            const metric = e.target.value as DeviceFieldMapping['metric'];
                            const updates: Partial<DeviceFieldMapping> = { metric };
                            if (metric === 'humidity') {
                              updates.zone = 'ambient';
                              updates.unit = '%';
                            } else if (metric === 'temperature') {
                              updates.unit = '°C';
                            } else {
                              updates.zone = 'none';
                              updates.unit = '';
                            }
                            updateFieldMapping(idx, updates);
                          }}
                          className="flex-1 bg-[#07080a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#ff6b00] cursor-pointer"
                        >
                          {METRIC_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>

                        {mapping.metric === 'temperature' && (
                          <select
                            value={mapping.zone || 'none'}
                            onChange={(e) => updateFieldMapping(idx, { zone: e.target.value as DeviceFieldMapping['zone'] })}
                            className="flex-1 bg-[#07080a] border border-white/[0.06] rounded px-2 py-1.5 text-[11px] text-white focus:outline-none focus:border-[#ff6b00] cursor-pointer"
                          >
                            {ZONE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2 font-body">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition cursor-pointer min-h-[42px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] rounded-lg transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer min-h-[42px]"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Registering...' : 'Register Bag'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
