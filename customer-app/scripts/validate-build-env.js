#!/usr/bin/env node
/**
 * RAMYAS JEWELLER — Preflight Build Environment Validator
 *
 * Validates environment configuration before EAS builds and exports.
 * Strictly prevents preview builds from running without a dedicated staging backend
 * and ensures live production Supabase database cannot be targeted by preview test builds.
 */

const KNOWN_PRODUCTION_HOST = 'yjpbswsgtbmgageburmy.supabase.co';
const DEFAULT_HOSTED_BFF_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';

function isLocalhost(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes('127.0.0.1') ||
    lower.includes('localhost') ||
    lower.includes('10.0.2.2') ||
    lower.includes('0.0.0.0') ||
    lower.startsWith('http://192.168.') ||
    lower.startsWith('http://10.')
  );
}

function isProductionHost(url) {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.includes(KNOWN_PRODUCTION_HOST.toLowerCase()) ||
    lower.startsWith(DEFAULT_HOSTED_BFF_URL.toLowerCase())
  );
}

export function validateBuildEnvironment(env = process.env) {
  const appEnv = (env.EXPO_PUBLIC_APP_ENV || '').trim().toLowerCase();
  const buildProfile = (env.EAS_BUILD_PROFILE || '').trim().toLowerCase();

  // 1. STAGING / PREVIEW VALIDATION
  if (appEnv === 'staging' || appEnv === 'preview' || buildProfile === 'preview') {
    const stagingUrl = (env.EXPO_PUBLIC_STAGING_BFF_BASE_URL || env.EXPO_PUBLIC_BFF_BASE_URL || '').trim();

    if (!stagingUrl) {
      return {
        valid: false,
        environment: 'staging',
        error:
          'Preview build blocked: EXPO_PUBLIC_APP_ENV is set to staging, but EXPO_PUBLIC_STAGING_BFF_BASE_URL is not configured.\n' +
          'Preview builds must NOT connect to the live production Supabase database (yjpbswsgtbmgageburmy.supabase.co).\n' +
          'To enable preview builds, provision a dedicated staging backend and configure EXPO_PUBLIC_STAGING_BFF_BASE_URL on expo.dev.',
      };
    }

    if (isLocalhost(stagingUrl)) {
      return {
        valid: false,
        environment: 'staging',
        error: `Preview build blocked: Staging BFF URL cannot point to localhost or loopback (${stagingUrl}).`,
      };
    }

    if (!stagingUrl.startsWith('https://')) {
      return {
        valid: false,
        environment: 'staging',
        error: `Preview build blocked: Staging BFF URL must use HTTPS protocol (${stagingUrl}).`,
      };
    }

    if (isProductionHost(stagingUrl)) {
      return {
        valid: false,
        environment: 'staging',
        error:
          `Preview build blocked: Staging BFF URL cannot point to the production backend (${stagingUrl}).\n` +
          'A separate staging Supabase project is required to protect production records.',
      };
    }

    return {
      valid: true,
      environment: 'staging',
      url: stagingUrl,
    };
  }

  // 2. PRODUCTION / HOSTED VALIDATION
  if (appEnv === 'hosted' || appEnv === 'production' || buildProfile === 'production') {
    const prodUrl = (env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL || DEFAULT_HOSTED_BFF_URL).trim();

    if (!prodUrl) {
      return {
        valid: false,
        environment: 'production',
        error: 'Production build blocked: Production BFF URL is not configured.',
      };
    }

    if (isLocalhost(prodUrl)) {
      return {
        valid: false,
        environment: 'production',
        error: `Production build blocked: Production BFF URL cannot point to localhost or loopback (${prodUrl}).`,
      };
    }

    if (!prodUrl.startsWith('https://')) {
      return {
        valid: false,
        environment: 'production',
        error: `Production build blocked: Production BFF URL must use HTTPS (${prodUrl}).`,
      };
    }

    return {
      valid: true,
      environment: 'production',
      url: prodUrl,
    };
  }

  // 3. LOCAL DEVELOPMENT
  if (appEnv === 'local' || appEnv === 'development') {
    if (buildProfile && buildProfile !== 'development') {
      return {
        valid: false,
        environment: 'local',
        error: `Cloud build blocked: EAS build profile '${buildProfile}' cannot use EXPO_PUBLIC_APP_ENV=local.`,
      };
    }

    return {
      valid: true,
      environment: 'local',
      url: (env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL || 'http://127.0.0.1:54321/functions/v1').trim(),
    };
  }

  // 4. DEFAULT FALLBACK
  return {
    valid: true,
    environment: 'unspecified',
  };
}

import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Direct CLI execution
const currentFilePath = fileURLToPath(import.meta.url);
const entryFilePath = process.argv[1] ? path.resolve(process.argv[1]) : '';

if (entryFilePath && path.resolve(currentFilePath) === entryFilePath) {
  const result = validateBuildEnvironment(process.env);
  if (!result.valid) {
    console.error('\n' + '='.repeat(80));
    console.error('[EAS PREFLIGHT BUILD VALIDATION FAILED]');
    console.error('='.repeat(80));
    console.error(result.error);
    console.error('='.repeat(80) + '\n');
    process.exit(1);
  } else {
    console.log(`[Preflight Check] Build environment verified: ${result.environment} (${result.url || 'local default'})`);
  }
}
