import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, Filter, Clock } from 'lucide-react';
import { Alert as AlertType } from '../types';

interface AlertsListProps {
  alerts: AlertType[];
  isLoading: boolean;
  error: string | null;
  onAcknowledgeAlert?: (alertId: string) => Promise<void>;
  onResolveAlert?: (alertId: string) => Promise<void>;
}

export const AlertsList: React.FC<AlertsListProps> = ({
  alerts,
  isLoading,
  error,
  onAcknowledgeAlert,
  onResolveAlert,
}) => {
  const [filterScope, setFilterScope] = useState<'all' | 'unresolved' | 'critical'>('unresolved');
  const [actioningId, setActioningId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filterScope === 'unresolved') return !alert.isResolved;
      if (filterScope === 'critical') return alert.severity === 'CRITICAL' && !alert.isResolved;
      return true;
    });
  }, [alerts, filterScope]);

  const unresolvedCount = useMemo(() => alerts.filter((a) => !a.isResolved).length, [alerts]);
  const criticalCount = useMemo(() => alerts.filter((a) => a.severity === 'CRITICAL' && !a.isResolved).length, [alerts]);

  const handleAcknowledge = async (id: string) => {
    if (!onAcknowledgeAlert) return;
    setActioningId(id);
    try {
      await onAcknowledgeAlert(id);
    } finally {
      setActioningId(null);
    }
  };

  const handleResolve = async (id: string) => {
    if (!onResolveAlert) return;
    setActioningId(id);
    try {
      await onResolveAlert(id);
    } finally {
      setActioningId(null);
    }
  };

  const getSeverityBadge = (severity: AlertType['severity']) => {
    switch (severity) {
      case 'CRITICAL':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#E11D48]/10 border border-[#E11D48]/25 text-[#E11D48] text-[10px] font-extrabold uppercase tracking-wider">
            Critical
          </span>
        );
      case 'WARNING':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#FC4731]/10 border border-[#FC4731]/25 text-[#FC4731] text-[10px] font-extrabold uppercase tracking-wider">
            Warning
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#0284C7]/10 border border-[#0284C7]/25 text-[#0284C7] text-[10px] font-extrabold uppercase tracking-wider">
            Info
          </span>
        );
    }
  };

  return (
    <div className="bg-[#FFF9EF] border border-[#171512]/10 rounded-2xl p-4 sm:p-6 space-y-4 shadow-md shadow-[#171512]/04">
      {/* Header & Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-[#FC4731] shrink-0" />
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#171512] font-display">
            Automated Incident Log
          </h3>
          <span className="text-xs text-[#7B746A] font-mono">({filteredAlerts.length})</span>
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex items-center bg-[#F2ECE0] p-1 rounded-xl border border-[#171512]/06 text-xs font-body">
          <button
            onClick={() => setFilterScope('unresolved')}
            className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer flex items-center gap-1.5 ${
              filterScope === 'unresolved'
                ? 'bg-[#FC4731] text-white shadow-xs'
                : 'text-[#7B746A] hover:text-[#171512]'
            }`}
          >
            <span>Unresolved</span>
            {unresolvedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-[#FC4731] font-bold">
                {unresolvedCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterScope('critical')}
            className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer flex items-center gap-1.5 ${
              filterScope === 'critical'
                ? 'bg-[#E11D48] text-white shadow-xs'
                : 'text-[#7B746A] hover:text-[#171512]'
            }`}
          >
            <span>Critical</span>
            {criticalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-white text-[#E11D48] font-bold">
                {criticalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setFilterScope('all')}
            className={`px-3 py-1 rounded-lg font-bold transition-[background-color,color] duration-[var(--dur-fast)] ease-[var(--ease-out)] cursor-pointer ${
              filterScope === 'all'
                ? 'bg-[#171512] text-white shadow-xs'
                : 'text-[#7B746A] hover:text-[#171512]'
            }`}
          >
            All Logs
          </button>
        </div>
      </div>

      {/* List Content */}
      {error ? (
        <div className="p-4 text-center text-[#E11D48] text-xs font-body">Failed to load alerts: {error}</div>
      ) : filteredAlerts.length === 0 ? (
        <div className="p-8 text-center text-[#7B746A] text-xs font-body flex flex-col items-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-[#10B981]" />
          <span className="font-bold text-[#171512]">No active incident alerts in this view</span>
          <span>All monitored compartment parameters are currently within configured safety thresholds.</span>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-[background-color,border-color] duration-[var(--dur-fast)] ease-[var(--ease-out)] ${
                alert.isResolved
                  ? 'bg-[#F2ECE0]/40 border-[#171512]/06 opacity-70'
                  : alert.severity === 'CRITICAL'
                  ? 'bg-[#E11D48]/05 border-[#E11D48]/25'
                  : 'bg-[#FC4731]/05 border-[#FC4731]/25'
              }`}
            >
              {/* Alert Content */}
              <div className="space-y-1.5 min-w-0 flex-1 overflow-hidden font-body">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {getSeverityBadge(alert.severity)}
                  {alert.device && (
                    <span className="text-xs font-mono font-bold text-[#171512] bg-[#F2ECE0] px-2 py-0.5 rounded border border-[#171512]/08 truncate max-w-[130px]" title={alert.device.deviceCode}>
                      [{alert.device.deviceCode}]
                    </span>
                  )}
                  <span className="text-xs font-bold text-[#171512] truncate">
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                  {alert.isResolved && (
                    <span className="text-[10px] text-[#10B981] font-bold bg-[#10B981]/10 px-2 py-0.5 rounded">
                      RESOLVED
                    </span>
                  )}
                </div>

                <p className="text-xs text-[#171512] font-medium leading-relaxed line-clamp-3">{alert.message}</p>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#7B746A]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3 text-[#7B746A]" />
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </span>
                  {alert.triggerValue !== null && (
                    <span>
                      Triggered Value: <strong className="font-mono text-[#171512]">{alert.triggerValue}</strong>
                    </span>
                  )}
                  {alert.thresholdValue !== null && (
                    <span>
                      Threshold Limit: <strong className="font-mono text-[#7B746A]">{alert.thresholdValue}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!alert.isResolved && (
                <div className="flex items-center gap-2 shrink-0 font-body">
                  {!alert.acknowledgedAt && onAcknowledgeAlert && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      disabled={actioningId === alert.id}
                      className="px-3 py-1.5 rounded-lg border border-[#171512]/15 bg-[#FFF9EF] text-xs font-bold text-[#171512] hover:bg-[#F2ECE0] active:scale-[0.97] cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                    >
                      Acknowledge
                    </button>
                  )}
                  {onResolveAlert && (
                    <button
                      onClick={() => handleResolve(alert.id)}
                      disabled={actioningId === alert.id}
                      className="px-3 py-1.5 rounded-lg bg-[#10B981] text-xs font-bold text-white shadow-xs hover:bg-[#059669] active:scale-[0.97] cursor-pointer transition-[transform,background-color] duration-[var(--dur-fast)] ease-[var(--ease-out)]"
                    >
                      Resolve
                    </button>
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
