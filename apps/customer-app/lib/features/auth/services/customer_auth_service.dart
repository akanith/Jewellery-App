import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/errors/error_handler.dart';
import '../../../core/network/supabase_client.dart';
import '../models/customer_identity.dart';

/// CUSTOMER AUTHENTICATION SERVICE — FLUTTER CUSTOMER APP
///
/// Production-ready authentication service encapsulating Supabase Auth & identity chain:
/// auth.users.id → public.profiles.id → public.customers.profile_id
///
/// Uses existing Supabase publishable/anon client and public.get_current_customer_id() RPC.
class CustomerAuthService {
  final SupabaseClient _supabase;

  CustomerAuthService(this._supabase);

  /// Authenticate customer using mobile number and password
  Future<CustomerIdentity?> signInWithMobile({
    required String mobile,
    required String password,
  }) async {
    try {
      String formattedMobile = mobile.trim();
      // Format 10-digit Indian mobile numbers if country code is missing
      if (formattedMobile.length == 10 && RegExp(r'^[6-9]\d{9}$').hasMatch(formattedMobile)) {
        formattedMobile = '+91$formattedMobile';
      }

      await _supabase.auth.signInWithPassword(
        phone: formattedMobile,
        password: password,
      );

      return await resolveCustomerIdentity();
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }

  /// Flexible sign in using email or mobile identifier with password
  Future<CustomerIdentity?> signInWithPassword({
    required String identifier,
    required String password,
  }) async {
    try {
      final cleanIdentifier = identifier.trim();
      if (cleanIdentifier.contains('@')) {
        await _supabase.auth.signInWithPassword(
          email: cleanIdentifier,
          password: password,
        );
      } else {
        return await signInWithMobile(mobile: cleanIdentifier, password: password);
      }

      return await resolveCustomerIdentity();
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }

  /// Sign out current customer session
  Future<void> signOut() async {
    try {
      await _supabase.auth.signOut();
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }

  /// Active authentication session
  Session? get currentSession => _supabase.auth.currentSession;

  /// Active authenticated user
  User? get currentUser => _supabase.auth.currentUser;

  /// Check if user is currently authenticated
  bool get isAuthenticated => currentSession != null && currentUser != null;

  /// Stream of authentication state changes
  Stream<AuthState> get authStateChanges => _supabase.auth.onAuthStateChange;

  /// Fetch resolved customer UUID for the authenticated user using public.get_current_customer_id() RPC
  Future<String?> getCurrentCustomerId() async {
    try {
      if (!isAuthenticated) return null;

      final response = await _supabase.rpc('get_current_customer_id');
      if (response != null && response is String && response.isNotEmpty) {
        return response;
      }
      return null;
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }

  /// Resolve full CustomerIdentity chain:
  /// auth.users.id → public.profiles.id → public.customers.profile_id
  Future<CustomerIdentity?> resolveCustomerIdentity() async {
    try {
      final user = currentUser;
      if (user == null) return null;

      // 1. Query public.profiles using auth.uid()
      final profileResponse = await _supabase
          .from('profiles')
          .select()
          .eq('id', user.id)
          .maybeSingle();

      final profileMap = profileResponse != null
          ? Map<String, dynamic>.from(profileResponse)
          : <String, dynamic>{'id': user.id, 'role': 'CUSTOMER'};

      // 2. Resolve customer ID via database RPC get_current_customer_id()
      final customerId = await getCurrentCustomerId();

      Map<String, dynamic>? customerMap;
      if (customerId != null) {
        // 3. Query public.customers for full customer details
        final customerResponse = await _supabase
            .from('customers')
            .select()
            .eq('id', customerId)
            .maybeSingle();

        if (customerResponse != null) {
          customerMap = Map<String, dynamic>.from(customerResponse);
        }
      }

      return CustomerIdentity.fromProfileAndCustomer(
        profile: profileMap,
        customer: customerMap,
      );
    } catch (e) {
      throw ErrorHandler.normalize(e);
    }
  }
}

// =============================================================================
// RIVERPOD PROVIDERS
// =============================================================================

/// Global Riverpod Provider for CustomerAuthService
final customerAuthServiceProvider = Provider<CustomerAuthService>((ref) {
  final supabase = ref.watch(supabaseClientProvider);
  return CustomerAuthService(supabase);
});

/// Riverpod StreamProvider for listening to AuthState changes
final authStateChangesProvider = StreamProvider<AuthState>((ref) {
  final authService = ref.watch(customerAuthServiceProvider);
  return authService.authStateChanges;
});

/// Riverpod FutureProvider for resolving current customer identity
final currentCustomerIdentityProvider = FutureProvider<CustomerIdentity?>((ref) async {
  final authService = ref.watch(customerAuthServiceProvider);
  return await authService.resolveCustomerIdentity();
});
