/// SECURE ENVIRONMENT CONFIGURATION LOADER
/// 
/// Environment values are injected via `--dart-define` at compile/build time
/// or fallback to safe placeholders in debug mode.
/// Never commit secret credentials to Git repository.
class EnvConfig {
  static const String supabaseUrl = String.fromEnvironment(
    'SUPABASE_URL',
    defaultValue: 'https://placeholder.supabase.co',
  );

  static const String supabaseAnonKey = String.fromEnvironment(
    'SUPABASE_ANON_KEY',
    defaultValue: 'placeholder-anon-key',
  );

  static const String appName = 'Ramyas Jeweller Savings';
  static const String appVersion = '1.0.0-phase1';
}
