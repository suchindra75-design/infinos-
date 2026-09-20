import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:infinos_mobile/auth/auth_provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:infinos_mobile/features/settings/settings_screen.dart';
import 'package:infinos_mobile/models/user.dart';

class MockAuthProvider extends AuthProvider {
  final User? mockUser;
  final bool mockAuthenticated;

  MockAuthProvider({
    required super.apiClient,
    required super.storageService,
    this.mockUser,
    this.mockAuthenticated = true,
  });

  @override
  User? get user => mockUser;

  @override
  bool get isAuthenticated => mockAuthenticated;

  @override
  Future<void> logout() async {
    // Override for widget testing
  }
}

void main() {
  late SecureStorageService storageService;
  late ApiClient apiClient;

  setUp(() {
    storageService = SecureStorageService();
    apiClient = ApiClient(storageService: storageService);
  });

  Widget buildTestableWidget({required AuthProvider authProvider}) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
      ],
      child: const MaterialApp(
        home: Scaffold(
          body: SettingsScreen(),
        ),
      ),
    );
  }

  group('SettingsScreen Tests', () {
    testWidgets('Renders header and user profile information', (WidgetTester tester) async {
      final user = User(
        id: 'usr-123',
        email: 'admin@infinos.io',
        name: 'Admin User',
        role: 'ADMIN',
      );

      final authProvider = MockAuthProvider(
        apiClient: apiClient,
        storageService: storageService,
        mockUser: user,
      );

      await tester.pumpWidget(buildTestableWidget(authProvider: authProvider));
      await tester.pumpAndSettle();

      expect(find.text('Settings'), findsOneWidget);
      expect(find.text('Account & Preferences'), findsOneWidget);
      expect(find.text('Admin User'), findsOneWidget);
      expect(find.text('admin@infinos.io'), findsOneWidget);
      expect(find.text('ADMIN'), findsOneWidget);
    });

    testWidgets('Renders app version and environment in ABOUT section', (WidgetTester tester) async {
      final user = User(
        id: 'usr-456',
        email: 'viewer@infinos.io',
        name: 'Test Viewer',
        role: 'VIEWER',
      );

      final authProvider = MockAuthProvider(
        apiClient: apiClient,
        storageService: storageService,
        mockUser: user,
      );

      await tester.pumpWidget(buildTestableWidget(authProvider: authProvider));
      await tester.pumpAndSettle();

      // Section headers are rendered (may be off-screen)
      expect(find.text('ACCOUNT', skipOffstage: false), findsOneWidget);
      expect(find.text('SECURITY', skipOffstage: false), findsOneWidget);
      expect(find.text('ABOUT', skipOffstage: false), findsOneWidget);

      // About section tiles
      expect(find.text('Version', skipOffstage: false), findsOneWidget);
      expect(find.text('1.0.0+1', skipOffstage: false), findsOneWidget);

      // Sign out button
      expect(find.text('Sign Out', skipOffstage: false), findsOneWidget);
    });
  });
}
