import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ModalShell } from './ModalShell';
import { api } from '../api/client';
import { CreateDeviceInput } from '../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

const EASE_OUT = [0.16, 1, 0.3, 1];

const stepVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 8,
  }),
  center: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.2, // --dur-base (200ms)
      ease: EASE_OUT,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -8,
    transition: {
      duration: 0.2, // --dur-base (200ms)
      ease: EASE_OUT,
    },
  }),
};

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceCreated,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [direction, setDirection] = useState<number>(1);

  // Form Inputs
  const [deviceCode, setDeviceCode] = useState('');
  const [channelId, setChannelId] = useState('3297681');
  const [readApiKey, setReadApiKey] = useState('');
  const [bagName, setBagName] = useState('');

  // States
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyMeta, setVerifyMeta] = useState<string | null>(null);

  const handleStep1Next = async () => {
    setError(null);
    const code = deviceCode.trim();
    if (!code || code.length < 3) {
      setError('Please enter a valid device code (min 3 chars)');
      return;
    }

    if (!channelId.trim()) {
      setError('Please enter a ThingSpeak channel ID');
      return;
    }

    setIsVerifying(true);
    try {
      const res = await api.devices.testConnection({
        thingSpeakChannelId: channelId.trim(),
        thingSpeakReadApiKey: readApiKey.trim() || undefined,
      });

      if (res.connected) {
        setVerifyMeta(`CH:${channelId.trim()} · ${res.channelName || 'ThingSpeak Channel Verified'}`);
        setDirection(1);
        setStep(2);
      } else {
        setError('Could not connect to channel. Check your channel ID or connection.');
      }
    } catch (err: any) {
      setError(err.message || 'Could not verify channel connection. Check your parameters.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = bagName.trim();
    const code = deviceCode.trim().toUpperCase();

    if (!name) {
      setError('Please enter a name for your bag');
      return;
    }

    setIsSubmitting(true);
    try {
      const input: CreateDeviceInput = {
        deviceCode: code,
        name,
        thingSpeakChannelId: channelId.trim(),
        thingSpeakReadApiKey: readApiKey.trim() || undefined,
      };

      await api.devices.create(input);

      // Reset state on success
      setStep(1);
      setDeviceCode('');
      setBagName('');
      onDeviceCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to claim bag. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(1);
  };

  return (
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-[410px]" ariaLabel="Claim Delivery Bag">
      {/* Header */}
      <div className="p-[18px_20px_14px] border-b border-[var(--border)] bg-[var(--surface2)] flex items-start justify-between gap-2.5 shrink-0">
        <div>
          <div className="font-display font-bold text-[0.95rem] text-[var(--text)]">Claim Delivery Bag</div>
          <div className="text-[0.7rem] text-[var(--muted)] mt-0.5 font-body">Connect your bag to the dashboard</div>
        </div>
        <button
          onClick={onClose}
          className="w-[28px] h-[28px] rounded-[7px] border border-[var(--border)] bg-transparent text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface3)] active:scale-[0.92] flex items-center justify-center cursor-pointer text-base transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-[18px_20px_14px] font-body overflow-y-auto flex-1 min-h-0">
        {/* Stepper */}
        <div className="flex items-center mb-4">
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold border transition-[background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
              step === 1 ? 'bg-[var(--orange)] text-white border-[var(--orange)]' : 'bg-[var(--green)] text-white border-[var(--green)]'
            }`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-[0.65rem] text-[var(--muted)] ml-1.5 whitespace-nowrap">Enter Code</span>
          </div>
          <div className={`flex-1 h-[1px] mx-2 min-w-[20px] transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${step === 2 ? 'bg-[var(--orange)]' : 'bg-[var(--border)]'}`} />
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[0.7rem] font-bold border transition-[background-color,border-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
              step === 2 ? 'bg-[var(--orange)] text-white border-[var(--orange)]' : 'bg-[var(--surface3)] text-[var(--muted)] border-[var(--border)]'
            }`}>
              2
            </div>
            <span className="text-[0.65rem] text-[var(--muted)] ml-1.5 whitespace-nowrap">Name Bag</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 rounded-lg p-2.5 text-[0.72rem] text-[var(--red)] mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Animated Step Transition */}
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 ? (
            <motion.div
              key="step-1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3"
            >
              <div>
                <div className="text-[0.65rem] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                  Device Code
                </div>
                <input
                  type="text"
                  placeholder="e.g. INF-XXXX-XXXX"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                  className="w-full p-[9px_12px] rounded-[9px] bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] font-mono text-[0.9rem] uppercase tracking-wider focus:outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-500/15 transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  maxLength={20}
                  autoComplete="off"
                />
                <div className="text-[0.65rem] text-[var(--muted)] mt-1">
                  Enter any device code — connects to your backend & ThingSpeak
                </div>
              </div>

              <div>
                <div className="text-[0.65rem] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                  ThingSpeak Channel ID
                </div>
                <input
                  type="text"
                  placeholder="e.g. 3297681"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full p-[9px_12px] rounded-[9px] bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] font-mono text-[0.875rem] focus:outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-500/15 transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                />
              </div>

              <div>
                <div className="text-[0.65rem] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                  Read API Key <span className="text-[var(--muted)] font-normal">(Optional)</span>
                </div>
                <input
                  type="password"
                  placeholder="Needed only for private channels"
                  value={readApiKey}
                  onChange={(e) => setReadApiKey(e.target.value)}
                  className="w-full p-[9px_12px] rounded-[9px] bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] font-mono text-xs focus:outline-none focus:border-[var(--orange)] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                />
              </div>

              <div className="bg-[var(--surface2)] border border-[var(--border)] rounded-[9px] p-3 text-[0.72rem] text-[var(--muted)] leading-relaxed">
                <strong className="text-[var(--text)]">📡 Live Data Source</strong><br />
                ThingSpeak Channel {channelId || '3297681'}<br />
                Field 3 = Hot Zone Temp &nbsp;·&nbsp; Field 1 = Cold Zone Temp
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3"
            >
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-[10px] p-3 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[var(--green)] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-[var(--green)] text-[0.8rem]">Device Verified!</div>
                  <div className="text-[0.68rem] text-[var(--muted)] mt-0.5 leading-snug">{verifyMeta}</div>
                </div>
              </div>

              <div>
                <div className="text-[0.65rem] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1.5">
                  Bag Name
                </div>
                <input
                  type="text"
                  placeholder="e.g. Hot Bag Zone A, Cold Delivery #1"
                  value={bagName}
                  onChange={(e) => setBagName(e.target.value)}
                  className="w-full p-[9px_12px] rounded-[9px] bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] text-[0.875rem] focus:outline-none focus:border-[var(--orange)] focus:ring-2 focus:ring-orange-500/15 transition-[border-color,box-shadow] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  autoFocus
                />
                <div className="text-[0.65rem] text-[var(--muted)] mt-1">
                  Names with "hot" or "cold" get auto-coloured
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-[12px_20px_18px] flex gap-2 font-body shrink-0 border-t border-[var(--border)] bg-[var(--surface2)]">
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              handleBack();
            } else {
              onClose();
            }
          }}
          className="flex-1 p-[9px] rounded-[9px] bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] font-semibold text-[0.78rem] cursor-pointer hover:bg-[var(--surface3)] active:scale-[0.97] transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>

        {step === 1 ? (
          <button
            type="button"
            onClick={handleStep1Next}
            disabled={isVerifying}
            className="flex-[1.7] p-[9px] rounded-[9px] bg-gradient-to-r from-[var(--orange)] to-[#e83800] text-white font-bold text-[0.8rem] shadow-md shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:shadow-none cursor-pointer disabled:opacity-50 transition-[transform,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] flex items-center justify-center gap-1.5"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <span>Continue →</span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-[1.7] p-[9px] rounded-[9px] bg-gradient-to-r from-[var(--orange)] to-[#e83800] text-white font-bold text-[0.8rem] shadow-md shadow-orange-500/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97] active:shadow-none cursor-pointer disabled:opacity-50 transition-[transform,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] flex items-center justify-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Claiming...</span>
              </>
            ) : (
              <span>Claim Bag ✓</span>
            )}
          </button>
        )}
      </div>
    </ModalShell>
  );
};
