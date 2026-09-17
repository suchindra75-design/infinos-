import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, Save, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

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
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-lg" ariaLabel="Compartment Thresholds">
      {/* Modal Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-[#171512]/08 flex items-center justify-between shrink-0 bg-[#F2ECE0]/60">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#FC4731]/10 border border-[#FC4731]/20 flex items-center justify-center text-[#FC4731] shrink-0">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-base text-[#171512] font-display">Compartment Thresholds</h3>
            <p className="text-xs text-[#7B746A] font-body">
              Bag Code: <span className="font-mono text-[#FC4731] font-bold">{deviceCode}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.92] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Modal Body */}
      <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto font-body flex-1 min-h-0 bg-[#FFF9EF]">
        {formError && (
          <div className="p-3 rounded-xl bg-[#E11D48]/10 border border-[#E11D48]/25 text-[#E11D48] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 rounded-xl bg-[#10B981]/10 border border-[#10B981]/25 text-[#10B981] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Cold Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0284C7] uppercase tracking-wider block font-display">
            Cold Compartment Range (°C)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Min (°C)</span>
              <input
                type="number"
                step="0.1"
                value={coldMin}
                onChange={(e) => setColdMin(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#0284C7] min-h-[42px]"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Max (°C)</span>
              <input
                type="number"
                step="0.1"
                value={coldMax}
                onChange={(e) => setColdMax(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#0284C7] min-h-[42px]"
                required
              />
            </div>
          </div>
        </div>

        {/* Hot Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#FC4731] uppercase tracking-wider block font-display">
            Hot Compartment Range (°C)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Min (°C)</span>
              <input
                type="number"
                step="0.1"
                value={hotMin}
                onChange={(e) => setHotMin(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Max (°C)</span>
              <input
                type="number"
                step="0.1"
                value={hotMax}
                onChange={(e) => setHotMax(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#FC4731] min-h-[42px]"
                required
              />
            </div>
          </div>
        </div>

        {/* Humidity Range */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#0EA5E9] uppercase tracking-wider block font-display">
            Relative Humidity Range (%)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Min (%)</span>
              <input
                type="number"
                step="0.1"
                value={humidityMin}
                onChange={(e) => setHumidityMin(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#0EA5E9] min-h-[42px]"
                required
              />
            </div>
            <div>
              <span className="text-[10px] text-[#7B746A] font-body block mb-1">Max (%)</span>
              <input
                type="number"
                step="0.1"
                value={humidityMax}
                onChange={(e) => setHumidityMax(parseFloat(e.target.value))}
                className="w-full bg-[#F2ECE0]/60 border border-[#171512]/10 rounded-xl px-3 py-2 text-sm font-data text-[#171512] focus:outline-none focus:border-[#0EA5E9] min-h-[42px]"
                required
              />
            </div>
          </div>
        </div>

        {/* Automated Alerts Toggle */}
        <div className="pt-2 border-t border-[#171512]/08 flex items-center justify-between gap-3">
          <div>
            <span className="text-xs sm:text-sm font-bold text-[#171512] block font-display">
              Automated Incident Alerting
            </span>
            <span className="text-[10px] sm:text-xs text-[#7B746A] font-body">
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
            <div className="w-11 h-6 bg-[#EAE3D5] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 peer-active:after:scale-90 after:transition-[transform,background-color,border-color] after:duration-[var(--dur-fast)] after:ease-[var(--ease-out)] peer-checked:bg-[#FC4731]"></div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#171512]/08 flex items-center justify-end gap-2 font-body">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-[#7B746A] hover:text-[#171512] bg-[#F2ECE0] hover:bg-[#EAE3D5] rounded-xl active:scale-[0.97] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs sm:text-sm font-bold text-white bg-[#FC4731] hover:bg-[#e03a25] rounded-xl active:scale-[0.97] active:shadow-none transition-[transform,background-color,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] shadow-sm shadow-[#FC4731]/25 disabled:opacity-50 cursor-pointer min-h-[42px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? 'Saving...' : 'Save Thresholds'}</span>
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
