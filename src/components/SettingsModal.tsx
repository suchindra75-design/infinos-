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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-[var(--text)]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 border border-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)] font-display">Compartment Thresholds</h3>
              <p className="text-xs text-[var(--muted)] font-body">
                Bag Code: <span className="font-data text-[var(--orange)]">{deviceCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface2)] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh] font-body">
          {formError && (
            <div className="p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--red)]" />
              <span>{formError}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--green)]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Cold Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--cold)] uppercase tracking-wider block font-display">
              Cold Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMin}
                  onChange={(e) => setColdMin(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--cold)]"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={coldMax}
                  onChange={(e) => setColdMax(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--cold)]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Hot Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--hot)] uppercase tracking-wider block font-display">
              Hot Compartment Range (°C)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Min (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMin}
                  onChange={(e) => setHotMin(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--hot)]"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Max (°C)</span>
                <input
                  type="number"
                  step="0.1"
                  value={hotMax}
                  onChange={(e) => setHotMax(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--hot)]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Humidity Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-emerald-400 uppercase tracking-wider block font-display">
              Relative Humidity Range (%)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Min (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMin}
                  onChange={(e) => setHumidityMin(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>
              <div>
                <span className="text-[10px] text-[var(--muted)] font-body">Max (%)</span>
                <input
                  type="number"
                  step="0.1"
                  value={humidityMax}
                  onChange={(e) => setHumidityMax(parseFloat(e.target.value))}
                  className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-emerald-400"
                  required
                />
              </div>
            </div>
          </div>

          {/* Automated Alerts Toggle */}
          <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between">
            <div>
              <span className="text-sm font-semibold text-[var(--text)] block font-display">
                Automated Incident Alerting
              </span>
              <span className="text-xs text-[var(--muted)] font-body">
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
              <div className="w-11 h-6 bg-[var(--surface2)] border border-[var(--border)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--orange)]"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[var(--border)] flex items-center justify-end gap-3 font-body">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface)] border border-[var(--border)] rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange)]/90 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
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
