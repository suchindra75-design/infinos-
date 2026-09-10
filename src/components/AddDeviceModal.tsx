import React, { useState } from 'react';
import { X, Plus, Radio, Key, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../api/client';
import { CreateDeviceInput } from '../types';

interface AddDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceCreated: () => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({
  isOpen,
  onClose,
  onDeviceCreated,
}) => {
  const [deviceCode, setDeviceCode] = useState('');
  const [name, setName] = useState('');
  const [thingSpeakChannelId, setThingSpeakChannelId] = useState('');
  const [thingSpeakReadApiKey, setThingSpeakReadApiKey] = useState('');

  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    connected: boolean;
    channelName?: string;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!thingSpeakChannelId.trim()) {
      setError('Enter ThingSpeak Channel ID first to test connection.');
      return;
    }
    setError(null);
    setTestResult(null);
    setIsTesting(true);

    try {
      const result = await api.devices.testConnection({
        thingSpeakChannelId: thingSpeakChannelId.trim(),
        thingSpeakReadApiKey: thingSpeakReadApiKey.trim() || undefined,
      });
      setTestResult(result);
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!deviceCode.trim() || !name.trim() || !thingSpeakChannelId.trim()) {
      setError('Device Code, Name, and ThingSpeak Channel ID are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const input: CreateDeviceInput = {
        deviceCode: deviceCode.trim(),
        name: name.trim(),
        thingSpeakChannelId: thingSpeakChannelId.trim(),
        thingSpeakReadApiKey: thingSpeakReadApiKey.trim() || undefined,
      };

      await api.devices.create(input);
      setSuccess('Smart Delivery Bag registered successfully.');

      // Clear sensitive field immediately
      setThingSpeakReadApiKey('');

      setTimeout(() => {
        onDeviceCreated();
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to register Smart Delivery Bag.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[var(--surface)] border border-[var(--border-strong)] rounded-[var(--radius-lg)] w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-[var(--text)]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-[var(--text)] font-display">Claim Delivery Bag</h3>
            <p className="text-xs text-[var(--muted)] font-body">Connect your bag to the dashboard</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] flex items-center justify-center transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps indicator */}
        <div className="px-6 pt-4 pb-1">
          <div className="steps">
            <div className="step">
              <div className={`step-dot ${name ? 'done' : 'active'}`}>1</div>
              <div className="step-label">Enter Code</div>
            </div>
            <div className="step-line" />
            <div className="step">
              <div className={`step-dot ${name ? 'active' : ''}`}>2</div>
              <div className="step-label">Name Bag</div>
            </div>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4 font-body">
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

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                testResult.connected
                  ? 'bg-[var(--green)]/10 border-[var(--green)]/30 text-[var(--green)]'
                  : 'bg-[var(--yellow)]/10 border-[var(--yellow)]/30 text-[var(--yellow)]'
              }`}
            >
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[var(--green)]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[var(--yellow)]" />
              )}
              <div>
                <span className="font-semibold block">{testResult.message}</span>
                {testResult.channelName && (
                  <span className="text-[10px] text-[var(--muted)] font-data">Channel Name: {testResult.channelName}</span>
                )}
              </div>
            </div>
          )}

          {/* Device Code */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 font-body">
              Device Code <span className="text-[var(--orange)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BAG-001, MED-BAG-NORTH"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              required
            />
          </div>

          {/* Bag Name */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 font-body">
              Bag Descriptive Name <span className="text-[var(--orange)]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cold-Chain Pharma Unit #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
              required
            />
          </div>

          {/* ThingSpeak Channel ID */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Channel ID <span className="text-[var(--orange)]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 1234567"
                value={thingSpeakChannelId}
                onChange={(e) => setThingSpeakChannelId(e.target.value)}
                className="flex-1 bg-[var(--surface2)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
                required
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !thingSpeakChannelId}
                className="px-3 py-2 text-xs font-medium bg-[var(--surface2)] hover:bg-[var(--surface)] text-[var(--text)] rounded-lg border border-[var(--border)] transition disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* Optional ThingSpeak Read API Key */}
          <div>
            <label className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Read API Key <span className="text-[var(--muted)] font-normal">(Optional for private channels)</span>
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Encrypted server-side, never exposed to client"
                value={thingSpeakReadApiKey}
                onChange={(e) => setThingSpeakReadApiKey(e.target.value)}
                className="w-full bg-[var(--surface2)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-sm font-data text-[var(--text)] focus:outline-none focus:border-[var(--orange)]"
                autoComplete="off"
              />
              <Key className="w-4 h-4 text-[var(--muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10px] text-[var(--muted)] mt-1">
              Protected by AES-256 server-side encryption. Stored exclusively in PostgreSQL.
            </p>
          </div>

          {/* Info Box */}
          <div className="info-box">
            <strong className="text-[var(--text)]">📡 Live Data Source</strong>
            <br />
            ThingSpeak Channel 3297681
            <br />
            Field 3 = Hot Zone Temp · Field 1 = Cold Zone Temp · Field 4 = Humidity
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[var(--orange)] hover:bg-[var(--orange)]/90 rounded-lg transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Registering...' : 'Register Bag'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
