import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, RefreshCw, Plus, Settings, FileText, Smartphone } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { api } from './api/client';
import {
  SafeDevice,
  AnalyticsSummary,
  SensorReading,
  DeviceStatusResponse,
  Alert,
  DeviceSettings,
} from './types';
import { Header, NavTab } from './components/Header';
import { DeviceSelector } from './components/DeviceSelector';
import { LiveTelemetryCard } from './components/LiveTelemetryCard';
import { AnalyticsSummarySection } from './components/AnalyticsSummarySection';
import { TelemetryChart } from './components/TelemetryChart';
import { AlertsList } from './components/AlertsList';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';
import { AddDeviceModal } from './components/AddDeviceModal';
import { StatusBanner } from './components/StatusBanner';
import { AuthModal } from './components/AuthModal';

const DashboardContent: React.FC = () => {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Navigation tab
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('dashboard');

  // Fleet and Device States
  const [devices, setDevices] = useState<SafeDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SafeDevice | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);

  // Telemetry & Device Metadata States
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [statusInfo, setStatusInfo] = useState<DeviceStatusResponse | null>(null);
  const [timeseries, setTimeseries] = useState<SensorReading[]>([]);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertsScope, setAlertsScope] = useState<'device' | 'all'>('device');

  // Chart & Controls States
  const [timeRange, setTimeRange] = useState<string>('24h');
  const [refreshInterval, setRefreshInterval] = useState<number>(15); // default 15s
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Loading & Error States
  const [isTelemetryLoading, setIsTelemetryLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [backendConnected, setBackendConnected] = useState<boolean>(true);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // Request guards to prevent duplicate/overlapping fetches
  const isFetchingRef = useRef<boolean>(false);
  const isFetchingDevicesRef = useRef<boolean>(false);

  // Automatically show auth UI when unauthenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setIsAuthOpen(true);
    } else if (isAuthenticated) {
      setIsAuthOpen(false);
    }
  }, [isAuthLoading, isAuthenticated]);

  // Fetch registered devices list with strict auth check and deduplication
  const fetchDevices = useCallback(async () => {
    if (!isAuthenticated) {
      setDevices([]);
      setSelectedDevice(null);
      setIsLoadingDevices(false);
      return;
    }

    if (isFetchingDevicesRef.current) return;
    isFetchingDevicesRef.current = true;
    setIsLoadingDevices(true);

    try {
      const list = await api.devices.list();
      setDevices(list);
      setBackendConnected(true);

      // Maintain selection or select first
      if (list.length > 0) {
        setSelectedDevice((prev) => {
          if (prev && list.some((d) => d.id === prev.id)) {
            return list.find((d) => d.id === prev.id)!;
          }
          return list[0];
        });
      } else {
        setSelectedDevice(null);
      }
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR' || err.status === 502 || err.status === 503) {
        setBackendConnected(false);
      }
      setDevices([]);
      setSelectedDevice(null);
    } finally {
      setIsLoadingDevices(false);
      isFetchingDevicesRef.current = false;
    }
  }, [isAuthenticated]);

  // Fetch telemetry for currently selected device
  const fetchDeviceData = useCallback(async (device: SafeDevice, silent: boolean = false) => {
    if (!isAuthenticated) return;
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

    if (!silent) setIsTelemetryLoading(true);
    setTelemetryError(null);
    setTimeseriesError(null);

    // Calculate time range parameters
    let from: string | undefined;
    const now = new Date();
    let limit = 100;

    if (timeRange === '1h') {
      from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      limit = 30;
    } else if (timeRange === '6h') {
      from = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      limit = 60;
    } else if (timeRange === '24h') {
      from = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      limit = 100;
    } else if (timeRange === '7d') {
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      limit = 250;
    }

    try {
      // Parallel requests for all telemetry facets
      const [summaryRes, statusRes, timeseriesRes, settingsRes, alertsRes] = await Promise.allSettled([
        api.analytics.getSummary(device.id, from ? { from } : undefined),
        api.devices.getStatus(device.id),
        api.analytics.getTimeseries(device.id, { from, limit }),
        api.settings.get(device.id),
        alertsScope === 'device'
          ? api.alerts.listDeviceAlerts(device.id)
          : api.alerts.list({ limit: 50 }),
      ]);

      setBackendConnected(true);

      if (summaryRes.status === 'fulfilled') {
        setSummary(summaryRes.value);
      } else {
        setTelemetryError(summaryRes.reason?.message || 'Failed to load telemetry summary');
      }

      if (statusRes.status === 'fulfilled') {
        setStatusInfo(statusRes.value);
      }

      if (timeseriesRes.status === 'fulfilled') {
        setTimeseries(timeseriesRes.value.readings);
      } else {
        setTimeseriesError(timeseriesRes.reason?.message || 'Failed to load timeseries');
      }

      if (settingsRes.status === 'fulfilled') {
        setSettings(settingsRes.value);
      }

      if (alertsRes.status === 'fulfilled') {
        setAlerts(alertsRes.value.alerts);
      }

      setLastRefreshed(new Date());
    } catch (err: any) {
      if (err.code === 'NETWORK_ERROR') {
        setBackendConnected(false);
      }
    } finally {
      if (!silent) setIsTelemetryLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, timeRange, alertsScope]);

  // Load devices only when authentication has been confirmed
  useEffect(() => {
    if (isAuthLoading) {
      // Session restoration is in progress; do not request protected device data
      return;
    }

    if (isAuthenticated) {
      fetchDevices();
    } else {
      setDevices([]);
      setSelectedDevice(null);
      setIsLoadingDevices(false);
    }
  }, [isAuthLoading, isAuthenticated, fetchDevices]);

  // Load telemetry when selected device or time range changes
  useEffect(() => {
    if (isAuthenticated && selectedDevice) {
      fetchDeviceData(selectedDevice, false);
    } else {
      setSummary(null);
      setStatusInfo(null);
      setTimeseries([]);
      setAlerts([]);
    }
  }, [isAuthenticated, selectedDevice, fetchDeviceData]);

  // Auto-refresh interval effect (only when authenticated)
  useEffect(() => {
    if (!isAuthenticated || !refreshInterval || refreshInterval <= 0 || !selectedDevice) return;

    const intervalId = setInterval(() => {
      fetchDeviceData(selectedDevice, true);
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, refreshInterval, selectedDevice, fetchDeviceData]);

  // Manual ThingSpeak to PostgreSQL synchronization
  const handleManualSync = async () => {
    if (!isAuthenticated || !selectedDevice || isSyncing) return;
    setIsSyncing(true);
    try {
      await api.devices.sync(selectedDevice.id);
      // Immediately refresh telemetry after sync
      await fetchDeviceData(selectedDevice, false);
      await fetchDevices();
    } catch (err: any) {
      alert(`Sync failed: ${err.message || 'Error communicating with backend'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Alert resolution handler
  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.alerts.resolve(alertId);
      // Refresh alerts list and summary
      if (selectedDevice) {
        fetchDeviceData(selectedDevice, true);
      }
    } catch (err: any) {
      alert(`Failed to resolve alert: ${err.message || 'Unauthorized or server error'}`);
    }
  };

  // Update Settings handler
  const handleSaveSettings = async (data: any) => {
    if (!selectedDevice) return;
    const updated = await api.settings.update(selectedDevice.id, data);
    setSettings(updated);
    if (selectedDevice) {
      fetchDeviceData(selectedDevice, true);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#07080a] infinos-grid-bg text-zinc-100 flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
          <span className="text-xs text-zinc-400 font-display tracking-wider uppercase">Restoring Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] infinos-grid-bg text-zinc-100 flex flex-col font-body selection:bg-orange-500/30 selection:text-orange-200 relative">
      {/* Header */}
      <Header
        selectedDevice={selectedDevice}
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        onOpenAddDevice={() => setIsAddDeviceOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onManualSync={handleManualSync}
        isSyncing={isSyncing}
        refreshInterval={refreshInterval}
        onChangeRefreshInterval={setRefreshInterval}
        lastRefreshed={lastRefreshed}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Backend & Device Status Banner */}
        <StatusBanner
          backendConnected={backendConnected}
          statusInfo={statusInfo}
          errorMessage={telemetryError}
        />

        {!isAuthenticated ? (
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-8 sm:p-12 text-center max-w-md mx-auto shadow-sm my-8 font-body">
            <div className="w-14 h-14 rounded-2xl bg-[var(--orange)]/10 border border-[var(--orange)]/20 text-[var(--orange)] flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold font-display text-[var(--text)] mb-2">
              Sign In to INFINOS
            </h2>
            <p className="text-sm text-[var(--muted)] font-body mb-6">
              Authentication is required to view registered delivery compartments, inspect live sensor telemetry, and manage device settings.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--orange)] hover:bg-[var(--orange)]/90 text-white font-semibold text-sm shadow-md transition cursor-pointer font-body"
            >
              <LogIn className="w-4 h-4" />
              <span>Open Sign In</span>
            </button>
          </div>
        ) : (
          <>
            {/* INFINOS Page Header */}
            <div className="page-header">
              <div>
                <h1 className="page-title">
                  {activeNavTab === 'dashboard'
                    ? 'Smart Bag Dashboard'
                    : activeNavTab === 'devices'
                    ? 'Fleet Devices'
                    : 'Telemetry Analytics'}
                </h1>
                <p className="page-sub">
                  {activeNavTab === 'dashboard'
                    ? 'Real-time temperature monitoring for your delivery bags'
                    : activeNavTab === 'devices'
                    ? 'Manage registered delivery bags and ThingSpeak telemetry channels'
                    : 'Compartment metrics, statistical distribution, and historical compliance'}
                </p>
              </div>
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="refresh-btn"
                title="Refresh telemetry"
              >
                <RefreshCw className={`w-3 h-3 text-[var(--orange)] ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* INFINOS Top Stats Row */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,107,53,.09)' }}>📦</div>
                <div className="stat-label">Total Bags</div>
                <div className="stat-value">{devices.length}</div>
                <div className="stat-desc">Registered</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(52,211,153,.09)' }}>🟢</div>
                <div className="stat-label">Online</div>
                <div className="stat-value" style={{ color: 'var(--green)' }}>
                  {devices.filter(d => d.status === 'ONLINE').length}
                </div>
                <div className="stat-desc">Active now</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(255,107,53,.09)' }}>🔥</div>
                <div className="stat-label">Avg Hot Temp</div>
                <div className="stat-value" style={{ color: 'var(--hot)' }}>
                  {summary?.hot?.avg != null ? `${summary.hot.avg.toFixed(1)}°C` : '—'}
                </div>
                <div className="stat-desc">Target: &gt;50°C</div>
              </div>

              <div className="stat-card">
                <div className="stat-icon" style={{ background: 'rgba(56,189,248,.09)' }}>❄️</div>
                <div className="stat-label">Avg Cold Temp</div>
                <div className="stat-value" style={{ color: 'var(--cold)' }}>
                  {summary?.cold?.avg != null ? `${summary.cold.avg.toFixed(1)}°C` : '—'}
                </div>
                <div className="stat-desc">Target: &lt;8°C</div>
              </div>
            </div>

            {/* Device Selector & Quick Actions */}
            <DeviceSelector
              devices={devices}
              selectedDevice={selectedDevice}
              onSelectDevice={setSelectedDevice}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onOpenExport={() => setIsExportOpen(true)}
              onOpenAddDevice={() => setIsAddDeviceOpen(true)}
              isLoading={isLoadingDevices}
            />

            {/* Active Views */}
            {activeNavTab === 'dashboard' && (
              <div className="mb-6">
                <div className="section-title">
                  <i />
                  <span>Live Monitor</span>
                </div>

                <div className="monitor-panel">
                  {!selectedDevice ? (
                    <div className="empty-monitor">
                      <div className="empty-icon">📡</div>
                      <div className="empty-title">Select a bag to monitor</div>
                      <div className="empty-desc">
                        Tap any bag card above to view real-time temperature readings and history charts.
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Monitor Panel Header */}
                      <div className="mp-header flex-wrap sm:flex-nowrap">
                        <div>
                          <div className="mp-title flex items-center gap-1.5">
                            <span>🔴 Live: {selectedDevice.name}</span>
                          </div>
                          <div className="mp-meta">
                            Code: {selectedDevice.deviceCode} · Channel {selectedDevice.thingSpeakChannelId} · Auto-refresh every {refreshInterval}s
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2 sm:mt-0">
                          <div className="live-badge">LIVE</div>
                          <button
                            className="btn-export"
                            onClick={() => setIsExportOpen(true)}
                            title="Download PDF report"
                          >
                            Download PDF
                          </button>
                          <button
                            className="btn-export"
                            onClick={() => setIsSettingsOpen(true)}
                            title="Threshold and alert settings"
                          >
                            Settings
                          </button>
                        </div>
                      </div>

                      {/* Monitor Panel Body */}
                      <div className="mp-body space-y-4">
                        {/* Live Telemetry Cards */}
                        <LiveTelemetryCard
                          summary={summary}
                          statusInfo={statusInfo}
                          settings={settings}
                          isLoading={isTelemetryLoading}
                          error={telemetryError}
                        />

                        {/* Chronological History Chart */}
                        <TelemetryChart
                          readings={timeseries}
                          isLoading={isTelemetryLoading}
                          timeRange={timeRange}
                          onChangeTimeRange={setTimeRange}
                          error={timeseriesError}
                        />

                        {/* Operational Alerts & Incidents */}
                        <AlertsList
                          alerts={alerts}
                          isLoading={isTelemetryLoading}
                          onResolveAlert={handleResolveAlert}
                          filterScope={alertsScope}
                          onChangeFilterScope={setAlertsScope}
                          selectedDeviceCode={selectedDevice.deviceCode}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeNavTab === 'devices' && (
              <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius)] p-5 space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text)] font-display">
                      Registered Fleet Catalog
                    </h3>
                    <p className="text-xs text-[var(--muted)] font-body mt-0.5">
                      View all registered smart delivery compartments with their ThingSpeak telemetry mappings.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAddDeviceOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--orange)] text-white text-xs font-semibold cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Register New Bag</span>
                  </button>
                </div>

                {devices.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[var(--muted)] font-body">
                    No devices registered yet. Click &quot;Register New Bag&quot; to connect a ThingSpeak channel.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="border-b border-[var(--border)] text-[var(--muted)] uppercase font-semibold">
                          <th className="py-2.5 px-3">Device Code</th>
                          <th className="py-2.5 px-3">Bag Name</th>
                          <th className="py-2.5 px-3">ThingSpeak Channel</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-body">
                        {devices.map((dev) => (
                          <tr
                            key={dev.id}
                            className={`hover:bg-[var(--surface2)]/50 transition cursor-pointer ${
                              selectedDevice?.id === dev.id ? 'bg-[var(--surface2)] font-semibold' : ''
                            }`}
                            onClick={() => setSelectedDevice(dev)}
                          >
                            <td className="py-3 px-3 font-data text-[var(--orange)] font-bold">
                              {dev.deviceCode}
                            </td>
                            <td className="py-3 px-3 text-[var(--text)] font-medium">{dev.name}</td>
                            <td className="py-3 px-3 font-data text-[var(--muted)]">
                              #{dev.thingSpeakChannelId}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                  dev.status === 'ONLINE'
                                    ? 'bg-[var(--green)]/15 text-[var(--green)]'
                                    : 'bg-[var(--muted)]/15 text-[var(--muted)]'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    dev.status === 'ONLINE' ? 'bg-[var(--green)]' : 'bg-[var(--muted)]'
                                  }`}
                                />
                                {dev.status}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="inline-flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setIsSettingsOpen(true);
                                  }}
                                  title="Bag Threshold Settings"
                                  className="p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] transition"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedDevice(dev);
                                    setIsExportOpen(true);
                                  }}
                                  title="Export Telemetry Data"
                                  className="p-1.5 rounded-md hover:bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--text)] border border-transparent hover:border-[var(--border)] transition"
                                >
                                  <FileText className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeNavTab === 'analytics' && selectedDevice && (
              <>
                {/* Analytics KPI Matrix Summary */}
                <AnalyticsSummarySection
                  summary={summary}
                  isLoading={isTelemetryLoading}
                />

                {/* Chronological History Chart */}
                <TelemetryChart
                  readings={timeseries}
                  isLoading={isTelemetryLoading}
                  timeRange={timeRange}
                  onChangeTimeRange={setTimeRange}
                  error={timeseriesError}
                />

                {/* Operational Alerts & Incidents */}
                <AlertsList
                  alerts={alerts}
                  isLoading={isTelemetryLoading}
                  onResolveAlert={handleResolveAlert}
                  filterScope={alertsScope}
                  onChangeFilterScope={setAlertsScope}
                  selectedDeviceCode={selectedDevice.deviceCode}
                />
              </>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--surface)] py-4 text-center text-xs text-[var(--muted)] font-body">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong className="text-[var(--text)] font-display tracking-wide">INFINOS</strong> Smart Delivery Compartment Telemetry
          </span>
          <span className="font-data text-[11px] text-[var(--muted)]">
            Source of Truth: PostgreSQL • ThingSpeak Synchronized
          </span>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav" aria-label="Mobile navigation">
        <div className="mobile-nav-inner">
          <button
            className={`mob-nav-btn ${activeNavTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('dashboard')}
          >
            <span className="mob-icon">📊</span>
            <span className="mob-label">Dashboard</span>
          </button>
          <button
            className={`mob-nav-btn ${activeNavTab === 'devices' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('devices')}
          >
            <span className="mob-icon">📦</span>
            <span className="mob-label">Devices</span>
          </button>
          <button
            className="mob-nav-btn"
            onClick={() => setIsAddDeviceOpen(true)}
          >
            <span className="mob-icon text-[var(--orange)] font-bold text-xl leading-none">＋</span>
            <span className="mob-label text-[var(--orange)]">Claim</span>
          </button>
          <button
            className={`mob-nav-btn ${activeNavTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveNavTab('analytics')}
          >
            <span className="mob-icon">📈</span>
            <span className="mob-label">Analytics</span>
          </button>
          <button
            className="mob-nav-btn"
            onClick={toggleTheme}
            aria-label="Toggle theme"
          >
            <span className="mob-icon">{theme === 'dark' ? '🌙' : '☀️'}</span>
            <span className="mob-label">Theme</span>
          </button>
        </div>
      </nav>

      {/* Modals */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onDeviceCreated={fetchDevices}
      />

      {selectedDevice && (
        <>
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            settings={settings}
            onSave={handleSaveSettings}
            isLoading={isTelemetryLoading}
            deviceCode={selectedDevice.deviceCode}
          />

          <ExportModal
            isOpen={isExportOpen}
            onClose={() => setIsExportOpen(false)}
            deviceId={selectedDevice.id}
            deviceCode={selectedDevice.deviceCode}
          />
        </>
      )}
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DashboardContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
