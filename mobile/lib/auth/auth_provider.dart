import 'package:flutter/foundation.dart';
import '../core/config/app_config.dart';
import '../core/networking/api_client.dart';
import '../core/networking/api_exception.dart';
import '../core/storage/secure_storage_service.dart';
import '../models/user.dart';

enum AuthStatus {
  initial,
  authenticating,
  authenticated,
  unauthenticated,
  error,
}

class AuthProvider extends ChangeNotifier {
  final ApiClient apiClient;
  final SecureStorageService storageService;

  AuthStatus _status = AuthStatus.initial;
  User? _user;
  String? _errorMessage;

  AuthProvider({
    required this.apiClient,
    required this.storageService,
  }) {
    apiClient.onUnauthorized = _handleUnauthorized;
  }

  AuthStatus get status => _status;
  User? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;

  void _handleUnauthorized() {
    logout();
  }

  Future<void> tryRestoreSession() async {
    _status = AuthStatus.authenticating;
    notifyListeners();

    try {
      final hasToken = await storageService.hasToken();
      if (!hasToken) {
        _status = AuthStatus.unauthenticated;
        notifyListeners();
        return;
      }

      final response = await apiClient.get(AppConfig.meEndpoint);
      if (response != null && response is Map<String, dynamic>) {
        final userData = response['user'] ?? response;
        _user = User.fromJson(userData as Map<String, dynamic>);
        _status = AuthStatus.authenticated;
        _errorMessage = null;
      } else {
        await logout();
      }
    } catch (e) {
      await logout();
    } finally {
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    _status = AuthStatus.authenticating;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await apiClient.post(
        AppConfig.loginEndpoint,
        body: {
          'email': email.trim(),
          'password': password,
        },
        requiresAuth: false,
      );

      if (response != null && response is Map<String, dynamic>) {
        final token = response['token'] as String?;
        final userData = response['user'] as Map<String, dynamic>?;

        if (token != null && token.isNotEmpty && userData != null) {
          await storageService.saveToken(token);
          _user = User.fromJson(userData);
          _status = AuthStatus.authenticated;
          _errorMessage = null;
          notifyListeners();
          return true;
        }
      }

      throw ApiException(message: 'Invalid server login response format');
    } on ApiException catch (e) {
      _errorMessage = e.message;
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    } catch (e) {
      _errorMessage = 'An unexpected error occurred during login: $e';
      _status = AuthStatus.error;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    await storageService.deleteToken();
    _user = null;
    _status = AuthStatus.unauthenticated;
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _errorMessage = null;
    if (_status == AuthStatus.error) {
      _status = AuthStatus.unauthenticated;
    }
    notifyListeners();
  }
}
