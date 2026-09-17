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
      <div className="p-4 border-b border-[#171512]/08 bg-[#F2ECE0]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isDestructive ? 'bg-[#E11D48]/10 text-[#E11D48]' : 'bg-[#FC4731]/10 text-[#FC4731]'}`}>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <h3 className="font-display font-bold text-sm text-[#171512]">{title}</h3>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-lg border border-[#171512]/10 bg-transparent text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.92] flex items-center justify-center cursor-pointer transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 text-xs text-[#7B746A] leading-relaxed font-body overflow-y-auto flex-1 min-h-0 bg-[#FFF9EF]">
        {message}
      </div>

      <div className="p-4 bg-[#F2ECE0]/60 border-t border-[#171512]/08 flex items-center justify-end gap-2 font-body shrink-0">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-[#FFF9EF] border border-[#171512]/10 text-[#171512] font-body font-bold text-xs hover:bg-[#F2ECE0] active:scale-[0.97] cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            onConfirm();
            onClose();
          }}
          className={`px-4 py-2 rounded-xl font-body font-bold text-xs text-white shadow-xs active:scale-[0.97] active:shadow-none cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
            isDestructive
              ? 'bg-[#E11D48] hover:bg-[#c9173c]'
              : 'bg-[#FC4731] hover:bg-[#e03a25]'
          }`}
        >
          {confirmText}
        </button>
      </div>
    </ModalShell>
  );
};
