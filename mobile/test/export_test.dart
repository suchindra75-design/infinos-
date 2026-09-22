import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:provider/provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/networking/api_exception.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/analytics/analytics_screen.dart';
import 'package:infinos_mobile/features/analytics/export_modal.dart';
import 'package:infinos_mobile/features/devices/device_provider.dart';
import 'package:infinos_mobile/models/device.dart';
import 'package:infinos_mobile/models/telemetry.dart';

class MockExportHttpClient extends http.BaseClient {
  http.Response Function(http.Request request)? handler;

  MockExportHttpClient({this.handler});

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    final httpRequest = request as http.Request;
    final response = handler != null
        ? handler!(httpRequest)
        : http.Response('OK', 200);
    return http.StreamedResponse(
      Stream.value(response.bodyBytes),
      response.statusCode,
      headers: response.headers,
    );
  }
}

class TestApiClient extends ApiClient {
  final MockExportHttpClient mockHttpClient;

  TestApiClient({
    required super.storageService,
    required MockExportHttpClient httpClient,
  })  : mockHttpClient = httpClient,
        super(httpClient: httpClient);

  @override
  Future<http.Response> getBytes(
    String endpoint, {
    Map<String, String>? queryParameters,
    bool requiresAuth = true,
  }) async {
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final fullUrl = 'https://infinos-6.onrender.com/api/v1$cleanEndpoint';
    final uri = Uri.parse(fullUrl).replace(queryParameters: queryParameters);
    final req = http.Request('GET', uri);
    final streamed = await mockHttpClient.send(req);
    final resp = await http.Response.fromStream(streamed);

    if (resp.statusCode >= 200 && resp.statusCode < 300) {
      return resp;
    }

    String errorMessage = 'Download failed (${resp.statusCode})';
    if (resp.body.isNotEmpty) {
      try {
        final json = jsonDecode(resp.body);
        if (json is Map<String, dynamic>) {
          if (json.containsKey('error') && json['error'] is Map) {
            errorMessage = json['error']['message'] ?? errorMessage;
          } else if (json.containsKey('message')) {
            errorMessage = json['message'];
          }
        }
      } catch (_) {}
    }

    throw ApiException(message: errorMessage, statusCode: resp.statusCode);
  }
}

class MockExportDeviceProvider extends DeviceProvider {
  final SafeDevice? _mockSelectedDevice;

  MockExportDeviceProvider({
    required super.apiClient,
    SafeDevice? selectedDevice,
  }) : _mockSelectedDevice = selectedDevice;

  @override
  SafeDevice? get selectedDevice => _mockSelectedDevice;

  @override
  Map<String, dynamic>? get analyticsSummary => {
        'readingCount': 42,
        'firstReadingTimestamp': '2026-01-01T00:00:00Z',
        'latestReadingTimestamp': '2026-01-02T00:00:00Z',
      };

  @override
  List<SensorReading> get analyticsTimeseries => [];

  @override
  List<ResolvedTelemetryField> get resolvedFields => [];

  @override
  Future<void> fetchDeviceAnalytics(String deviceId) async {}
}

