class ApiException implements Exception {
  final String message;
  final String? code;
  final int? statusCode;

  ApiException({
    required this.message,
    this.code,
    this.statusCode,
  });

  @override
  String toString() => 'ApiException(statusCode: $statusCode, code: $code, message: $message)';
}

class UnauthorizedException extends ApiException {
  UnauthorizedException({super.message = 'Session expired. Please log in again.'})
      : super(code: 'UNAUTHORIZED', statusCode: 401);
}
