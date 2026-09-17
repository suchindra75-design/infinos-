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
          <div className="p-4 sm:p-5 border-b border-[#171512]/[0.08] flex items-center justify-between bg-[#FFF9EF] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#FC4731]/10 border border-[#FC4731]/20 flex items-center justify-center text-[#FC4731]">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-[#171512] font-display truncate min-w-0">
                  Remove Smart Bag — {device.deviceCode}
                </h3>
                <p className="text-[11px] text-[#7B746A] font-body truncate min-w-0">{device.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 text-[#7B746A] hover:text-[#171512] rounded-lg hover:bg-[#171512]/[0.05] active:scale-[0.92] transition-colors duration-[var(--dur-fast)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content Body */}
          <div className="p-4 sm:p-6 space-y-4 font-body overflow-y-auto flex-1 min-h-0 bg-[#FFF9EF]">
            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-[#F8F3E8] p-1.5 rounded-xl border border-[#171512]/[0.08]">
              <button
                type="button"
                onClick={() => setMode('archive')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] cursor-pointer ${
                  mode === 'archive'
                    ? 'bg-[#FFF9EF] text-[#FC4731] border border-[#FC4731]/30 shadow-xs'
                    : 'text-[#7B746A] hover:text-[#171512]'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive (Recommended)</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('delete')}
                className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] active:scale-[0.97] cursor-pointer ${
                  mode === 'delete'
                    ? 'bg-[#FFF9EF] text-rose-700 border border-rose-500/30 shadow-xs'
                    : 'text-[#7B746A] hover:text-[#171512]'
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
                  className="bg-[#F8F3E8] border border-[#171512]/[0.08] rounded-xl p-4 space-y-2 text-xs"
                >
                  <div className="font-semibold text-[#171512] flex items-center gap-2 text-sm">
                    <Archive className="w-4 h-4 text-[#FC4731] shrink-0" />
                    <span>Archive & Deactivate Bag</span>
                  </div>
                  <p className="text-[#7B746A] leading-relaxed">
                    Archiving stops automatic background synchronization and removes this bag from your active monitoring fleet.
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-[#7B746A] pt-1">
                    <li>Historical sensor readings & statistics are <strong className="text-emerald-700 font-semibold">100% preserved</strong></li>
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
                  className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-4 space-y-3 text-xs"
                >
                  <div className="font-semibold text-rose-900 flex items-center gap-2 text-sm">
                    <Trash2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Permanently Delete Bag & Data</span>
                  </div>
                  <p className="text-rose-800/80 leading-relaxed">
                    This will permanently delete <strong className="text-[#171512] font-mono">{device.deviceCode}</strong> and <strong className="text-rose-900">ALL historical sensor readings, incident alerts, and threshold configurations</strong> from PostgreSQL.
                  </p>

                  <div className="pt-2 border-t border-rose-500/20 space-y-1.5">
                    <label className="block text-[11px] font-bold text-[#171512]">
                      Type <span className="font-mono text-[#FC4731]">{device.deviceCode}</span> to confirm:
                    </label>
                    <input
                      type="text"
                      value={confirmCodeInput}
                      onChange={(e) => setConfirmCodeInput(e.target.value)}
                      placeholder={device.deviceCode}
                      className="w-full bg-[#FFF9EF] border border-rose-300 rounded-lg px-3 py-1.5 text-xs text-[#171512] font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-[#171512]/[0.08] flex items-center justify-end gap-2 bg-[#FFF9EF] font-body shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-[#7B746A] hover:text-[#171512] rounded-lg active:scale-[0.96] transition-colors duration-[var(--dur-fast)] cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleAction}
              disabled={isSubmitting || (mode === 'delete' && !isDeleteConfirmed)}
              className={`px-5 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 active:scale-[0.97] transition-all duration-[var(--dur-base)] cursor-pointer min-h-[38px] ${
                mode === 'archive'
                  ? 'bg-[#FC4731] hover:bg-[#e03a25] text-white font-bold shadow-xs'
                  : isDeleteConfirmed
                  ? 'bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs'
                  : 'bg-[#171512]/[0.06] text-[#7B746A] cursor-not-allowed border border-[#171512]/[0.08]'
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
