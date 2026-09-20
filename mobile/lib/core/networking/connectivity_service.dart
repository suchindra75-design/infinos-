import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/foundation.dart';

/// Monitors device network connectivity and notifies listeners on changes.
/// Provides current connectivity status and an onChange stream.
class ConnectivityService extends ChangeNotifier {
  final Connectivity _connectivity;
  StreamSubscription<List<ConnectivityResult>>? _subscription;

  bool _isOnline = true;
  bool _initialized = false;

  ConnectivityService({Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity();

  bool get isOnline => _isOnline;
  bool get isOffline => !_isOnline;
  bool get initialized => _initialized;

  /// Start listening to connectivity changes.
  Future<void> initialize() async {
    if (_initialized) return;

    // Check initial state
    try {
      final results = await _connectivity.checkConnectivity();
      _isOnline = _hasConnection(results);
    } catch (_) {
      // Default to online if check fails (avoid false offline on startup)
      _isOnline = true;
    }
    _initialized = true;
    notifyListeners();

    // Listen for changes
    _subscription = _connectivity.onConnectivityChanged.listen((results) {
      final wasOnline = _isOnline;
      _isOnline = _hasConnection(results);
      if (wasOnline != _isOnline) {
        notifyListeners();
      }
    });
  }

  bool _hasConnection(List<ConnectivityResult> results) {
    return results.any((r) =>
        r == ConnectivityResult.wifi ||
        r == ConnectivityResult.mobile ||
        r == ConnectivityResult.ethernet ||
        r == ConnectivityResult.vpn);
  }

  /// Callback for consumers who want to trigger an action when connectivity is restored.
  final List<VoidCallback> _onReconnectCallbacks = [];

  void addOnReconnect(VoidCallback callback) {
    _onReconnectCallbacks.add(callback);
  }

  void removeOnReconnect(VoidCallback callback) {
    _onReconnectCallbacks.remove(callback);
  }

  @override
  void notifyListeners() {
    super.notifyListeners();
    // Fire reconnect callbacks when going from offline → online
    if (_isOnline) {
      for (final cb in _onReconnectCallbacks) {
        cb();
      }
    }
  }

  @override
  void dispose() {
    _subscription?.cancel();
    _onReconnectCallbacks.clear();
    super.dispose();
  }
}
