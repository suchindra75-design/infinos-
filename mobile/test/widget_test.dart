import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:infinos_mobile/auth/login_screen.dart';
import 'package:infinos_mobile/auth/auth_provider.dart';
import 'package:infinos_mobile/core/networking/api_client.dart';
import 'package:infinos_mobile/core/storage/secure_storage_service.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('LoginScreen renders INFINOS branding and sign in form', (WidgetTester tester) async {
    final storageService = SecureStorageService();
    final apiClient = ApiClient(storageService: storageService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>(
            create: (_) => AuthProvider(
              apiClient: apiClient,
              storageService: storageService,
            ),
          ),
        ],
        child: const MaterialApp(
          home: LoginScreen(),
        ),
      ),
    );

    expect(find.text('INFINOS'), findsOneWidget);
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}
