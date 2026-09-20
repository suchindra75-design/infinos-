class AppConfig {
  static const String appName = 'INFINOS';
  static const String appTagline = 'Smart Cold-Chain Telemetry';

  // Production Backend URL
  static const String baseUrl = 'https://infinos-6.onrender.com';

  // API Endpoints
  static const String loginEndpoint = '/api/v1/auth/login';
  static const String meEndpoint = '/api/v1/auth/me';

  static const String devicesEndpoint = '/api/v1/devices';
  static String deviceStatusEndpoint(String id) => '/api/v1/devices/$id/status';
  static String deviceReadingsEndpoint(String id) => '/api/v1/devices/$id/readings';
  static String claimDeviceEndpoint = '/api/v1/devices/claim';

  static String analyticsSummaryEndpoint(String id) => '/api/v1/devices/$id/analytics/summary';
  static String analyticsTimeseriesEndpoint(String id) => '/api/v1/devices/$id/analytics/timeseries';

  static const String alertsEndpoint = '/api/v1/alerts';
  static String deviceAlertsEndpoint(String id) => '/api/v1/alerts/device/$id';

  static const String exportCsvEndpoint = '/api/v1/exports/csv';
  static const String exportPdfEndpoint = '/api/v1/exports/pdf';

  // Secure Storage Keys
  static const String tokenStorageKey = 'infinos_jwt_token';
  static const String userStorageKey = 'infinos_user_data';
}
