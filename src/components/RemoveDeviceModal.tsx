import React, { useState } from 'react';
import { X, Archive, Trash2, AlertTriangle, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { SafeDevice } from '../types';
import { api } from '../api/client';

interface RemoveDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: SafeDevice | null;
  onDeviceUpdated: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1];

const modeVariants = {
  initial: { opacity: 0, x: 8 },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2, // --dur-base (200ms)
      ease: EASE_OUT,
    },
  },
  exit: {
    opacity: 0,
    x: -8,
    transition: {
      duration: 0.2, // --dur-base (200ms)
      ease: EASE_OUT,
    },
  },
};

export const RemoveDeviceModal: React.FC<RemoveDeviceModalProps> = ({
  isOpen,
  onClose,
  device,
  onDeviceUpdated,
}) => {
  const [mode, setMode] = useState<'archive' | 'delete'>('archive');
  const [confirmCodeInput, setConfirmCodeInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isDeleteConfirmed = device ? confirmCodeInput.trim().toUpperCase() === device.deviceCode.trim().toUpperCase() : false;

  const handleAction = async () => {
    if (!device) return;
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'archive') {
        await api.devices.archive(device.id);
        setSuccessMessage(`Bag ${device.deviceCode} has been archived successfully. Telemetry history is preserved.`);
      } else {
        if (!isDeleteConfirmed) return;
        await api.devices.delete(device.id);
        setSuccessMessage(`Bag ${device.deviceCode} has been permanently deleted.`);
      }

      setTimeout(() => {
        setIsSubmitting(false);
        setSuccessMessage(null);
        setConfirmCodeInput('');
        onDeviceUpdated();
        onClose();
      }, 1000);
    } catch (err: any) {
      setIsSubmitting(false);
      setError(err?.message || 'Failed to complete requested action');
    }
  };

  return (
    <ModalShell isOpen={isOpen && Boolean(device)} onClose={onClose} maxWidthClass="max-w-lg" ariaLabel="Remove Smart Bag">
      {device && (
        <>
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-[#12151b] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white font-display truncate min-w-0">
                  Remove Smart Bag — {device.deviceCode}
                </h3>
                <p className="text-[11px] text-zinc-400 font-body truncate min-w-0">{device.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-white/[0.06] active:scale-[0.92] transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 space-y-4 font-body overflow-y-auto flex-1 min-h-0">
            {error && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#07080a] p-1 rounded-xl border border-white/[0.08]">
              <button
                type="button"
                onClick={() => setMode('archive')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] cursor-pointer ${
                  mode === 'archive'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('delete')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-[transform,background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] cursor-pointer ${
                  mode === 'delete'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-xs'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanent Delete</span>
              </button>
            </div>

            {/* Option Details with AnimatePresence */}
            <AnimatePresence mode="wait">
              {mode === 'archive' ? (
                <motion.div
                  key="archive-mode"
                  variants={modeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-[#12151b] border border-white/[0.06] rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="font-semibold text-zinc-200 flex items-center gap-2 text-sm">
                    <Archive className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Archive & Deactivate Bag</span>
                  </div>
                  <p className="text-zinc-400 leading-relaxed">
                    Archiving stops automatic background synchronization and removes this bag from your active monitoring fleet.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-zinc-400 pt-1">
                    <li>Historical sensor readings & statistics are <strong className="text-emerald-400 font-semibold">100% preserved</strong></li>
                    <li>CSV & PDF audit reports remain downloadable at any time</li>
                    <li>You can restore/unarchive this bag whenever needed</li>
                  </ul>
                </motion.div>
              ) : (
                <motion.div
                  key="delete-mode"
                  variants={modeVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="bg-[#181014] border border-rose-900/40 rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="font-semibold text-rose-300 flex items-center gap-2 text-sm">
                    <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Permanently Delete Bag & Data</span>
                  </div>
                  <p className="text-rose-300/80 leading-relaxed">
                    This will permanently delete <strong className="text-white font-mono">{device.deviceCode}</strong> and <strong className="text-rose-200">ALL historical sensor readings, incident alerts, and threshold configurations</strong> from PostgreSQL.
                  </p>

                  <div className="pt-2 border-t border-rose-900/30 space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-300">
                      Type <span className="font-mono text-amber-400">{device.deviceCode}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmCodeInput}
                      onChange={(e) => setConfirmCodeInput(e.target.value)}
                      placeholder={device.deviceCode}
                      className="w-full bg-[#0c0a0c] border border-rose-900/50 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-white/[0.08] flex items-center justify-end gap-2 bg-[#12151b] font-body shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-lg active:scale-[0.96] transition-[transform,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAction}
              disabled={isSubmitting || (mode === 'delete' && !isDeleteConfirmed)}
              className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 active:scale-[0.97] active:shadow-none transition-[transform,background-color,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] cursor-pointer min-h-[38px] ${
                mode === 'archive'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold shadow-md shadow-amber-500/20'
                  : isDeleteConfirmed
                  ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-bold shadow-md shadow-rose-600/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.05]'
              }`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : mode === 'archive' ? (
                <>
                  <Archive className="w-3.5 h-3.5" />
                  <span>Archive Bag</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Permanently</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
};
