/**
 * URL Configuration and Normalization Utilities for Customer BFF.
 * Centralizes environment resolution and robust endpoint URL construction.
 */

export const DEFAULT_HOSTED_BFF_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';
export const DEFAULT_LOCAL_BFF_URL = 'http://127.0.0.1:54321/functions/v1';

/**
 * Resolves the active BFF base URL.
 * Supports explicit environment switching via EXPO_PUBLIC_APP_ENV:
 * - 'hosted'  -> Points to hosted Supabase Edge Functions.
 * - 'local'   -> Points to local Docker Supabase Edge Functions.
 * - undefined -> Honors EXPO_PUBLIC_BFF_BASE_URL, with fallback to DEFAULT_HOSTED_BFF_URL.
 */
export function getBffBaseUrl(): string {
  const appEnv = (process.env.EXPO_PUBLIC_APP_ENV || '').trim().toLowerCase();
  if (appEnv === 'hosted') {
    return (process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL || DEFAULT_HOSTED_BFF_URL).trim();
  }
  if (appEnv === 'local') {
    return (process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL || DEFAULT_LOCAL_BFF_URL).trim();
  }
  return (process.env.EXPO_PUBLIC_BFF_BASE_URL || DEFAULT_HOSTED_BFF_URL).trim();
}

/**
 * Robust URL builder for Customer BFF endpoints.
 * - Strips redundant trailing slashes from the base URL.
 * - Ensures exactly one '/customer-bff' segment exists in the final URL.
 * - Strips duplicate '/customer-bff' from the endpoint if already supplied.
 * - Cleans leading slashes on endpoint.
 *
 * Example valid outputs:
 *   buildBffUrl('/auth/login') -> 'https://.../functions/v1/customer-bff/auth/login'
 *   buildBffUrl('/customer-bff/dashboard') -> 'https://.../functions/v1/customer-bff/dashboard'
 *   buildBffUrl('/customer-bff/auth/forgot-password', 'https://.../functions/v1/customer-bff/')
 *     -> 'https://.../functions/v1/customer-bff/auth/forgot-password'
 */
export function buildBffUrl(endpoint: string, customBase?: string): string {
  const rawBase = (customBase || getBffBaseUrl()).trim();
  let base = rawBase.replace(/\/+$/, '');

  if (!base.endsWith('/customer-bff')) {
    base = `${base}/customer-bff`;
  }

  let cleanEndpoint = endpoint.trim().replace(/^\/+/, '');
  if (cleanEndpoint.startsWith('customer-bff/')) {
    cleanEndpoint = cleanEndpoint.slice('customer-bff/'.length);
  } else if (cleanEndpoint === 'customer-bff') {
    cleanEndpoint = '';
  }

  return cleanEndpoint ? `${base}/${cleanEndpoint}` : base;
}
