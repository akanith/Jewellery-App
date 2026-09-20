import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

export function getTestSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/**
 * Generates a unique 10-digit mobile number starting with 900 for E2E testing
 */
export function generateTestMobile(): string {
  const randomSuffix = Math.floor(1000007 + Math.random() * 8999990).toString();
  return `900${randomSuffix.slice(0, 7)}`;
}

/**
 * Generates a unique test customer name
 */
export function generateTestName(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `E2E Test User ${timestamp}`;
}
