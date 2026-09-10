import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  Check,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { Alert, AlertSeverity } from '../types';
import { useAuth } from '../context/AuthContext';

interface AlertsListProps {
  alerts: Alert[];
  isLoading: boolean;
  onResolveAlert: (alertId: string) => Promise<void>;
  filterScope: 'device' | 'all';
  onChangeFilterScope: (scope: 'device' | 'all') => void;
  selectedDeviceCode?: string;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  isLoading,
  onResolveAlert,
  filterScope,
  onChangeFilterScope,
  selectedDeviceCode,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'resolved'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'CRITICAL' | 'WARNING'>('all');

  const canResolve = isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'OPERATOR');

  const handleResolve = async (id: string) => {
    setResolvingId(id);
    try {
      await onResolveAlert(id);
    } finally {
      setResolvingId(null);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    if (statusFilter === 'active' && a.isResolved) return false;
    if (statusFilter === 'resolved' && !a.isResolved) return false;
    if (severityFilter !== 'all' && a.severity !== severityFilter) return false;
    return true;
  });

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            CRITICAL
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30 uppercase">
            INFO
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-[#0e1014] border border-white/[0.08] rounded-xl p-4 sm:p-5 space-y-4 shadow-lg shadow-black/30">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 font-display">
            System Alerts & Exceptions
          </h3>
          <span className="text-xs text-zinc-500 font-data">
            ({filteredAlerts.length} total)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 font-body">
          {/* Scope Toggle */}
          <div className="flex items-center bg-[#07080a] p-0.5 rounded-lg border border-white/[0.08] text-xs">
            <button
              onClick={() => onChangeFilterScope('device')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                filterScope === 'device'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {selectedDeviceCode ? `Bag: ${selectedDeviceCode}` : 'Active Bag'}
            </button>
            <button
              onClick={() => onChangeFilterScope('all')}
              className={`px-2.5 py-1 rounded font-medium transition cursor-pointer ${
                filterScope === 'all'
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Fleetwide
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-[#07080a] text-zinc-300 border border-white/[0.1] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-[#07080a] text-zinc-300 border border-white/[0.1] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-orange-500"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="p-8 text-center bg-[#07080a] rounded-xl border border-white/[0.06]">
          <CheckCircle2 className="w-8 h-8 text-emerald-400/80 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-200 font-display">All Compartments Nominal</p>
          <p className="text-xs text-zinc-500 font-body mt-0.5">
            Smart delivery compartments are operating within certified temperature and humidity thresholds.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-white/[0.04]">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                alert.isResolved
                  ? 'bg-[#0a0b0e] border-white/[0.06] opacity-75'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-rose-950/20 border-rose-900/40'
                  : 'bg-amber-950/20 border-amber-900/40'
              }`}
            >
              {/* Alert Content */}
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getSeverityBadge(alert.severity)}
                  {alert.device && (
                    <span className="text-xs font-data font-medium text-zinc-300">
                      [{alert.device.deviceCode}]
                    </span>
                  )}
                  <span className="text-xs font-semibold text-zinc-200 font-body">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  {alert.isResolved ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold uppercase">
                      <Check className="w-2.5 h-2.5" /> Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30 font-bold uppercase">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-zinc-300 line-clamp-2 font-body">{alert.message}</p>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500 font-body">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Triggered: <span className="font-data text-zinc-400">{formatDate(alert.triggeredAt)}</span>
                  </span>
                  {alert.triggerValue !== null && alert.thresholdValue !== null && (
                    <span className="font-data text-zinc-400">
                      Value: <strong className="text-zinc-200">{alert.triggerValue}</strong> (Limit: {alert.thresholdValue})
                    </span>
                  )}
                  {alert.isResolved && alert.resolvedAt && (
                    <span className="text-emerald-400">
                      Resolved: <span className="font-data">{formatDate(alert.resolvedAt)}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Action Button */}
              {!alert.isResolved && (
                <div className="shrink-0">
                  {canResolve ? (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={resolvingId === alert.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition disabled:opacity-50 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-zinc-500 italic font-body">Sign in to resolve</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
