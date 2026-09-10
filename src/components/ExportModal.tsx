import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
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
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [limit, setLimit] = useState<number>(500);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsExporting(true);

    try {
      const options: { from?: string; to?: string; limit?: number } = {};
      if (from) options.from = new Date(from).toISOString();
      if (to) options.to = new Date(to).toISOString();
      if (limit) options.limit = Number(limit);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0e1014] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-display">Audit Sensor Export</h3>
              <p className="text-xs text-zinc-400 font-body">
                Bag Code: <span className="font-data text-[#ff6b00]">{deviceCode}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleExport} className="p-6 space-y-4 font-body">
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
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block font-body">
              Report Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType('csv')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  exportType === 'csv'
                    ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                    : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold block text-zinc-200">CSV Data</span>
                  <span className="text-[10px] text-zinc-400 block">Spreadsheet analysis</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportType('pdf')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  exportType === 'pdf'
                    ? 'bg-orange-500/10 border-[#ff6b00] text-white'
                    : 'bg-[#07080a] border-white/[0.08] text-zinc-400 hover:border-white/[0.2]'
                }`}
              >
                <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold block text-zinc-200">PDF Report</span>
                  <span className="text-[10px] text-zinc-400 block">Formal audit document</span>
                </div>
              </button>
            </div>
          </div>

          {/* Date Filtering */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                From (Optional)
              </label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-data focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                To (Optional)
              </label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-data focus:outline-none focus:border-[#ff6b00]"
              />
            </div>
          </div>

          {/* Record Limit */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
              Maximum Records
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-zinc-200 font-data focus:outline-none focus:border-[#ff6b00]"
            >
              <option value={100}>100 readings</option>
              <option value={500}>500 readings</option>
              <option value={1000}>1,000 readings</option>
              <option value={5000}>5,000 readings (CSV only)</option>
            </select>
          </div>

          <p className="text-[10px] text-zinc-500 italic font-body">
            Exports are compiled directly from PostgreSQL sensor readings with certified timestamps.
          </p>

          {/* Actions */}
          <div className="pt-3 border-t border-white/[0.08] flex items-center justify-end gap-2 font-body">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white bg-zinc-800/80 hover:bg-zinc-800 rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] rounded-lg transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? 'Generating...' : `Download ${exportType.toUpperCase()}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
