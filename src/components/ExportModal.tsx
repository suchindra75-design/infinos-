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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-[var(--text)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--orange)]/10 border border-[var(--orange)]/20 flex items-center justify-center text-[var(--orange)]">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-[var(--text)] font-display">Audit Sensor Export</h3>
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

        {/* Form Body */}
        <form onSubmit={handleExport} className="p-6 space-y-4 font-body">
          {error && (
            <div className="p-3 rounded-lg bg-[var(--red)]/10 border border-[var(--red)]/30 text-[var(--red)] text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-[var(--red)]" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/30 text-[var(--green)] text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--green)]" />
              <span>{success}</span>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block font-body">
              Report Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportType('csv')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  exportType === 'csv'
                    ? 'bg-[var(--orange)]/10 border-[var(--orange)] text-[var(--text)]'
                    : 'bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--border)]/80'
                }`}
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold block text-[var(--text)]">CSV Data</span>
                  <span className="text-[10px] text-[var(--muted)] block">Spreadsheet analysis</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportType('pdf')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition text-left cursor-pointer ${
                  exportType === 'pdf'
                    ? 'bg-[var(--orange)]/10 border-[var(--orange)] text-[var(--text)]'
                    : 'bg-[var(--surface2)] border-[var(--border)] text-[var(--muted)] hover:border-[var(--border)]/80'
                }`}
              >
                <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                <div>
                  <span className="text-xs font-semibold block text-[var(--text)]">PDF Report</span>
                  <span className="text-[10px] text-[var(--muted)] block">Formal audit document</span>
                </div>
              </button>
            </div>
          </div>

          {/* Date Filtering */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-semibold text-[var(--muted)] block mb-1">
                From (Optional)
              </label>
              <input
                type="datetime-local"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] font-data focus:outline-none focus:border-[var(--orange)]"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase font-semibold text-[var(--muted)] block mb-1">
                To (Optional)
              </label>
              <input
                type="datetime-local"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text)] font-data focus:outline-none focus:border-[var(--orange)]"
              />
            </div>
          </div>

          {/* Record Limit */}
          <div>
            <label className="text-[10px] uppercase font-semibold text-[var(--muted)] block mb-1">
              Maximum Records
            </label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] font-data focus:outline-none focus:border-[var(--orange)]"
            >
              <option value={100}>100 readings</option>
              <option value={500}>500 readings</option>
              <option value={1000}>1,000 readings</option>
              <option value={5000}>5,000 readings (CSV only)</option>
            </select>
          </div>

          <p className="text-[10px] text-[var(--muted)] italic font-body">
            Exports are compiled directly from PostgreSQL sensor readings with certified timestamps.
          </p>

          {/* Actions */}
          <div className="pt-3 border-t border-[var(--border)] flex items-center justify-end gap-2 font-body">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface2)] hover:bg-[var(--surface)] border border-[var(--border)] rounded-lg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isExporting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange)]/90 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
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
