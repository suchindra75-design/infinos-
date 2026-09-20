import 'package:flutter/foundation.dart';
import '../../core/config/app_config.dart';
import '../../core/networking/api_client.dart';
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

  DeviceProvider({required this.apiClient});

  List<SafeDevice> get devices => _devices;
  SafeDevice? get selectedDevice => _selectedDevice;
  SensorReading? get latestReading => _latestReading;
  List<ResolvedTelemetryField> get resolvedFields => _resolvedFields;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  int get totalDevicesCount => _devices.length;
  int get onlineDevicesCount =>
      _devices.where((d) => d.status == DeviceConnectivityStatus.online).length;
  int get offlineDevicesCount =>
      _devices.where((d) => d.status == DeviceConnectivityStatus.offline).length;

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
      }
    } catch (e) {
      _errorMessage = 'Failed to load devices: $e';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  void selectDevice(SafeDevice device) {
    _selectedDevice = device;
    _updateResolvedFields();
    notifyListeners();
    fetchDeviceTelemetry(device.id);
  }

  Future<void> fetchDeviceTelemetry(String deviceId) async {
    try {
      final response = await apiClient.get(
        AppConfig.deviceReadingsEndpoint(deviceId),
        queryParameters: {'limit': '1'},
      );

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
      // Keep previous reading if network call fails
    } finally {
      _updateResolvedFields();
      notifyListeners();
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

  void _updateResolvedFields() {
    _resolvedFields = ResolvedTelemetryField.resolveFields(
      fieldMappings: _selectedDevice?.fieldMappings,
      latestReading: _latestReading,
    );
  }
}
