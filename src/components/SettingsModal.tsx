import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeviceSettings, UpdateDeviceSettingsInput } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: DeviceSettings | null;
  onSave: (data: UpdateDeviceSettingsInput) => Promise<void>;
  isLoading: boolean;
  deviceCode: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
  isLoading,
  deviceCode,
}) => {
  const [coldMin, setColdMin] = useState<number>(0);
  const [coldMax, setColdMax] = useState<number>(8);
  const [hotMin, setHotMin] = useState<number>(50);
  const [hotMax, setHotMax] = useState<number>(70);
  const [humidityMin, setHumidityMin] = useState<number>(20);
  const [humidityMax, setHumidityMax] = useState<number>(85);
  const [alertsEnabled, setAlertsEnabled] = useState<boolean>(true);

  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (settings) {
      setColdMin(settings.coldTempMin);
      setColdMax(settings.coldTempMax);
      setHotMin(settings.hotTempMin);
      setHotMax(settings.hotTempMax);
      setHumidityMin(settings.humidityMin);
      setHumidityMax(settings.humidityMax);
      setAlertsEnabled(settings.alertsEnabled);
      setFormError(null);
      setSuccessMessage(null);
    }
  }, [settings, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    // Client-side validations
    if (coldMin > coldMax) {
      setFormError('Cold temperature minimum cannot exceed cold temperature maximum.');
      return;
    }
    if (hotMin > hotMax) {
      setFormError('Hot temperature minimum cannot exceed hot temperature maximum.');
      return;
    }
    if (humidityMin > humidityMax) {
      setFormError('Humidity minimum cannot exceed humidity maximum.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        coldTempMin: Number(coldMin),
        coldTempMax: Number(coldMax),
        hotTempMin: Number(hotMin),
        hotTempMax: Number(hotMax),
        humidityMin: Number(humidityMin),
        humidityMax: Number(humidityMax),
        alertsEnabled,
      });
      setSuccessMessage('Threshold configuration updated successfully.');
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setFormError(err.message || 'Failed to update settings.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0e1014] border border-white/[0.1] rounded-2xl w-full max-w-lg my-auto shadow-2xl shadow-black/80 overflow-hidden flex flex-col max-h-[90vh] text-zinc-200">
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00] shrink-0">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white font-display">Compartment Thresholds</h3>
              <p className="text-[11px] sm:text-xs text-zinc-400 font-body">
                Bag Code: <span className="font-data text-[#ff6b00] font-semibold">{deviceCode}</span>
              </p>
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto font-body">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Cold Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-[#00a3ff] uppercase tracking-wider block font-display">
              Cold Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMin}
                  onChange={(e) => setColdMin(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#00a3ff] min-h-[42px]"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMax}
                  onChange={(e) => setColdMax(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#00a3ff] min-h-[42px]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Hot Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-[#ff6b00] uppercase tracking-wider block font-display">
              Hot Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMin}
                  onChange={(e) => setHotMin(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMax}
                  onChange={(e) => setHotMax(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-[#ff6b00] min-h-[42px]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Humidity Range */}
          <div className="space-y-1.5">
            <label className="text-[11px] sm:text-xs font-bold text-sky-400 uppercase tracking-wider block font-display">
              Relative Humidity Range (%)
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Min (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMin}
                  onChange={(e) => setHumidityMin(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-sky-400 min-h-[42px]"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 font-body block mb-1">Max (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMax}
                  onChange={(e) => setHumidityMax(parseFloat(e.target.value))}
                  className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-data text-white focus:outline-none focus:border-sky-400 min-h-[42px]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automated Alerts Toggle */}
          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between gap-3">
            <div>
              <span className="text-xs sm:text-sm font-semibold text-zinc-100 block font-display">
                Automated Incident Alerting
              </span>
              <span className="text-[10px] sm:text-xs text-zinc-400 font-body">
                Trigger alerts when readings breach configured thresholds
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#ff6b00]"></div>
            </label>
          </div>

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
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] rounded-lg transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer min-h-[42px]"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving...' : 'Save Thresholds'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
