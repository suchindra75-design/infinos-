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
      duration: 0.2,
      ease: EASE_OUT,
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -8,
    transition: {
      duration: 0.2,
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

  const [deviceCode, setDeviceCode] = useState('');
  const [channelId, setChannelId] = useState('');
  const [readApiKey, setReadApiKey] = useState('');
  const [bagName, setBagName] = useState('');

  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifyMeta, setVerifyMeta] = useState<string | null>(null);

  // Reset form state cleanly whenever modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setDirection(1);
      setDeviceCode('');
      setChannelId('');
      setReadApiKey('');
      setBagName('');
      setError(null);
      setVerifyMeta(null);
      setIsVerifying(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
    <ModalShell isOpen={isOpen} onClose={onClose} maxWidthClass="max-w-[420px]" ariaLabel="Claim Delivery Bag">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-[#171512]/08 bg-[#F2ECE0]/60 flex items-start justify-between gap-2.5 shrink-0">
        <div>
          <div className="font-editorial font-bold text-xl text-[#171512]">Claim Delivery Bag</div>
          <div className="text-xs text-[#7B746A] mt-0.5 font-body">Connect your bag to the dashboard</div>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-lg border border-[#171512]/10 bg-transparent text-[#7B746A] hover:text-[#171512] hover:bg-[#171512]/05 active:scale-[0.92] flex items-center justify-center cursor-pointer transition-[transform,background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 font-body overflow-y-auto flex-1 min-h-0 bg-[#FFF9EF]">
        {/* Stepper */}
        <div className="flex items-center mb-4">
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
              step === 1 ? 'bg-[#FC4731] text-white' : 'bg-[#10B981] text-white'
            }`}>
              {step === 1 ? '1' : '✓'}
            </div>
            <span className="text-xs font-bold text-[#171512] ml-1.5 whitespace-nowrap">Enter Code</span>
          </div>
          <div className={`flex-1 h-[1px] mx-2.5 min-w-[20px] transition-[background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${step === 2 ? 'bg-[#FC4731]' : 'bg-[#171512]/10'}`} />
          <div className="flex items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
              step === 2 ? 'bg-[#FC4731] text-white' : 'bg-[#F2ECE0] text-[#7B746A]'
            }`}>
              2
            </div>
            <span className="text-xs font-bold text-[#171512] ml-1.5 whitespace-nowrap">Name Bag</span>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-[#E11D48]/10 border border-[#E11D48]/25 rounded-xl p-3 text-xs text-[#E11D48] mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step Transition */}
        <AnimatePresence mode="wait" custom={direction}>
          {step === 1 ? (
            <motion.div
              key="step-1"
              custom={direction}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="space-y-3.5"
            >
              <div>
                <div className="text-xs font-bold text-[#171512] uppercase tracking-wider mb-1">
                  Device Code
                </div>
                <input
                  type="text"
                  placeholder="e.g. INF-XXXX-XXXX"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2ECE0]/60 border border-[#171512]/10 text-[#171512] font-mono text-sm uppercase tracking-wider focus:outline-none focus:border-[#FC4731] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  maxLength={20}
                  autoComplete="off"
                />
                <div className="text-[11px] text-[#7B746A] mt-1">
                  Enter any device code — connects to your backend & ThingSpeak
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#171512] uppercase tracking-wider mb-1">
                  ThingSpeak Channel ID
                </div>
                <input
                  type="text"
                  placeholder="Channel ID"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2ECE0]/60 border border-[#171512]/10 text-[#171512] font-mono text-sm focus:outline-none focus:border-[#FC4731] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                />
              </div>

              <div>
                <div className="text-xs font-bold text-[#171512] uppercase tracking-wider mb-1">
                  Read API Key <span className="text-[#7B746A] font-normal">(Optional)</span>
                </div>
                <input
                  type="password"
                  placeholder="Needed only for private channels"
                  value={readApiKey}
                  onChange={(e) => setReadApiKey(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2ECE0]/60 border border-[#171512]/10 text-[#171512] font-mono text-xs focus:outline-none focus:border-[#FC4731] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                />
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
              className="space-y-3.5"
            >
              <div className="bg-[#10B981]/10 border border-[#10B981]/25 rounded-xl p-3 flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-[#10B981] text-xs">Device Verified!</div>
                  <div className="text-xs text-[#7B746A] mt-0.5 leading-snug">{verifyMeta}</div>
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-[#171512] uppercase tracking-wider mb-1">
                  Bag Name
                </div>
                <input
                  type="text"
                  placeholder="e.g. Hot Bag Zone A, Cold Delivery #1"
                  value={bagName}
                  onChange={(e) => setBagName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-[#F2ECE0]/60 border border-[#171512]/10 text-[#171512] text-sm focus:outline-none focus:border-[#FC4731] transition-[border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="p-4 flex gap-2 font-body shrink-0 border-t border-[#171512]/08 bg-[#F2ECE0]/60">
        <button
          type="button"
          onClick={() => {
            if (step === 2) {
              handleBack();
            } else {
              onClose();
            }
          }}
          className="flex-1 py-2.5 rounded-xl bg-[#FFF9EF] border border-[#171512]/10 text-[#171512] font-bold text-xs cursor-pointer hover:bg-[#F2ECE0] active:scale-[0.97] transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] min-h-[42px]"
        >
          {step === 1 ? 'Cancel' : '← Back'}
        </button>

        {step === 1 ? (
          <button
            type="button"
            onClick={handleStep1Next}
            disabled={isVerifying}
            className="flex-[1.7] py-2.5 rounded-xl bg-[#FC4731] text-white font-bold text-xs shadow-sm shadow-[#FC4731]/25 hover:bg-[#e03a25] active:scale-[0.97] active:shadow-none cursor-pointer disabled:opacity-50 transition-[transform,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] flex items-center justify-center gap-1.5 min-h-[42px]"
          >
            {isVerifying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
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
            className="flex-[1.7] py-2.5 rounded-xl bg-[#FC4731] text-white font-bold text-xs shadow-sm shadow-[#FC4731]/25 hover:bg-[#e03a25] active:scale-[0.97] active:shadow-none cursor-pointer disabled:opacity-50 transition-[transform,box-shadow,opacity] duration-[var(--dur-base)] ease-[var(--ease-out)] flex items-center justify-center gap-1.5 min-h-[42px]"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
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
