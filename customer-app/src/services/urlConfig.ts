/**
 * URL Configuration and Normalization Utilities for Customer BFF.
 * Centralizes environment resolution and robust endpoint URL construction.
 */

export const KNOWN_PRODUCTION_HOST = 'yjpbswsgtbmgageburmy.supabase.co';
export const DEFAULT_HOSTED_BFF_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';
export const DEFAULT_LOCAL_BFF_URL = 'http://127.0.0.1:54321/functions/v1';

/**
 * Checks whether a given URL points to a local or loopback address.
 */
export function isLocalhostUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('127.0.0.1') ||
    lower.includes('localhost') ||
    lower.includes('10.0.2.2') || // Android emulator loopback alias
    lower.includes('0.0.0.0') ||
    lower.startsWith('http://192.168.') ||
    lower.startsWith('http://10.')
  );
}

/**
 * Checks whether a given URL points to the known production backend.
 */
export function isProductionBackendUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(KNOWN_PRODUCTION_HOST.toLowerCase()) ||
    lower.startsWith(DEFAULT_HOSTED_BFF_URL.toLowerCase())
  );
}

/**
 * Validates that a production/hosted URL is safe for release:
 * - Must be a non-empty string.
 * - Must use HTTPS protocol.
 * - Must not point to localhost or private loopback addresses.
 */
export function validateProductionBffUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    throw new Error(
      '[URL Configuration Error] Production/hosted BFF URL is not configured. ' +
      'Please set EXPO_PUBLIC_HOSTED_BFF_BASE_URL in your release environment.'
    );
  }

  if (isLocalhostUrl(trimmed)) {
    throw new Error(
      `[URL Configuration Error] In production/hosted mode, BFF URL cannot point to localhost or loopback (${trimmed}). ` +
      'A production release build must connect to a remote HTTPS Supabase endpoint.'
    );
  }

  if (!trimmed.startsWith('https://')) {
    throw new Error(
      `[URL Configuration Error] Production/hosted BFF URL must use HTTPS protocol (${trimmed}).`
    );
  }

  return trimmed;
}

/**
 * Validates that a staging/preview URL is safe and isolated:
 * - Must be a non-empty string.
 * - Must use HTTPS protocol.
 * - Must not point to localhost or private loopback addresses.
 * - Must NOT point to the live production Supabase instance.
 */
export function validateStagingBffUrl(url: string): string {
  const trimmed = (url || '').trim();
  if (!trimmed) {
    throw new Error(
      '[URL Configuration Error] Staging BFF URL is not configured. ' +
      'Please set EXPO_PUBLIC_STAGING_BFF_BASE_URL in your staging/preview environment.'
    );
  }

  if (isLocalhostUrl(trimmed)) {
    throw new Error(
      `[URL Configuration Error] In staging mode, BFF URL cannot point to localhost or loopback (${trimmed}). ` +
      'Staging preview builds must connect to a remote HTTPS staging endpoint.'
    );
  }

  if (!trimmed.startsWith('https://')) {
    throw new Error(
      `[URL Configuration Error] Staging BFF URL must use HTTPS protocol (${trimmed}).`
    );
  }

  if (isProductionBackendUrl(trimmed)) {
    throw new Error(
      `[URL Configuration Error] In staging mode, BFF URL cannot point to the production backend (${trimmed}). ` +
      'Staging preview builds must use a dedicated staging environment to protect production records.'
    );
  }

  return trimmed;
}

/**
 * Resolves the active BFF base URL.
 * Supports explicit environment switching via EXPO_PUBLIC_APP_ENV:
 * - 'staging' / 'preview'   -> Points to dedicated staging Supabase Edge Functions. Rejects missing URLs and production backend.
 * - 'hosted' / 'production' -> Points to hosted Supabase Edge Functions with strict HTTPS validation.
 * - 'local' / 'development' -> Points to local Docker Supabase Edge Functions (default: 127.0.0.1:54321).
 * - undefined               -> Defaults to local in development (__DEV__ === true), or hosted with validation in release.
 */
export function getBffBaseUrl(): string {
  const isDev = typeof __DEV__ !== 'undefined' ? Boolean(__DEV__) : process.env.NODE_ENV !== 'production';
  const rawAppEnv = (process.env.EXPO_PUBLIC_APP_ENV || '').trim().toLowerCase();

  // 1. Explicit STAGING / PREVIEW mode
  if (rawAppEnv === 'staging' || rawAppEnv === 'preview') {
    const candidate = (process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL || process.env.EXPO_PUBLIC_BFF_BASE_URL || '').trim();
    return validateStagingBffUrl(candidate);
  }

  // 2. Explicit HOSTED / PRODUCTION mode
  if (rawAppEnv === 'hosted' || rawAppEnv === 'production') {
    const candidate = (process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL || DEFAULT_HOSTED_BFF_URL).trim();
    return validateProductionBffUrl(candidate);
  }

  // 3. Explicit LOCAL / DEVELOPMENT mode
  if (rawAppEnv === 'local' || rawAppEnv === 'development') {
    // Safety check: Warn if a release build is compiled with local loopback configuration
    if (!isDev) {
      console.warn(
        '[Release Configuration Warning] Standalone release bundle detected with EXPO_PUBLIC_APP_ENV=local. ' +
        'Network calls to localhost (127.0.0.1) will fail on physical mobile devices. ' +
        'Please build with EXPO_PUBLIC_APP_ENV=hosted for production release.'
      );
    }
    return (process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL || DEFAULT_LOCAL_BFF_URL).trim();
  }

  // 4. Fallback / Unspecified mode
  // If EXPO_PUBLIC_BFF_BASE_URL is explicitly set, check if it's safe
  if (process.env.EXPO_PUBLIC_BFF_BASE_URL) {
    const candidate = process.env.EXPO_PUBLIC_BFF_BASE_URL.trim();
    if (!isDev && isLocalhostUrl(candidate)) {
      throw new Error(
        `[URL Configuration Error] Standalone release build cannot use localhost fallback URL (${candidate}). ` +
        'Configure EXPO_PUBLIC_APP_ENV=hosted with a valid HTTPS Supabase endpoint.'
      );
    }
    return candidate;
  }

  // 5. Default: Local in development, Hosted in production release
  if (isDev) {
    return (process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL || DEFAULT_LOCAL_BFF_URL).trim();
  }

  return validateProductionBffUrl(
    (process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL || DEFAULT_HOSTED_BFF_URL).trim()
  );
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
