import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../features/auth/screens/language_selection_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/dashboard/screens/error_screen.dart';
import '../../features/dashboard/screens/home_screen.dart';
import '../../features/dashboard/screens/no_internet_screen.dart';
import '../../features/help/screens/help_center_screen.dart';
import '../../features/help/screens/visit_shop_screen.dart';
import '../../features/installments/screens/receipt_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../features/passbook/screens/passbook_screen.dart';
import '../../features/profile/screens/privacy_policy_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/redemption/screens/redemption_screen.dart';
import '../../shared/widgets/bottom_nav_bar.dart';
import '../network/supabase_client.dart';

/// Notifier that triggers GoRouter refresh whenever Supabase Auth state changes
class AuthRouterNotifier extends ChangeNotifier {
  late final StreamSubscription<AuthState> _subscription;

  AuthRouterNotifier(SupabaseClient supabase) {
    _subscription = supabase.auth.onAuthStateChange.listen((data) {
      notifyListeners();
    });
  }

  @override
  void dispose() {
    _subscription.cancel();
    super.dispose();
  }
}

final authRouterNotifierProvider = Provider<AuthRouterNotifier>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  final notifier = AuthRouterNotifier(supabase);
  ref.onDispose(() => notifier.dispose());
  return notifier;
});

/// ROUTING ARCHITECTURE — GOROUTER WITH SHELL ROUTE, AUTH GUARD & BOTTOM NAV BAR
final routerProvider = Provider<GoRouter>((ref) {
  final authNotifier = ref.watch(authRouterNotifierProvider);
  final supabase = ref.watch(supabaseClientProvider);

  return GoRouter(
    initialLocation: '/',
    refreshListenable: authNotifier,
    redirect: (context, state) {
      final session = supabase.auth.currentSession;
      final isAuthenticated = session != null;
      final location = state.uri.path;

      // Public routes accessible without authentication
      final isPublicRoute = location == '/login' ||
          location == '/language' ||
          location == '/privacy-policy' ||
          location == '/visit-shop' ||
          location == '/no-internet' ||
          location == '/error';

      // Redirect unauthenticated users attempting to access protected routes to /login
      if (!isAuthenticated && !isPublicRoute) {
        return '/login';
      }

      // Redirect authenticated users attempting to access /login to /
      if (isAuthenticated && location == '/login') {
        return '/';
      }

      return null;
    },
    routes: [
      ShellRoute(
        builder: (context, state, child) {
          int currentIndex = 0;
          final location = state.uri.path;
          if (location.startsWith('/passbook')) {
            currentIndex = 1;
          } else if (location.startsWith('/notifications') || location.startsWith('/updates') || location.startsWith('/help')) {
            currentIndex = 2;
          } else if (location.startsWith('/profile')) {
            currentIndex = 3;
          }

          return Scaffold(
            body: child,
            bottomNavigationBar: CustomBottomNavBar(
              currentIndex: currentIndex,
              onTap: (index) {
                switch (index) {
                  case 0:
                    context.go('/');
                    break;
                  case 1:
                    context.go('/passbook');
                    break;
                  case 2:
                    context.go('/notifications');
                    break;
                  case 3:
                    context.go('/profile');
                    break;
                }
              },
            ),
          );
        },
        routes: [
          GoRoute(
            path: '/',
            builder: (context, state) => const HomeScreen(),
          ),
          GoRoute(
            path: '/passbook',
            builder: (context, state) => const PassbookScreen(),
          ),
          GoRoute(
            path: '/notifications',
            builder: (context, state) => const NotificationsScreen(),
          ),
          GoRoute(
            path: '/help',
            builder: (context, state) => const HelpCenterScreen(),
          ),
          GoRoute(
            path: '/profile',
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/language',
        builder: (context, state) => const LanguageSelectionScreen(),
      ),
      GoRoute(
        path: '/receipt',
        builder: (context, state) {
          final installmentId = (state.extra as String?) ?? state.uri.queryParameters['id'];
          return ReceiptScreen(installmentId: installmentId);
        },
      ),
      GoRoute(
        path: '/redemption',
        builder: (context, state) => const RedemptionScreen(),
      ),
      GoRoute(
        path: '/error',
        builder: (context, state) => const ErrorScreen(),
      ),
      GoRoute(
        path: '/no-internet',
        builder: (context, state) => const NoInternetScreen(),
      ),
      GoRoute(
        path: '/privacy-policy',
        builder: (context, state) => const PrivacyPolicyScreen(),
      ),
      GoRoute(
        path: '/visit-shop',
        builder: (context, state) => const VisitShopScreen(),
      ),
    ],
  );
});
