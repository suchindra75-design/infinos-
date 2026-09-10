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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0e1014] border border-white/[0.1] rounded-2xl w-full max-w-md shadow-2xl shadow-black/80 overflow-hidden flex flex-col text-zinc-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-[#ff6b00]">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white font-display">Register Smart Bag</h3>
              <p className="text-xs text-zinc-400 font-body">Onboard a bag into the INFINOS fleet</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 font-body">
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

          {testResult && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
                testResult.connected
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
              }`}
            >
              {testResult.connected ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
              )}
              <div>
                <span className="font-semibold block">{testResult.message}</span>
                {testResult.channelName && (
                  <span className="text-[10px] text-zinc-400 font-data">Channel Name: {testResult.channelName}</span>
                )}
              </div>
            </div>
          )}

          {/* Device Code */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              Device Code <span className="text-[#ff6b00]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. BAG-001, MED-BAG-NORTH"
              value={deviceCode}
              onChange={(e) => setDeviceCode(e.target.value.toUpperCase())}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 text-sm font-data text-white focus:outline-none focus:border-[#ff6b00]"
              required
            />
          </div>

          {/* Bag Name */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              Bag Descriptive Name <span className="text-[#ff6b00]">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Cold-Chain Pharma Unit #1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#ff6b00]"
              required
            />
          </div>

          {/* ThingSpeak Channel ID */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Channel ID <span className="text-[#ff6b00]">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. 1234567"
                value={thingSpeakChannelId}
                onChange={(e) => setThingSpeakChannelId(e.target.value)}
                className="flex-1 bg-[#07080a] border border-white/[0.1] rounded-lg px-3 py-2 text-sm font-data text-white focus:outline-none focus:border-[#ff6b00]"
                required
              />
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !thingSpeakChannelId}
                className="px-3 py-2 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg border border-white/[0.08] transition disabled:opacity-50 shrink-0 cursor-pointer"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Test'}
              </button>
            </div>
          </div>

          {/* Optional ThingSpeak Read API Key */}
          <div>
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider block mb-1 font-body">
              ThingSpeak Read API Key <span className="text-zinc-500 font-normal">(Optional for private channels)</span>
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Encrypted server-side, never exposed to client"
                value={thingSpeakReadApiKey}
                onChange={(e) => setThingSpeakReadApiKey(e.target.value)}
                className="w-full bg-[#07080a] border border-white/[0.1] rounded-lg pl-9 pr-3 py-2 text-sm font-data text-white focus:outline-none focus:border-[#ff6b00]"
                autoComplete="off"
              />
              <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            <p className="text-[10px] text-zinc-500 mt-1">
              Protected by AES-256 server-side encryption. Stored exclusively in PostgreSQL.
            </p>
          </div>

          {/* Action Buttons */}
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] rounded-lg transition shadow-lg shadow-orange-500/20 disabled:opacity-50 cursor-pointer"
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
