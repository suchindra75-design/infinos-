import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../storage/secure_storage_service.dart';
import 'api_exception.dart';

typedef OnUnauthorizedCallback = void Function();

class ApiClient {
  final http.Client _httpClient;
  final SecureStorageService storageService;
  final String baseUrl;
  OnUnauthorizedCallback? onUnauthorized;

  ApiClient({
    http.Client? httpClient,
    required this.storageService,
    this.baseUrl = AppConfig.baseUrl,
    this.onUnauthorized,
  }) : _httpClient = httpClient ?? http.Client();

  Future<Map<String, String>> _getHeaders({bool requiresAuth = true}) async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    if (requiresAuth) {
      final token = await storageService.getToken();
      if (token != null && token.isNotEmpty) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    return headers;
  }

  Uri _buildUri(String endpoint, [Map<String, String>? queryParameters]) {
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final fullUrl = '$baseUrl$cleanEndpoint';
    final uri = Uri.parse(fullUrl);
    if (queryParameters != null && queryParameters.isNotEmpty) {
      return uri.replace(queryParameters: queryParameters);
    }
    return uri;
  }

  dynamic _processResponse(http.Response response) {
    if (response.statusCode == 401) {
      onUnauthorized?.call();
      throw UnauthorizedException();
    }

    dynamic responseData;
    if (response.body.isNotEmpty) {
      try {
        responseData = jsonDecode(response.body);
      } catch (_) {
        responseData = response.body;
      }
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (responseData is Map<String, dynamic> && responseData.containsKey('data')) {
        return responseData['data'];
      }
      return responseData;
    }

    String errorMessage = 'An error occurred (${response.statusCode})';
    String? errorCode;

    if (responseData is Map<String, dynamic>) {
      if (responseData.containsKey('error')) {
        final errorObj = responseData['error'];
        if (errorObj is Map<String, dynamic>) {
          errorMessage = errorObj['message'] ?? errorMessage;
          errorCode = errorObj['code'];
        } else if (errorObj is String) {
          errorMessage = errorObj;
        }
      } else if (responseData.containsKey('message')) {
        errorMessage = responseData['message'];
      }
    }

    throw ApiException(
      message: errorMessage,
      code: errorCode,
      statusCode: response.statusCode,
    );
  }

  static const Duration _timeoutDuration = Duration(seconds: 15);

  Future<dynamic> get(
    String endpoint, {
    Map<String, String>? queryParameters,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint, queryParameters);
    final headers = await _getHeaders(requiresAuth: requiresAuth);

    try {
      final response = await _httpClient.get(uri, headers: headers).timeout(_timeoutDuration);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Network request failed: $e');
    }
  }

  Future<dynamic> post(
    String endpoint, {
    dynamic body,
    Map<String, String>? queryParameters,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint, queryParameters);
    final headers = await _getHeaders(requiresAuth: requiresAuth);

    try {
      final response = await _httpClient
          .post(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeoutDuration);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Network request failed: $e');
    }
  }

  Future<dynamic> put(
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint);
    final headers = await _getHeaders(requiresAuth: requiresAuth);

    try {
      final response = await _httpClient
          .put(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeoutDuration);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Network request failed: $e');
    }
  }

  Future<dynamic> patch(
    String endpoint, {
    dynamic body,
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint);
    final headers = await _getHeaders(requiresAuth: requiresAuth);

    try {
      final response = await _httpClient
          .patch(
            uri,
            headers: headers,
            body: body != null ? jsonEncode(body) : null,
          )
          .timeout(_timeoutDuration);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Network request failed: $e');
    }
  }

  Future<dynamic> delete(
    String endpoint, {
    bool requiresAuth = true,
  }) async {
    final uri = _buildUri(endpoint);
    final headers = await _getHeaders(requiresAuth: requiresAuth);

    try {
      final response = await _httpClient.delete(uri, headers: headers).timeout(_timeoutDuration);
      return _processResponse(response);
    } catch (e) {
      if (e is ApiException) rethrow;
      throw ApiException(message: 'Network request failed: $e');
    }
  }
}
