import React, { useState, useEffect } from 'react';
import { X, Download, FileSpreadsheet, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { api } from '../api/client';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  deviceId: string;
  deviceCode: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  deviceId,
  deviceCode,
}) => {
  const [exportType, setExportType] = useState<'csv' | 'pdf'>('csv');
  const [rangeMode, setRangeMode] = useState<'all' | 'custom'>('all');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setRangeMode('all');
      setFrom('');
      setTo('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  useEffect(() => {
    setRangeMode('all');
    setFrom('');
    setTo('');
    setError(null);
    setSuccess(null);
  }, [deviceId]);

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsExporting(true);

    try {
      const options: { from?: string; to?: string } = {};
      if (rangeMode === 'custom') {
        if (from) {
          const start = new Date(`${from}T00:00:00`);
          options.from = start.toISOString();
        }
        if (to) {
          const end = new Date(`${to}T23:59:59.999`);
          options.to = end.toISOString();
        }
        if (!options.from && !options.to) {
          throw new Error('Select at least one date for custom range, or choose All History.');
        }
        if (options.from && options.to && new Date(options.from) > new Date(options.to)) {
          throw new Error("'From' date must be earlier than or equal to 'To' date.");
        }
      }

      // eslint-disable-next-line no-console
      console.debug('[ExportModal] export payload', {
        deviceId,
        deviceCode,
        rangeMode,
        from: options.from ?? null,
        to: options.to ?? null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        localFrom: from || null,
        localTo: to || null,
      });

      if (exportType === 'csv') {
        await api.exports.downloadCsv(deviceId, deviceCode, options);
        setSuccess('Telemetry CSV file downloaded successfully.');
      } else {
        await api.exports.downloadPdf(deviceId, deviceCode, options);
        setSuccess('Official audit PDF report downloaded successfully.');
      }

      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Export failed. Ensure data exists for this bag.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-md" ariaLabel="Audit Sensor Export">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00] shrink-0">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-white font-display">Audit Sensor Export</h3>
            <p className="text-[11px] sm:text-xs text-zinc-400 font-body">
              Bag Code: <span className="font-data text-[#ff6b00] font-semibold">{deviceCode}</span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] active:scale-[0.92] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form Body */}
      <form onSubmit={handleExport} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto font-body flex-1 min-h-0">
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

        {/* Format Selection */}
        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-body">
            Report Format
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setExportType('csv')}
              className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] text-left cursor-pointer min-h-[50px] ${
                exportType === 'csv'
                  ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                  : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-zinc-200">CSV Data</span>
                <span className="text-[10px] text-zinc-400 block leading-tight">Spreadsheet format</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setExportType('pdf')}
              className={`p-2.5 sm:p-3 rounded-xl border flex items-center gap-2.5 active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] text-left cursor-pointer min-h-[50px] ${
                exportType === 'pdf'
                  ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                  : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
              }`}
            >
              <FileText className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="text-xs font-semibold block text-zinc-200">PDF Report</span>
                <span className="text-[10px] text-zinc-400 block leading-tight">Audit document</span>
              </div>
            </button>
          </div>
        </div>

        {/* Range Mode */}
        <div className="space-y-1.5">
          <label className="text-[11px] sm:text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-body">
            Date Range
          </label>
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setRangeMode('all');
                setFrom('');
                setTo('');
              }}
              className={`p-2.5 sm:p-3 rounded-xl border text-xs font-semibold active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] text-center cursor-pointer min-h-[42px] ${
                rangeMode === 'all'
                  ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                  : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
              }`}
            >
              All History
            </button>
            <button
              type="button"
              onClick={() => setRangeMode('custom')}
              className={`p-2.5 sm:p-3 rounded-xl border text-xs font-semibold active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] text-center cursor-pointer min-h-[42px] ${
                rangeMode === 'custom'
                  ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                  : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {/* Date Filtering */}
        <div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 transition-opacity ${rangeMode === 'all' ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
        >
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              From {rangeMode === 'custom' ? '(Optional)' : '(All)'}
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              disabled={rangeMode === 'all'}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-zinc-200 font-data focus:outline-none focus:border-[#ff6b00] min-h-[42px] disabled:opacity-60"
            />
          </div>
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              To {rangeMode === 'custom' ? '(Optional)' : '(All)'}
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              disabled={rangeMode === 'all'}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-2.5 py-2 text-xs text-zinc-200 font-data focus:outline-none focus:border-[#ff6b00] min-h-[42px] disabled:opacity-60"
            />
          </div>
        </div>

        <p className="text-[10px] text-zinc-500 italic font-body">
          {rangeMode === 'all'
            ? 'All History exports every PostgreSQL sensor reading for this device (no date filter).'
            : 'Custom range is inclusive: From 00:00:00 to To 23:59:59.999 local time, converted to UTC.'}
        </p>

        {/* Actions */}
        <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2 font-body">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg active:scale-[0.97] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer min-h-[42px]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isExporting}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] rounded-lg active:scale-[0.97] active:shadow-none transition-[transform,background-color,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer min-h-[42px]"
          >
            {isExporting ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/20 border-t-white animate-spin-fast shrink-0" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>{`Download ${exportType.toUpperCase()}`}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </ModalShell>
  );
};
