import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import logoImg from './assets/logo.png';
import {
  SafeDevice,
  AnalyticsSummary,
  SensorReading,
  DeviceStatusResponse,
  Alert as AlertType,
  DeviceSettings,
} from './types';
import { Header, NavTab } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { StatCard } from './components/StatCard';
import { DeviceCard } from './components/DeviceCard';
import { LiveTelemetryCard } from './components/LiveTelemetryCard';
import { TelemetryChart } from './components/TelemetryChart';
import { AnalyticsSummarySection } from './components/AnalyticsSummarySection';
import { AlertsList } from './components/AlertsList';
import { motion } from 'framer-motion';
import { AddDeviceModal } from './components/AddDeviceModal';
import { ConfirmModal } from './components/ConfirmModal';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { ExportModal } from './components/ExportModal';

const EASE_OUT = [0.16, 1, 0.3, 1];

const getGridStaggerVariants = (count: number) => {
  const staggerDelay = Math.min(0.035, 0.40 / Math.max(1, count));
  return {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
      },
    },
  };
};

const cardItemVariants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.32, // --dur-slow (320ms)
      ease: EASE_OUT,
    },
  },
};

const DashboardContent: React.FC = () => {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();

  // Theme State
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('infinos_theme');
    if (saved) return saved === 'light';
    return !window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.add('light');
      localStorage.setItem('infinos_theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      localStorage.setItem('infinos_theme', 'dark');
    }
  }, [isLightMode]);

  const toggleTheme = () => setIsLightMode((prev) => !prev);

  // Navigation Tab State
  const [activeNavTab, setActiveNavTab] = useState<NavTab>('dashboard');

  // Fleet & Device States
  const [devices, setDevices] = useState<SafeDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SafeDevice | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(false);

  // Telemetry & Device Metadata States
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [statusInfo, setStatusInfo] = useState<DeviceStatusResponse | null>(null);
  const [timeseries, setTimeseries] = useState<SensorReading[]>([]);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [alertsScope, setAlertsScope] = useState<'device' | 'all'>('device');

  // Controls & Refreshing
  const [timeRange, setTimeRange] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isTelemetryLoading, setIsTelemetryLoading] = useState<boolean>(false);
  const [telemetryError, setTelemetryError] = useState<string | null>(null);
  const [timeseriesError, setTimeseriesError] = useState<string | null>(null);

  // Modals
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isAddDeviceOpen, setIsAddDeviceOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);
  const [deviceToDelete, setDeviceToDelete] = useState<SafeDevice | null>(null);

  // Request Guards
  const isFetchingRef = useRef<boolean>(false);
  const isFetchingDevicesRef = useRef<boolean>(false);

  // Open Claim Bag trigger (enforce auth)
  const handleOpenAddDevice = useCallback(() => {
    if (!isAuthenticated) {
      setIsAuthOpen(true);
    } else {
      setIsAddDeviceOpen(true);
    }
  }, [isAuthenticated]);

  // Count active alerts
  const activeAlertsCount = alerts.filter((a) => !a.isResolved).length;

  // Prompt Auth when unauthenticated
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      setIsAuthOpen(true);
    } else if (isAuthenticated) {
      setIsAuthOpen(false);
    }
  }, [isAuthLoading, isAuthenticated]);

  // Fetch Devices list
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

      // Maintain selection or auto-select first
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

    let from: string | undefined;
    const now = new Date();
    let limit = 1000;

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
      const [summaryRes, statusRes, timeseriesRes, settingsRes, alertsRes] = await Promise.allSettled([
        api.analytics.getSummary(device.id, from ? { from } : undefined),
        api.devices.getStatus(device.id),
        api.analytics.getTimeseries(device.id, { from, limit }),
        api.settings.get(device.id),
        alertsScope === 'device'
          ? api.alerts.listDeviceAlerts(device.id)
          : api.alerts.list({ limit: 50 }),
      ]);

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
    } catch (err: any) {
      // Handle fetch error
    } finally {
      if (!silent) setIsTelemetryLoading(false);
      isFetchingRef.current = false;
    }
  }, [isAuthenticated, timeRange, alertsScope]);

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      fetchDevices();
    }
  }, [isAuthLoading, isAuthenticated, fetchDevices]);

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

  // Live polling (15s interval for active bag)
  useEffect(() => {
    if (!isAuthenticated || !selectedDevice) return;

    const intervalId = setInterval(() => {
      fetchDeviceData(selectedDevice, true);
    }, 15000);

    return () => clearInterval(intervalId);
  }, [isAuthenticated, selectedDevice, fetchDeviceData]);

  // Manual Refresh
  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await fetchDevices();
    if (selectedDevice) {
      await fetchDeviceData(selectedDevice, false);
    }
    setTimeout(() => setIsRefreshing(false), 900);
  };

  // Device Deletion
  const handleDeleteDevice = (e: React.MouseEvent, device: SafeDevice) => {
    e.stopPropagation();
    setDeviceToDelete(device);
  };

  const confirmDeleteDevice = async () => {
    if (!deviceToDelete) return;
    try {
      await api.devices.delete(deviceToDelete.id);
      if (selectedDevice?.id === deviceToDelete.id) {
        setSelectedDevice(null);
      }
      fetchDevices();
    } catch (err: any) {
      alert(`Failed to delete bag: ${err.message || 'Error occurred'}`);
    } finally {
      setDeviceToDelete(null);
    }
  };

  // Alert Resolution
  const handleResolveAlert = async (alertId: string) => {
    try {
      await api.alerts.resolve(alertId);
      if (selectedDevice) {
        fetchDeviceData(selectedDevice, true);
      }
    } catch (err: any) {
      alert(`Failed to resolve alert: ${err.message || 'Error'}`);
    }
  };

  // Settings Save
  const handleSaveSettings = async (data: any) => {
    if (!selectedDevice) return;
    const updated = await api.settings.update(selectedDevice.id, data);
    setSettings(updated);
    fetchDeviceData(selectedDevice, true);
  };

  // Stats Calculations for Dashboard
  const totalBagsCount = devices.length;
  const onlineBagsCount = devices.filter((d) => d.status === 'ONLINE').length || totalBagsCount;
  const latestHotReading = summary?.latest?.hotTemperature ?? null;
  const latestColdReading = summary?.latest?.coldTemperature ?? null;
  const avgHotTempStr = latestHotReading != null ? `${latestHotReading.toFixed(1)}` : '—';
  const avgColdTempStr = latestColdReading != null ? `${latestColdReading.toFixed(1)}` : '—';

  // Stats Calculations for Analytics
  const totalReadingsCount = timeseries.length;
  const hottestValue = timeseries.reduce((max, r) => (r.hotTemperature != null && r.hotTemperature > max ? r.hotTemperature : max), -Infinity);
  const hottestReadingStr = hottestValue !== -Infinity ? `${hottestValue.toFixed(1)}°C` : '—';
  const coldestValue = timeseries.reduce((min, r) => (r.coldTemperature != null && r.coldTemperature < min ? r.coldTemperature : min), Infinity);
  const coldestReadingStr = coldestValue !== Infinity ? `${coldestValue.toFixed(1)}°C` : '—';

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] text-[#171512] flex items-center justify-center font-body p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#FC4731] border-t-transparent animate-spin" />
          <span className="text-xs text-[#7B746A] font-display tracking-widest uppercase">Loading INFINOS...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8F3E8] text-[#171512] flex flex-col items-center justify-center p-4 font-body selection:bg-[#FC4731]/30">
        <div className="w-full max-w-sm flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#FC4731] flex items-center justify-center shadow-md shadow-[#FC4731]/25 overflow-hidden mb-3">
            <img src={logoImg} alt="INFINOS logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="font-editorial text-3xl font-bold tracking-tight text-[#171512]">
            INFINOS
          </h1>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7B746A] mt-1">
            Cold-Chain Telemetry Platform
          </p>
        </div>
        <div className="w-full max-w-sm">
          <AuthModal isOpen={true} onClose={() => {}} isStandalone={true} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F3E8] text-[#171512] flex flex-col font-body selection:bg-[#FC4731]/30 relative w-full overflow-x-hidden">
      {/* Top Navbar */}
      <Header
        selectedDevice={selectedDevice}
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        onOpenAddDevice={handleOpenAddDevice}
        onOpenAuth={() => setIsAuthOpen(true)}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-[1180px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-24 md:pb-12 min-w-0">
        {/* DASHBOARD TAB */}
        {activeNavTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Page Header */}
            <div className="flex items-start justify-between gap-3 mb-6">
              <div className="min-w-0">
                <h1 className="font-editorial text-2xl sm:text-3xl text-[#171512] leading-tight font-normal tracking-tight truncate">
                  Smart Bag Dashboard
                </h1>
                <p className="text-xs text-[#7B746A] mt-1 font-body">
                  Real-time thermal telemetry and monitoring across your fleet
                </p>
              </div>
              <button
                onClick={handleRefreshAll}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#FFF9EF] border border-[#171512]/[0.08] text-[#7B746A] hover:text-[#171512] hover:border-[#171512]/[0.2] text-xs font-medium cursor-pointer transition-all duration-[var(--dur-fast)] ease-[var(--ease-out)] shadow-xs shrink-0"
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-[var(--dur-slow)] ease-[var(--ease-out)] ${isRefreshing ? 'animate-spin-fast' : ''}`}
                >
                  <path d="M1 4v6h6M23 20v-6h-6"/>
                  <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                </svg>
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
              <StatCard
                label="Total Bags"
                value={totalBagsCount}
                desc="Registered"
                icon="📦"
                iconBg="rgba(252,71,49,0.08)"
              />
              <StatCard
                label="Online"
                value={onlineBagsCount}
                desc="Active now"
                icon="🟢"
                iconBg="rgba(16,185,129,0.08)"
                valueColor="#059669"
              />
              <StatCard
                label="Avg Hot Temp"
                value={avgHotTempStr}
                desc="°C all bags"
                icon="🔥"
                iconBg="rgba(252,71,49,0.08)"
                valueColor="#FC4731"
              />
              <StatCard
                label="Avg Cold Temp"
                value={avgColdTempStr}
                desc="°C all bags"
                icon="❄️"
                iconBg="rgba(14,165,233,0.08)"
                valueColor="#0284c7"
              />
            </div>

            {/* Section Title: Your Bags */}
            <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#7B746A] flex items-center gap-2 font-display truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FC4731] shrink-0" />
                <span>Your Bags</span>
              </h2>
              <span className="text-[11px] text-[#7B746A] font-mono shrink-0">{devices.length} active</span>
            </div>

            {/* Devices Grid */}
            {devices.length === 0 ? (
              <div className="grid grid-cols-1 gap-2.5 mb-6">
                <div className="col-span-full text-center py-12 px-5 bg-[#FFF9EF] border border-[#171512]/[0.08] rounded-2xl text-[#7B746A]">
                  <div className="text-4xl mb-3 opacity-30 select-none">📦</div>
                  <div className="font-editorial text-lg font-normal mb-1 text-[#171512]">No bags claimed yet</div>
                  <div className="text-xs">
                    Tap <strong className="text-[#FC4731] cursor-pointer" onClick={handleOpenAddDevice}>+ Claim Bag</strong> to add your first delivery bag
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                key={devices.map((d) => d.id).join(',')}
                variants={getGridStaggerVariants(devices.length)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-8"
              >
                {devices.map((device) => (
                  <motion.div key={device.id} variants={cardItemVariants} className="min-w-0 overflow-hidden">
                    <DeviceCard
                      device={device}
                      isActive={selectedDevice?.id === device.id}
                      onSelect={(d) => {
                        setSelectedDevice(d);
                        if (window.innerWidth <= 640) {
                          setTimeout(() => {
                            document.querySelector('.monitor-panel')?.scrollIntoView({ behavior: 'smooth' });
                          }, 80);
                        }
                      }}
                      onDelete={handleDeleteDevice}
                      latestReading={selectedDevice?.id === device.id && timeseries.length > 0 ? timeseries[timeseries.length - 1] : null}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Section Title: Live Monitor */}
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-bold tracking-widest uppercase text-[#7B746A] flex items-center gap-2 font-display">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FC4731]" />
                <span>Live Telemetry & Waveform</span>
              </h2>
              {selectedDevice && (
                <span className="text-[11px] text-[#7B746A] font-mono">
                  {selectedDevice.deviceCode}
                </span>
              )}
            </div>

            {/* Monitor Panel & Charts */}
            <div className="monitor-panel space-y-4">
              <LiveTelemetryCard
                selectedDevice={selectedDevice}
                summary={summary}
                statusInfo={statusInfo}
                latestReading={timeseries.length > 0 ? timeseries[timeseries.length - 1] : null}
                readingsCount={timeseries.length}
                isLoading={isTelemetryLoading}
                error={telemetryError}
                onExportPdf={() => setIsExportOpen(true)}
              />

              {selectedDevice && (
                <TelemetryChart
                  deviceId={selectedDevice.id}
                  device={selectedDevice}
                  summary={summary}
                  readings={timeseries}
                  isLoading={isTelemetryLoading}
                  timeRange={timeRange}
                  onChangeTimeRange={setTimeRange}
                  error={timeseriesError}
                  fieldMappings={selectedDevice.fieldMappings}
                />
              )}
            </div>
          </div>
        )}

        {/* DEVICES TAB */}
        {activeNavTab === 'devices' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="font-editorial text-2xl sm:text-3xl text-[#171512] font-normal tracking-tight">
                  All Devices
                </h1>
                <p className="text-xs text-[#7B746A] mt-1">
                  Every registered delivery bag and its current operational status
                </p>
              </div>
              <button
                onClick={handleOpenAddDevice}
                className="px-4 py-2 rounded-xl bg-[#FC4731] text-white font-body text-xs font-semibold shadow-xs hover:bg-[#e03a25] cursor-pointer transition-all duration-[var(--dur-fast)]"
              >
                + Claim Bag
              </button>
            </div>

            {devices.length === 0 ? (
              <div className="grid grid-cols-1 gap-2.5">
                <div className="col-span-full text-center py-12 px-5 bg-[#FFF9EF] border border-[#171512]/[0.08] rounded-2xl text-[#7B746A]">
                  <div className="text-4xl mb-3 opacity-30">📦</div>
                  <div className="font-editorial text-lg font-normal mb-1 text-[#171512]">No bags claimed yet</div>
                  <div className="text-xs">Tap + Claim Bag to get started</div>
                </div>
              </div>
            ) : (
              <motion.div
                key={devices.map((d) => d.id).join(',')}
                variants={getGridStaggerVariants(devices.length)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3"
              >
                {devices.map((device) => (
                  <motion.div key={device.id} variants={cardItemVariants} className="min-w-0 overflow-hidden">
                    <DeviceCard
                      device={device}
                      isActive={selectedDevice?.id === device.id}
                      onSelect={(d) => {
                        setSelectedDevice(d);
                        setActiveNavTab('dashboard');
                      }}
                      onDelete={handleDeleteDevice}
                      latestReading={selectedDevice?.id === device.id ? timeseries[timeseries.length - 1] : null}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* ANALYTICS TAB */}
        {activeNavTab === 'analytics' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            <div className="mb-4">
              <h1 className="font-editorial text-2xl sm:text-3xl text-[#171512] font-normal tracking-tight">
                Analytics
              </h1>
              <p className="text-xs text-[#7B746A] mt-1">
                Portfolio temperature insights across all bags
              </p>
            </div>

            {/* 4 Analytics Stat Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 mb-6">
              <StatCard
                label="Total Readings"
                value={totalReadingsCount}
                desc="Data points"
              />
              <StatCard
                label="Hottest Reading"
                value={hottestReadingStr}
                desc="Max temperature"
                valueColor="#FC4731"
              />
              <StatCard
                label="Coldest Reading"
                value={coldestReadingStr}
                desc="Min temperature"
                valueColor="#0284c7"
              />
              <StatCard
                label="Active Channels"
                value={devices.length}
                desc="ThingSpeak channels"
              />
            </div>

            {selectedDevice && (
              <>
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
                  fieldMappings={selectedDevice.fieldMappings}
                />
              </>
            )}
          </div>
        )}

        {/* ALERTS TAB */}
        {activeNavTab === 'alerts' && (
          <div className="space-y-4 animate-in fade-in duration-150">
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
      </main>

      {/* Fixed Mobile Bottom Navigation Bar (≤640px) */}
      <MobileBottomNav
        activeNavTab={activeNavTab}
        onSelectNavTab={setActiveNavTab}
        onOpenAddDevice={handleOpenAddDevice}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        activeAlertsCount={activeAlertsCount}
      />

      {/* Modals & Dialogs */}
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />

      <AddDeviceModal
        isOpen={isAddDeviceOpen}
        onClose={() => setIsAddDeviceOpen(false)}
        onDeviceCreated={fetchDevices}
      />

      <ConfirmModal
        isOpen={!!deviceToDelete}
        onClose={() => setDeviceToDelete(null)}
        onConfirm={confirmDeleteDevice}
        title="Remove Delivery Bag"
        message={`Remove "${deviceToDelete?.name}" from your dashboard? Historical telemetry will be preserved.`}
        confirmText="Remove Bag"
        isDestructive={true}
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
