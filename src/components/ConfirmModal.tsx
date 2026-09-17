import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { ModalShell } from './ModalShell';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  isDestructive = true,
}) => {
  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-sm" ariaLabel={title}>
      <div className="p-4 border-b border-[var(--border)] bg-[var(--surface2)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isDestructive ? 'bg-rose-500/10 text-rose-500' : 'bg-orange-500/10 text-orange-500'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-display font-bold text-sm text-[var(--text)]">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface3)] active:scale-[0.92] flex items-center justify-center cursor-pointer transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 text-xs text-[var(--muted)] leading-relaxed font-body overflow-y-auto flex-1 min-h-0">
        {message}
      </div>

      <div className="p-4 bg-[var(--surface2)] border-t border-[var(--border)] flex items-center justify-end gap-2 font-body shrink-0">
        <button
          onClick={onClose}
          className="px-3.5 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] font-body font-semibold text-xs hover:bg-[var(--surface3)] active:scale-[0.97] cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 rounded-lg font-body font-bold text-xs text-white shadow-md active:scale-[0.97] active:shadow-none cursor-pointer transition-[transform,background-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
            isDestructive
              ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
              : 'bg-gradient-to-r from-[var(--orange)] to-[#e83800] shadow-orange-500/30'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </ModalShell>
  );
};
