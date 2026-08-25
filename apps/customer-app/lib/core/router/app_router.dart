import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/dashboard/screens/home_screen.dart';
import '../../features/dashboard/screens/error_screen.dart';
import '../../features/dashboard/screens/no_internet_screen.dart';
import '../../features/passbook/screens/passbook_screen.dart';
import '../../features/installments/screens/receipt_screen.dart';
import '../../features/help/screens/help_center_screen.dart';
import '../../features/help/screens/visit_shop_screen.dart';
import '../../features/profile/screens/profile_screen.dart';
import '../../features/profile/screens/privacy_policy_screen.dart';
import '../../features/auth/screens/login_screen.dart';
import '../../features/auth/screens/language_selection_screen.dart';
import '../../features/notifications/screens/notifications_screen.dart';
import '../../shared/widgets/bottom_nav_bar.dart';

/// ROUTING ARCHITECTURE — GOROUTER WITH SHELL ROUTE & BOTTOM NAV BAR
final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: '/',
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
        path: '/notifications',
        builder: (context, state) => const NotificationsScreen(),
      ),
      GoRoute(
        path: '/receipt',
        builder: (context, state) => const ReceiptScreen(),
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
