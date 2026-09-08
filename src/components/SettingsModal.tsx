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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-slate-200">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-slate-100">Compartment Thresholds</h3>
              <p className="text-xs text-slate-400">
                Bag Code: <span className="font-mono text-cyan-400">{deviceCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
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
          <div className="space-y-2">
            <label className="text-xs font-semibold text-cyan-400 uppercase tracking-wider block">
              Cold Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMin}
                  onChange={(e) => setColdMin(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMax}
                  onChange={(e) => setColdMax(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Hot Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-orange-400 uppercase tracking-wider block">
              Hot Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMin}
                  onChange={(e) => setHotMin(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMax}
                  onChange={(e) => setHotMax(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Humidity Range */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-blue-400 uppercase tracking-wider block">
              Relative Humidity Range (%)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-slate-400">Min (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMin}
                  onChange={(e) => setHumidityMin(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Max (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMax}
                  onChange={(e) => setHumidityMax(parseFloat(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automated Alerts Toggle */}
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-sm font-medium text-slate-200 block">
                Automated Incident Alerting
              </span>
              <span className="text-xs text-slate-400">
                Trigger alerts when readings breach configured compartment thresholds
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={alertsEnabled}
                onChange={(e) => setAlertsEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition shadow-sm disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Saving...' : 'Save Thresholds'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
