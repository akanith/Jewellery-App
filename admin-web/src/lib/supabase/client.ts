/**
 * RAMYAS JEWELLER - Supabase Browser Client Module
 *
 * Client-side Supabase client for Admin Web authenticated sessions.
 * Communicates with Supabase using only the public project URL and anonymous/publishable key.
 *
 * SECURITY GUARANTEES:
 * 1. Uses only public client-side credentials (URL and ANON key).
 * 2. Service role keys must NEVER be placed in client-side code.
 * 3. All administrative operations rely on Supabase Auth + Database RLS/RPC permissions.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

/**
 * Validates and retrieves the required Supabase environment configuration.
 */
export function getSupabaseEnvConfig() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please configure .env.local'
    );
  }

  if (!supabaseAnonKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable. Please configure .env.local'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
  };
}

/**
 * Creates or retrieves a singleton browser Supabase client instance.
 */
export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) {
    return browserClient;
  }

  const { supabaseUrl, supabaseAnonKey } = getSupabaseEnvConfig();

  browserClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

export const supabase = {
  get client(): SupabaseClient {
    return getSupabaseBrowserClient();
  },
};
