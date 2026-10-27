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
  const appEnv = (process.env.NEXT_PUBLIC_APP_ENV || '').trim().toLowerCase();

  // Explicit local development backend
  if (appEnv === 'local') {
    const localUrl = process.env.NEXT_PUBLIC_LOCAL_SUPABASE_URL || 'http://127.0.0.1:54321';
    const localKey =
      process.env.NEXT_PUBLIC_LOCAL_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
    return {
      supabaseUrl: localUrl,
      supabaseAnonKey: localKey,
    };
  }

  // Explicit hosted production backend
  if (appEnv === 'hosted') {
    const hostedUrl = process.env.NEXT_PUBLIC_HOSTED_SUPABASE_URL || 'https://yjpbswsgtbmgageburmy.supabase.co';
    const hostedKey =
      process.env.NEXT_PUBLIC_HOSTED_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      '';
    return {
      supabaseUrl: hostedUrl,
      supabaseAnonKey: hostedKey,
    };
  }

  // Direct environment variable fallback
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;

  const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL environment variable. Please configure .env.local'
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY environment variable. Please configure .env.local'
    );
  }

  return {
    supabaseUrl,
    supabaseAnonKey: supabasePublishableKey,
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
