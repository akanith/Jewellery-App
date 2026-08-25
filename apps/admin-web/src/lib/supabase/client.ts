import { createBrowserClient } from '@supabase/ssr';

/**
 * CENTRALIZED SUPABASE BROWSER CLIENT ARCHITECTURE
 * 
 * Provides a single entry point for browser-side Supabase interactions.
 * UI components must NEVER instantiate Supabase directly or execute direct raw queries.
 * Queries are encapsulated inside Service classes.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
