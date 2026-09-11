import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, Plus, LayoutDashboard, Cpu, BarChart2, AlertTriangle, Radio, SlidersHorizontal, Download, ArrowRight } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
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

  // Navigation State
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

  // Count active alerts
  const activeAlertsCount = alerts.filter((a) => !a.isResolved).length;

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

  // Auto-refresh interval effect
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
      <div className="min-h-screen bg-[#07080a] infinos-grid-bg text-zinc-100 flex items-center justify-center font-body p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
          <span className="text-xs text-zinc-400 font-display tracking-wider uppercase">Restoring Session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07080a] infinos-grid-bg text-zinc-100 flex flex-col font-body selection:bg-orange-500/30 selection:text-orange-200 relative w-full overflow-x-hidden">
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
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6 pb-20 md:pb-8">
        {/* Backend & Device Status Banner */}
        <StatusBanner
          backendConnected={backendConnected}
          statusInfo={statusInfo}
          errorMessage={telemetryError}
        />

        {!isAuthenticated ? (
          <div className="bg-[#0e1014] border border-white/[0.08] rounded-2xl p-6 sm:p-12 text-center max-w-md mx-auto shadow-2xl shadow-black/50 my-6 sm:my-8 font-body">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-[#ff6b00] flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <LogIn className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white mb-2">
              Sign In to INFINOS
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-body mb-5 sm:mb-6 leading-relaxed">
              Authentication is required to view registered delivery compartments, inspect live sensor telemetry, and manage device thresholds.
            </p>
            <button
              onClick={() => setIsAuthOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#ff6b00] to-[#ff8533] hover:from-[#ff7a1a] hover:to-[#ffa059] text-white font-semibold text-xs sm:text-sm shadow-lg shadow-orange-500/20 transition cursor-pointer font-body min-h-[44px] w-full sm:w-auto"
            >
              <LogIn className="w-4 h-4" />
              <span>Open Sign In</span>
            </button>
          </div>
        ) : (
          <>
            {/* TAB: FLEET DEVICES VIEW */}
            {activeNavTab === 'devices' && (
              <div className="space-y-4 font-body animate-in fade-in-50 duration-150">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display">Registered Smart Bags</h2>
                    <p className="text-xs text-zinc-400">Select any smart bag in your fleet to monitor live cold/hot telemetry</p>
                  </div>
                  <button
                    onClick={() => setIsAddDeviceOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-full bg-gradient-to-r from-[#ff6b00] to-[#e05e00] hover:from-[#ff7d1a] hover:to-[#eb6405] text-white shadow-md shadow-orange-500/20 transition cursor-pointer min-h-[38px]"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Claim New Bag</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {devices.map((device) => {
                    const isSelected = selectedDevice?.id === device.id;
                    return (
                      <div
                        key={device.id}
                        className={`bg-[#0e1014] border rounded-xl p-4 transition shadow-lg shadow-black/30 flex flex-col justify-between gap-3 ${
                          isSelected
                            ? 'border-[#ff6b00] ring-1 ring-[#ff6b00]/30'
                            : 'border-white/[0.08] hover:border-white/[0.2]'
                        }`}
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display font-bold text-sm text-white">{device.deviceCode}</span>
                            <span
                              className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                                device.status === 'ONLINE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : device.status === 'STALE'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {device.status}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 line-clamp-1">{device.name}</p>
                          <div className="text-[11px] text-zinc-500 font-data">
                            Channel ID: <span className="text-zinc-300">{device.thingSpeakChannelId}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
                          <button
                            onClick={() => {
                              setSelectedDevice(device);
                              setActiveNavTab('dashboard');
                            }}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition min-h-[38px] cursor-pointer ${
                              isSelected
                                ? 'bg-orange-500/20 text-[#ff6b00] border border-orange-500/40'
                                : 'bg-[#14171d] hover:bg-[#1c212c] text-zinc-200 border border-white/[0.08]'
                            }`}
                          >
                            <span>{isSelected ? 'Currently Monitoring' : 'Monitor Bag'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB: DEDICATED ANALYTICS VIEW */}
            {activeNavTab === 'analytics' && selectedDevice && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-white font-display">
                      Analytics & Audit Reports — {selectedDevice.deviceCode}
                    </h2>
                    <p className="text-xs text-zinc-400">Aggregated statistical metrics and historical timeseries</p>
                  </div>
                  <button
                    onClick={() => setIsExportOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-[#14171d] hover:bg-[#1a1e27] text-zinc-200 border border-white/[0.1] hover:border-orange-500/40 transition cursor-pointer min-h-[38px]"
                  >
                    <Download className="w-3.5 h-3.5 text-orange-400" />
                    <span>Download CSV / PDF Audit</span>
                  </button>
                </div>

                <AnalyticsSummarySection
                  summary={summary}
                  isLoading={isTelemetryLoading}
                />

                <TelemetryChart
                  readings={timeseries}
                  isLoading={isTelemetryLoading}
                  timeRange={timeRange}
                  onChangeTimeRange={setTimeRange}
                  error={timeseriesError}
                />
              </div>
            )}

            {/* TAB: DEDICATED ALERTS VIEW */}
            {activeNavTab === 'alerts' && (
              <div className="space-y-4 animate-in fade-in-50 duration-150">
                <AlertsList
                  alerts={alerts}
                  isLoading={isTelemetryLoading}
                  onResolveAlert={handleResolveAlert}
                  filterScope={alertsScope}
                  onChangeFilterScope={setAlertsScope}
                  selectedDeviceCode={selectedDevice?.deviceCode}
                />
              </div>
            )}

            {/* TAB: DASHBOARD VIEW (PRIMARY INTENTIONAL HIERARCHY) */}
            {activeNavTab === 'dashboard' && (
              <>
                {/* 1. Device Selector & Quick Actions */}
                <DeviceSelector
                  devices={devices}
                  selectedDevice={selectedDevice}
                  onSelectDevice={setSelectedDevice}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenExport={() => setIsExportOpen(true)}
                  onOpenAddDevice={() => setIsAddDeviceOpen(true)}
                  isLoading={isLoadingDevices}
                />

                {selectedDevice && (
                  <div key={selectedDevice.id} className="space-y-4 sm:space-y-6 transition-all duration-300 animate-in fade-in-50">
                    {/* 2. Primary Temperature & Live Compartments */}
                    <LiveTelemetryCard
                      summary={summary}
                      statusInfo={statusInfo}
                      settings={settings}
                      isLoading={isTelemetryLoading}
                      error={telemetryError}
                      fieldMappings={selectedDevice.fieldMappings}
                      latestReading={timeseries.length > 0 ? timeseries[timeseries.length - 1] : null}
                    />

                    {/* 3. Operational Alerts & Incidents */}
                    <AlertsList
                      alerts={alerts}
                      isLoading={isTelemetryLoading}
                      onResolveAlert={handleResolveAlert}
                      filterScope={alertsScope}
                      onChangeFilterScope={setAlertsScope}
                      selectedDeviceCode={selectedDevice.deviceCode}
                    />

                    {/* 4. Chronological Telemetry Chart */}
                    <TelemetryChart
                      readings={timeseries}
                      isLoading={isTelemetryLoading}
                      timeRange={timeRange}
                      onChangeTimeRange={setTimeRange}
                      error={timeseriesError}
                      fieldMappings={selectedDevice.fieldMappings}
                    />

                    {/* 5. PostgreSQL Telemetry Analytics Summary */}
                    <AnalyticsSummarySection
                      summary={summary}
                      isLoading={isTelemetryLoading}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Mobile Bottom Navigation Bar (< md) */}
      {isAuthenticated && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#08090b]/95 border-t border-white/[0.08] backdrop-blur-md px-2 py-1.5 bottom-nav-safe">
          <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
            <button
              onClick={() => setActiveNavTab('dashboard')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-medium flex flex-col items-center gap-1 transition cursor-pointer min-h-[44px] justify-center ${
                activeNavTab === 'dashboard'
                  ? 'bg-orange-500/15 text-[#ff6b00] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => setActiveNavTab('devices')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-medium flex flex-col items-center gap-1 transition cursor-pointer min-h-[44px] justify-center ${
                activeNavTab === 'devices'
                  ? 'bg-orange-500/15 text-[#ff6b00] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Bags</span>
            </button>
            <button
              onClick={() => setActiveNavTab('analytics')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-medium flex flex-col items-center gap-1 transition cursor-pointer min-h-[44px] justify-center ${
                activeNavTab === 'analytics'
                  ? 'bg-orange-500/15 text-[#ff6b00] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            <button
              onClick={() => setActiveNavTab('alerts')}
              className={`py-1.5 px-1 rounded-xl text-[10px] font-medium flex flex-col items-center gap-1 relative transition cursor-pointer min-h-[44px] justify-center ${
                activeNavTab === 'alerts'
                  ? 'bg-orange-500/15 text-[#ff6b00] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Alerts</span>
              {activeAlertsCount > 0 && (
                <span className="absolute top-1.5 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
          </div>
        </nav>
      )}

      {/* Footer (Desktop & Tablet) */}
      <footer className="border-t border-white/[0.08] bg-[#07080a]/90 backdrop-blur-md py-4 text-center text-xs text-zinc-500 font-body hidden md:block">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            <strong className="text-zinc-400 font-display tracking-wide">INFINOS</strong> Smart Delivery Compartment Telemetry
          </span>
          <span className="font-data text-[11px] text-zinc-600">
            Source of Truth: PostgreSQL • ThingSpeak Synchronized
          </span>
        </div>
      </footer>

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
      <DashboardContent />
    </AuthProvider>
  );
}

export default App;
