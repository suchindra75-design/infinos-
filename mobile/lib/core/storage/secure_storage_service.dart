import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/app_config.dart';

class SecureStorageService {
  final FlutterSecureStorage _storage;
  final Map<String, String> _inMemoryFallback = {};

  SecureStorageService({FlutterSecureStorage? storage})
      : _storage = storage ??
            const FlutterSecureStorage(
              aOptions: AndroidOptions(),
              iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
            );

  Future<void> saveToken(String token) async {
    try {
      await _storage.write(key: AppConfig.tokenStorageKey, value: token);
    } catch (_) {
      _inMemoryFallback[AppConfig.tokenStorageKey] = token;
    }
  }

  Future<String?> getToken() async {
    try {
      final token = await _storage.read(key: AppConfig.tokenStorageKey);
      if (token != null) return token;
    } catch (_) {
      return _inMemoryFallback[AppConfig.tokenStorageKey];
    }
    return _inMemoryFallback[AppConfig.tokenStorageKey];
  }

  Future<void> deleteToken() async {
    try {
      await _storage.delete(key: AppConfig.tokenStorageKey);
    } catch (_) {}
    _inMemoryFallback.remove(AppConfig.tokenStorageKey);
  }

  Future<bool> hasToken() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }
}
