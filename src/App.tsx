import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Header } from './components/Header';
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
  const { isAuthenticated, user } = useAuth();

  // Fleet and Device States
  const [devices, setDevices] = useState<SafeDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<SafeDevice | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState<boolean>(true);

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

  // Request guard to prevent overlapping auto-refresh fetches
  const isFetchingRef = useRef<boolean>(false);

  // Fetch registered devices list
  const fetchDevices = useCallback(async () => {
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
    }
  }, []);

  // Fetch telemetry for currently selected device
  const fetchDeviceData = useCallback(async (device: SafeDevice, silent: boolean = false) => {
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
  }, [timeRange, alertsScope]);

  // Initial load
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Load telemetry when selected device or time range changes
  useEffect(() => {
    if (selectedDevice) {
      fetchDeviceData(selectedDevice, false);
    } else {
      setSummary(null);
      setStatusInfo(null);
      setTimeseries([]);
      setAlerts([]);
    }
  }, [selectedDevice, fetchDeviceData]);

  // Auto-refresh interval effect
  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0 || !selectedDevice) return;

    const intervalId = setInterval(() => {
      fetchDeviceData(selectedDevice, true);
    }, refreshInterval * 1000);

    return () => clearInterval(intervalId);
  }, [refreshInterval, selectedDevice, fetchDeviceData]);

  // Manual ThingSpeak to PostgreSQL synchronization
  const handleManualSync = async () => {
    if (!selectedDevice || isSyncing) return;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header */}
      <Header
        selectedDevice={selectedDevice}
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

        {/* Active Device Dashboard View */}
        {selectedDevice && (
          <>
            {/* Live Telemetry Cards */}
            <LiveTelemetryCard
              summary={summary}
              statusInfo={statusInfo}
              settings={settings}
              isLoading={isTelemetryLoading}
              error={telemetryError}
            />

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
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>INFINOS Smart Delivery Bag System • Cold/Hot Chain Telemetry</span>
          <span className="font-mono text-[11px] text-slate-600">
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