void main() {
  late SecureStorageService storageService;
  late SafeDevice testDevice;

  setUp(() {
    storageService = SecureStorageService();
    testDevice = SafeDevice(
      id: 'dev-123',
      deviceCode: 'BAG-99',
      name: 'Smart Infusion Bag 99',
      thingSpeakChannelId: '100200',
      status: DeviceConnectivityStatus.online,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  });

  Widget buildTestableWidget({
    required DeviceProvider deviceProvider,
  }) {
    return ChangeNotifierProvider<DeviceProvider>.value(
      value: deviceProvider,
      child: const MaterialApp(
        home: AnalyticsScreen(),
      ),
    );
  }

  group('Export Feature Tests', () {
    testWidgets('1. Export action visible on Analytics screen', (WidgetTester tester) async {
      final mockClient = MockExportHttpClient();
      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);
      final provider = MockExportDeviceProvider(apiClient: apiClient, selectedDevice: testDevice);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump();

      expect(find.byKey(const Key('export_appbar_action')), findsOneWidget);
      expect(find.byKey(const Key('export_report_button')), findsOneWidget);
      expect(find.text('Export Telemetry (CSV / PDF)'), findsOneWidget);
    });

    testWidgets('2. Selected device passed correctly to Export Modal', (WidgetTester tester) async {
      final mockClient = MockExportHttpClient();
      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);
      final provider = MockExportDeviceProvider(apiClient: apiClient, selectedDevice: testDevice);

      await tester.pumpWidget(buildTestableWidget(deviceProvider: provider));
      await tester.pump();

      await tester.tap(find.byKey(const Key('export_report_button')));
      await tester.pump();
      await tester.pump();

      expect(find.text('Audit Sensor Export'), findsOneWidget);
      expect(find.text('BAG-99'), findsOneWidget);
    });

    testWidgets('3. CSV export success', (WidgetTester tester) async {
      String? savedFilename;
      Uint8List? savedBytes;
      String? savedMime;

      final mockClient = MockExportHttpClient(handler: (req) {
        expect(req.url.path, '/api/v1/devices/dev-123/export/csv');
        return http.Response(
          'timestamp,flow_rate\n2026-01-01,120.5',
          200,
          headers: {'content-disposition': 'attachment; filename="infinos-bag-BAG-99-telemetry.csv"'},
        );
      });

      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
              fileSaver: (filename, bytes, mimeType) async {
                savedFilename = filename;
                savedBytes = bytes;
                savedMime = mimeType;
                return '/tmp/$filename';
              },
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Download CSV'));
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.text('CSV exported successfully.'), findsOneWidget);
      expect(savedFilename, 'infinos-bag-BAG-99-telemetry.csv');
      expect(savedMime, 'text/csv');
      expect(utf8.decode(savedBytes!), contains('120.5'));
    });

    testWidgets('4. PDF export success', (WidgetTester tester) async {
      String? savedFilename;
      String? savedMime;

      final mockClient = MockExportHttpClient(handler: (req) {
        expect(req.url.path, '/api/v1/devices/dev-123/export/pdf');
        return http.Response.bytes(
          [0x25, 0x50, 0x44, 0x46, 0x2D], // %PDF-
          200,
          headers: {'content-disposition': 'attachment; filename="infinos-bag-BAG-99-report.pdf"'},
        );
      });

      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
              fileSaver: (filename, bytes, mimeType) async {
                savedFilename = filename;
                savedMime = mimeType;
                return '/tmp/$filename';
              },
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('PDF Report'));
      await tester.pump();

      await tester.tap(find.text('Download PDF'));
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.text('PDF exported successfully.'), findsOneWidget);
      expect(savedFilename, 'infinos-bag-BAG-99-report.pdf');
      expect(savedMime, 'application/pdf');
    });

    testWidgets('5. API failure displays error message', (WidgetTester tester) async {
      final mockClient = MockExportHttpClient(handler: (req) {
        return http.Response(
          jsonEncode({'error': {'message': 'Database maintenance in progress'}}),
          500,
        );
      });

      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Download CSV'));
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.text('Database maintenance in progress'), findsOneWidget);
    });

    testWidgets('6. Loading state during download', (WidgetTester tester) async {
      final completer = Completer<http.Response>();

      final mockClient = MockExportHttpClient(handler: (req) {
        return http.Response('data', 200);
      });

      final apiClient = _DelayedApiClient(
        storageService: storageService,
        httpClient: mockClient,
        completer: completer,
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Download CSV'));
      await tester.pump();
      await tester.pump();

      expect(find.text('Generating...'), findsOneWidget);
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      completer.complete(http.Response('csv data', 200));
      await tester.pump();
      await tester.pump();
      await tester.pump();
    });

    testWidgets('7. Date-range handling and validations', (WidgetTester tester) async {
      Uri? requestedUri;

      final mockClient = MockExportHttpClient(handler: (req) {
        requestedUri = req.url;
        return http.Response('ts,val', 200);
      });

      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
              fileSaver: (filename, bytes, mimeType) async => '/tmp/$filename',
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Custom Range'));
      await tester.pump();

      await tester.tap(find.text('Download CSV'));
      await tester.pump();

      expect(
        find.text('Select at least one date for custom range, or choose All History.'),
        findsOneWidget,
      );
      expect(requestedUri, isNull);
    });

    testWidgets('8. Export cancellation/error handling', (WidgetTester tester) async {
      final mockClient = MockExportHttpClient();
      final apiClient = TestApiClient(storageService: storageService, httpClient: mockClient);

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExportModal(
              device: testDevice,
              apiClient: apiClient,
              fileSaver: (filename, bytes, mimeType) async {
                throw Exception('Disk write permission denied');
              },
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Download CSV'));
      await tester.pump();
      await tester.pump();
      await tester.pump();

      expect(find.text('Disk write permission denied'), findsOneWidget);

      bool closed = false;
      await tester.pumpWidget(
        MaterialApp(
          home: Builder(
            builder: (context) => ElevatedButton(
              onPressed: () async {
                await showDialog(
                  context: context,
                  builder: (_) => ExportModal(device: testDevice, apiClient: apiClient),
                );
                closed = true;
              },
              child: const Text('Open'),
            ),
          ),
        ),
      );
      await tester.pump();

      await tester.tap(find.text('Open'));
      await tester.pump();

      await tester.tap(find.text('Cancel'));
      await tester.pump();

      expect(closed, isTrue);
    });
  });
}

class _DelayedApiClient extends ApiClient {
  final Completer<http.Response> completer;

  _DelayedApiClient({
    required super.storageService,
    required super.httpClient,
    required this.completer,
  });

  @override
  Future<http.Response> getBytes(
    String endpoint, {
    Map<String, String>? queryParameters,
    bool requiresAuth = true,
  }) {
    return completer.future;
  }
}
