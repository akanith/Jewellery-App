import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/env_config.dart';

/// CENTRALIZED SUPABASE NETWORK ARCHITECTURE — FLUTTER
/// 
/// Provides global access to initialized SupabaseClient instance via Riverpod.
/// Direct database queries inside Flutter UI Widgets are strictly prohibited.

final supabaseClientProvider = Provider<SupabaseClient>((ref) {
  return Supabase.instance.client;
});

class SupabaseNetworkService {
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: EnvConfig.supabaseUrl,
      // ignore: deprecated_member_use
      anonKey: EnvConfig.supabaseAnonKey,
    );
  }
}
