import 'package:flutter/foundation.dart';
import '../../core/config/app_config.dart';
import '../../core/networking/api_client.dart';
import '../../core/notifications/notification_service.dart';
import '../../models/alert.dart';
import '../../models/device.dart';
import '../../models/telemetry.dart';

class DeviceProvider extends ChangeNotifier {
  final ApiClient apiClient;

  List<SafeDevice> _devices = [];
  SafeDevice? _selectedDevice;
  SensorReading? _latestReading;
  List<ResolvedTelemetryField> _resolvedFields = [];
  bool _isLoading = false;
  String? _errorMessage;
  bool _isTelemetryLoading = false;
  String? _telemetryErrorMessage;
  Map<String, dynamic>? _analyticsSummary;
  List<SensorReading> _analyticsTimeseries = [];
  bool _isAnalyticsLoading = false;
  String? _analyticsErrorMessage;
  int _activeAlertsCount = 0;

  // Alerts state
  List<SafeAlert> _alerts = [];
  bool _isAlertsLoading = false;
  String? _alertsErrorMessage;
  String _alertsStatusFilter = 'all'; // 'all', 'active', 'resolved'
  bool _isResolvingAlert = false;

  DeviceProvider({required this.apiClient});

  List<SafeDevice> get devices => _devices;
  SafeDevice? get selectedDevice => _selectedDevice;
  SensorReading? get latestReading => _latestReading;
  List<ResolvedTelemetryField> get resolvedFields => _resolvedFields;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isTelemetryLoading => _isTelemetryLoading;
  String? get telemetryErrorMessage => _telemetryErrorMessage;
  Map<String, dynamic>? get analyticsSummary => _analyticsSummary;
  List<SensorReading> get analyticsTimeseries => _analyticsTimeseries;
  bool get isAnalyticsLoading => _isAnalyticsLoading;
  String? get analyticsErrorMessage => _analyticsErrorMessage;
  int get activeAlertsCount => _activeAlertsCount;

  // Alerts getters (returns filtered view based on _alertsStatusFilter)
  List<SafeAlert> get alerts {
    if (_alertsStatusFilter == 'active') {
      return _alerts.where((a) => !a.isResolved).toList();
    } else if (_alertsStatusFilter == 'resolved') {
      return _alerts.where((a) => a.isResolved).toList();
    }
    return _alerts;
  }
  bool get isAlertsLoading => _isAlertsLoading;
  String? get alertsErrorMessage => _alertsErrorMessage;
  String get alertsStatusFilter => _alertsStatusFilter;
  bool get isResolvingAlert => _isResolvingAlert;

  int get totalDevicesCount => _devices.length;
  int get onlineDevicesCount =>
      _devices.where((d) => d.status == DeviceConnectivityStatus.online).length;
  int get offlineDevicesCount =>
      _devices.where((d) => d.status == DeviceConnectivityStatus.offline).length;

  /// Securely clear all cached provider data on logout or 401 session expiry
  void reset() {
    _devices = [];
    _selectedDevice = null;
    _latestReading = null;
    _resolvedFields = [];
    _isLoading = false;
    _errorMessage = null;
    _isTelemetryLoading = false;
    _telemetryErrorMessage = null;
    _analyticsSummary = null;
    _analyticsTimeseries = [];
    _isAnalyticsLoading = false;
    _analyticsErrorMessage = null;
    _activeAlertsCount = 0;
    _alerts = [];
    _isAlertsLoading = false;
    _alertsErrorMessage = null;
    _alertsStatusFilter = 'all';
    _isResolvingAlert = false;
    NotificationService().clearAll();
    notifyListeners();
  }

  Future<void> fetchDevices() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.get(AppConfig.devicesEndpoint);
      if (response != null && response is Map<String, dynamic> && response.containsKey('devices')) {
        final list = response['devices'] as List;
        _devices = list.map((item) => SafeDevice.fromJson(item as Map<String, dynamic>)).toList();
      } else if (response is List) {
        _devices = response.map((item) => SafeDevice.fromJson(item as Map<String, dynamic>)).toList();
      }

      if (_devices.isNotEmpty) {
        if (_selectedDevice == null) {
          selectDevice(_devices.first);
        } else {
          final updated = _devices.firstWhere(
            (d) => d.id == _selectedDevice!.id,
            orElse: () => _devices.first,
          );
          _selectedDevice = updated;
          _updateResolvedFields();
        }
      } else {
        _selectedDevice = null;
        _latestReading = null;
        _telemetryErrorMessage = null;
        _analyticsSummary = null;
        _analyticsTimeseries = [];
        _analyticsErrorMessage = null;
        _resolvedFields = [];
      }
      
