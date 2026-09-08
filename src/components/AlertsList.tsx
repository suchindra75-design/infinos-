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
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
            System Alerts & Exceptions
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            ({filteredAlerts.length} total)
          </span>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scope Toggle */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => onChangeFilterScope('device')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterScope === 'device'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {selectedDeviceCode ? `Bag: ${selectedDeviceCode}` : 'Selected Bag'}
            </button>
            <button
              onClick={() => onChangeFilterScope('all')}
              className={`px-2.5 py-1 rounded font-medium transition ${
                filterScope === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fleetwide
            </button>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="resolved">Resolved Only</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warning Only</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      {filteredAlerts.length === 0 ? (
        <div className="p-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/60">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/60 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-300">No matching alerts found</p>
          <p className="text-xs text-slate-500 mt-0.5">
            Smart delivery compartments are operating within certified operating limits.
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 divide-y divide-slate-800/40">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                alert.isResolved
                  ? 'bg-slate-950/40 border-slate-800/40 opacity-75'
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
                    <span className="text-xs font-mono font-medium text-slate-300">
                      [{alert.device.deviceCode}]
                    </span>
                  )}
                  <span className="text-xs font-semibold text-slate-200">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  {alert.isResolved ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40 font-medium">
                      <Check className="w-2.5 h-2.5" /> Resolved
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40 font-medium">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{alert.message}</p>

                <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Triggered: {formatDate(alert.triggeredAt)}
                  </span>
                  {alert.triggerValue !== null && alert.thresholdValue !== null && (
                    <span className="font-mono text-slate-400">
                      Value: <strong>{alert.triggerValue}</strong> (Limit: {alert.thresholdValue})
                    </span>
                  )}
                  {alert.isResolved && alert.resolvedAt && (
                    <span className="text-emerald-500/80">
                      Resolved: {formatDate(alert.resolvedAt)}
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-600/40 transition disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      {resolvingId === alert.id ? 'Resolving...' : 'Resolve'}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-500 italic">Sign in to resolve</span>
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
