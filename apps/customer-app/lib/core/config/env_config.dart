import 'supabase_config.dart';

/// SECURE ENVIRONMENT CONFIGURATION LOADER
/// 
/// Environment values are injected via `--dart-define` at compile/build time
/// or fallback to SupabaseConfig constants in debug mode.
/// Never commit secret credentials to Git repository.
class EnvConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: SupabaseConfig.supabaseUrl,
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: SupabaseConfig.supabaseAnonKey,
  );

  static const String appName = 'Ramyas Jeweller Savings';
  static const String appVersion = '1.0.0-phase5';
}