      await fetchAlertsSummary();
    } catch (e) {
      _errorMessage = 'Failed to connect to backend: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectDevice(SafeDevice device) {
    _selectedDevice = device;
    // Clear previous device's reading and analytics to prevent stale data flash
    _latestReading = null;
    _telemetryErrorMessage = null;
    _analyticsSummary = null;
    _analyticsTimeseries = [];
    _analyticsErrorMessage = null;
    _updateResolvedFields();
    notifyListeners();
    fetchDeviceTelemetry(device.id);
    fetchDeviceAnalytics(device.id);
  }

  Future<void> fetchDeviceTelemetry(String deviceId) async {
    _isTelemetryLoading = true;
    _telemetryErrorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.get(
        AppConfig.deviceReadingsEndpoint(deviceId),
        queryParameters: {'limit': '1'},
      );

      // Race condition guard: discard stale response if selected device changed mid-flight
      if (_selectedDevice?.id != deviceId) return;

      if (response != null && response is Map<String, dynamic>) {
        List? readingsList;
        if (response.containsKey('readings') && response['readings'] is List) {
          readingsList = response['readings'] as List;
        }

        if (readingsList != null && readingsList.isNotEmpty) {
          _latestReading = SensorReading.fromJson(readingsList.first as Map<String, dynamic>);
        } else {
          _latestReading = null;
        }
      }
    } catch (e) {
      if (_selectedDevice?.id != deviceId) return;
      _telemetryErrorMessage = 'Failed to load telemetry readings: $e';
    } finally {
      if (_selectedDevice?.id == deviceId) {
        _isTelemetryLoading = false;
        _updateResolvedFields();
        notifyListeners();
      }
    }
  }

  Future<void> fetchDeviceAnalytics(String deviceId) async {
    _isAnalyticsLoading = true;
    _analyticsErrorMessage = null;
    notifyListeners();

    try {
      final summaryRes = await apiClient.get(AppConfig.analyticsSummaryEndpoint(deviceId));
      if (_selectedDevice?.id != deviceId) return;

      if (summaryRes != null && summaryRes is Map<String, dynamic>) {
        if (summaryRes.containsKey('data') && summaryRes['data'] is Map<String, dynamic>) {
          _analyticsSummary = summaryRes['data'] as Map<String, dynamic>;
        } else {
          _analyticsSummary = summaryRes;
        }
      }

      final tsRes = await apiClient.get(
        AppConfig.analyticsTimeseriesEndpoint(deviceId),
        queryParameters: {'limit': '100'},
      );
      if (_selectedDevice?.id != deviceId) return;

      if (tsRes != null && tsRes is Map<String, dynamic>) {
        Map<String, dynamic>? data;
        if (tsRes.containsKey('data') && tsRes['data'] is Map<String, dynamic>) {
          data = tsRes['data'] as Map<String, dynamic>;
        } else {
          data = tsRes;
        }

        if (data.containsKey('readings') && data['readings'] is List) {
          final list = data['readings'] as List;
          _analyticsTimeseries = list
              .map((item) => SensorReading.fromJson(item as Map<String, dynamic>))
              .toList();
        }
      }
    } catch (e) {
      if (_selectedDevice?.id != deviceId) return;
      _analyticsErrorMessage = 'Failed to load analytics: $e';
    } finally {
      if (_selectedDevice?.id == deviceId) {
        _isAnalyticsLoading = false;
        notifyListeners();
      }
    }
  }

  Future<void> refreshDeviceStatus(String deviceId) async {
    try {
      final response = await apiClient.get(AppConfig.deviceStatusEndpoint(deviceId));
      if (response != null && response is Map<String, dynamic> && response.containsKey('status')) {
        final newStatusStr = response['status'] as String?;
        final newStatus = DeviceConnectivityStatus.fromString(newStatusStr);

        final index = _devices.indexWhere((d) => d.id == deviceId);
        if (index != -1) {
          _devices[index] = _devices[index].copyWith(status: newStatus);
        }

        if (_selectedDevice?.id == deviceId) {
          _selectedDevice = _selectedDevice!.copyWith(status: newStatus);
        }
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> fetchAlertsSummary() async {
    _isAlertsLoading = true;
    _alertsErrorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.get(
        AppConfig.alertsEndpoint,
        queryParameters: {'limit': '100'},
      );

      // ApiClient._processResponse unwraps 'data', so response is the alerts array directly
      if (response is List) {
        _alerts = response
            .map((item) => SafeAlert.fromJson(item as Map<String, dynamic>))
            .toList();
      } else {
        _alerts = [];
      }

      // Fleet-wide active alerts count is always derived accurately
      _activeAlertsCount = _alerts.where((a) => !a.isResolved).length;

      // Process notifications for newly detected unresolved alerts
      NotificationService().processAlerts(_alerts);
    } catch (e) {
      _alertsErrorMessage = 'Failed to load alerts: $e';
    } finally {
      _isAlertsLoading = false;
      notifyListeners();
    }
  }

  void setAlertsStatusFilter(String filter) {
    if (_alertsStatusFilter == filter) return;
    _alertsStatusFilter = filter;
    notifyListeners();
  }

  Future<bool> resolveAlert(String alertId) async {
    _isResolvingAlert = true;
    notifyListeners();

    try {
      await apiClient.patch('${AppConfig.alertsEndpoint}/$alertId/resolve');
      // Refresh the alerts list after successful resolve
      await fetchAlertsSummary();
      return true;
    } catch (e) {
      _alertsErrorMessage = 'Failed to resolve alert: $e';
      notifyListeners();
      return false;
    } finally {
      _isResolvingAlert = false;
      notifyListeners();
    }
  }

  Future<void> retryAlerts() async {
    _alertsErrorMessage = null;
    notifyListeners();
    await fetchAlertsSummary();
  }

  // Device Management Actions

  /// Add / Claim a new device via POST /api/v1/devices
  Future<SafeDevice?> addDevice({
    required String deviceCode,
    required String name,
    required String thingSpeakChannelId,
    String? thingSpeakReadApiKey,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final body = <String, dynamic>{
        'deviceCode': deviceCode.trim(),
        'name': name.trim(),
        'thingSpeakChannelId': thingSpeakChannelId.trim(),
      };
      if (thingSpeakReadApiKey != null && thingSpeakReadApiKey.trim().isNotEmpty) {
        body['thingSpeakReadApiKey'] = thingSpeakReadApiKey.trim();
      }

      final response = await apiClient.post(AppConfig.devicesEndpoint, body: body);

      SafeDevice? createdDevice;
      if (response != null && response is Map<String, dynamic>) {
        if (response.containsKey('id')) {
          createdDevice = SafeDevice.fromJson(response);
        } else if (response.containsKey('data') && response['data'] is Map<String, dynamic>) {
          createdDevice = SafeDevice.fromJson(response['data'] as Map<String, dynamic>);
        }
      }

      await fetchDevices();

      if (createdDevice != null) {
        final found = _devices.firstWhere(
          (d) => d.id == createdDevice!.id,
          orElse: () => createdDevice!,
        );
        selectDevice(found);
      }
      return createdDevice;
    } catch (e) {
      _errorMessage = 'Failed to add device: $e';
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Edit / Update existing device details via PATCH /api/v1/devices/:id
  Future<SafeDevice?> updateDevice(String deviceId, Map<String, dynamic> updateData) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.patch('${AppConfig.devicesEndpoint}/$deviceId', body: updateData);

      SafeDevice? updatedDevice;
      if (response != null && response is Map<String, dynamic>) {
        if (response.containsKey('id')) {
          updatedDevice = SafeDevice.fromJson(response);
        } else if (response.containsKey('data') && response['data'] is Map<String, dynamic>) {
          updatedDevice = SafeDevice.fromJson(response['data'] as Map<String, dynamic>);
        }
      }

      await fetchDevices();

      if (updatedDevice != null && _selectedDevice?.id == deviceId) {
        final found = _devices.firstWhere(
          (d) => d.id == deviceId,
          orElse: () => updatedDevice!,
        );
        _selectedDevice = found;
        _updateResolvedFields();
      }
      return updatedDevice;
    } catch (e) {
      _errorMessage = 'Failed to update device: $e';
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Remove / Delete device via DELETE /api/v1/devices/:id
  Future<bool> deleteDevice(String deviceId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await apiClient.delete('${AppConfig.devicesEndpoint}/$deviceId');

      final wasSelected = _selectedDevice?.id == deviceId;
      _devices.removeWhere((d) => d.id == deviceId);

      if (wasSelected) {
        if (_devices.isNotEmpty) {
          selectDevice(_devices.first);
        } else {
          _selectedDevice = null;
          _latestReading = null;
          _resolvedFields = [];
          _telemetryErrorMessage = null;
          _analyticsSummary = null;
          _analyticsTimeseries = [];
          _analyticsErrorMessage = null;
        }
      }

      await fetchDevices();
      return true;
    } catch (e) {
      _errorMessage = 'Failed to delete device: $e';
      notifyListeners();
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Test ThingSpeak channel connection via POST /api/v1/devices/test-connection
  Future<Map<String, dynamic>> testConnection({
    required String thingSpeakChannelId,
    String? thingSpeakReadApiKey,
  }) async {
    try {
      final body = <String, dynamic>{
        'thingSpeakChannelId': thingSpeakChannelId.trim(),
      };
      if (thingSpeakReadApiKey != null && thingSpeakReadApiKey.trim().isNotEmpty) {
        body['thingSpeakReadApiKey'] = thingSpeakReadApiKey.trim();
      }

      final response = await apiClient.post(
        '${AppConfig.devicesEndpoint}/test-connection',
        body: body,
      );

      if (response != null && response is Map<String, dynamic>) {
        return response;
      }
      return {'success': true, 'message': 'Connection test successful'};
    } catch (e) {
      rethrow;
    }
  }

  /// Trigger manual device sync via POST /api/v1/devices/:id/sync
  Future<bool> syncDevice(String deviceId) async {
    try {
      await apiClient.post('${AppConfig.devicesEndpoint}/$deviceId/sync');
      await fetchDeviceTelemetry(deviceId);
      await refreshDeviceStatus(deviceId);
      return true;
    } catch (e) {
      rethrow;
    }
  }

  void _updateResolvedFields() {
    _resolvedFields = ResolvedTelemetryField.resolveFields(
      fieldMappings: _selectedDevice?.fieldMappings,
      latestReading: _latestReading,
    );
  }
}
