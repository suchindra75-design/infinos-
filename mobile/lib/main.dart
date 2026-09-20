import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'auth/auth_provider.dart';
import 'auth/login_screen.dart';
import 'core/networking/api_client.dart';
import 'core/storage/secure_storage_service.dart';
import 'core/theme/app_colors.dart';
import 'core/theme/app_theme.dart';
import 'features/devices/device_provider.dart';
import 'features/navigation_shell.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const InfinosApp());
}

class InfinosApp extends StatelessWidget {
  const InfinosApp({super.key});

  @override
  Widget build(BuildContext context) {
    final storageService = SecureStorageService();
    final apiClient = ApiClient(storageService: storageService);

    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => AuthProvider(
            apiClient: apiClient,
            storageService: storageService,
          )..tryRestoreSession(),
        ),
        ChangeNotifierProvider<DeviceProvider>(
          create: (_) => DeviceProvider(apiClient: apiClient),
        ),
      ],
      child: MaterialApp(
        title: 'INFINOS Mobile',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, auth, child) {
        switch (auth.status) {
          case AuthStatus.initial:
          case AuthStatus.authenticating:
            return const Scaffold(
              backgroundColor: AppColors.warmCream,
              body: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: AppColors.primaryOrange),
                    SizedBox(height: 16),
                    Text(
                      'Restoring INFINOS Session...',
                      style: TextStyle(
                        color: AppColors.mutedText,
                        fontSize: 13,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),
            );
          case AuthStatus.authenticated:
            return const NavigationShell();
          case AuthStatus.unauthenticated:
          case AuthStatus.error:
            return const LoginScreen();
        }
      },
    );
  }
}
