import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Import urlConfig functions using direct evaluation
import {
  isLocalhostUrl,
  isProductionBackendUrl,
  validateProductionBffUrl,
  validateStagingBffUrl,
  getBffBaseUrl,
  buildBffUrl,
  KNOWN_PRODUCTION_HOST,
  DEFAULT_HOSTED_BFF_URL,
  DEFAULT_LOCAL_BFF_URL,
} from '../customer-app/src/services/urlConfig.ts';

import { validateBuildEnvironment } from '../customer-app/scripts/validate-build-env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

test('1. isLocalhostUrl accurately identifies local, loopback, and emulator addresses', () => {
  assert.equal(isLocalhostUrl('http://127.0.0.1:54321/functions/v1'), true);
  assert.equal(isLocalhostUrl('http://localhost:54321/functions/v1'), true);
  assert.equal(isLocalhostUrl('http://10.0.2.2:54321/functions/v1'), true);
  assert.equal(isLocalhostUrl('http://0.0.0.0:54321'), true);
  assert.equal(isLocalhostUrl('http://192.168.1.100:54321'), true);

  assert.equal(isLocalhostUrl('https://yjpbswsgtbmgageburmy.supabase.co/functions/v1'), false);
  assert.equal(isLocalhostUrl('https://api.ramyasjeweller.com/bff'), false);
});

test('2. isProductionBackendUrl accurately identifies known production host and URLs', () => {
  assert.equal(isProductionBackendUrl('https://yjpbswsgtbmgageburmy.supabase.co'), true);
  assert.equal(isProductionBackendUrl('https://yjpbswsgtbmgageburmy.supabase.co/functions/v1'), true);
  assert.equal(isProductionBackendUrl('https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff'), true);
  assert.equal(isProductionBackendUrl(DEFAULT_HOSTED_BFF_URL), true);

  // Staging / other URLs must return false
  assert.equal(isProductionBackendUrl('https://ramyas-staging.supabase.co/functions/v1'), false);
  assert.equal(isProductionBackendUrl('http://127.0.0.1:54321/functions/v1'), false);
  assert.equal(isProductionBackendUrl(''), false);
});

test('3. validateProductionBffUrl accepts valid remote HTTPS Supabase endpoints', () => {
  const validUrl = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';
  assert.equal(validateProductionBffUrl(validUrl), validUrl);
  assert.equal(validateProductionBffUrl(DEFAULT_HOSTED_BFF_URL), DEFAULT_HOSTED_BFF_URL);
});

test('4. validateProductionBffUrl strictly rejects localhost, loopback, and non-HTTPS endpoints', () => {
  // Empty or whitespace
  assert.throws(
    () => validateProductionBffUrl(''),
    /Production\/hosted BFF URL is not configured/
  );

  // Localhost / Loopback
  assert.throws(
    () => validateProductionBffUrl('http://127.0.0.1:54321/functions/v1'),
    /BFF URL cannot point to localhost or loopback/
  );
  assert.throws(
    () => validateProductionBffUrl('http://localhost:54321/functions/v1'),
    /BFF URL cannot point to localhost or loopback/
  );
  assert.throws(
    () => validateProductionBffUrl('https://localhost/functions/v1'),
    /BFF URL cannot point to localhost or loopback/
  );

  // Insecure HTTP remote
  assert.throws(
    () => validateProductionBffUrl('http://example.com/functions/v1'),
    /must use HTTPS protocol/
  );
});

test('5. validateStagingBffUrl accepts valid remote HTTPS staging endpoints', () => {
  const stagingUrl = 'https://ramyas-staging.supabase.co/functions/v1';
  assert.equal(validateStagingBffUrl(stagingUrl), stagingUrl);
});

test('6. validateStagingBffUrl strictly rejects missing, localhost, non-HTTPS, and PRODUCTION backend URLs', () => {
  // Missing or empty
  assert.throws(
    () => validateStagingBffUrl(''),
    /Staging BFF URL is not configured/
  );

  // Localhost / Loopback
  assert.throws(
    () => validateStagingBffUrl('http://127.0.0.1:54321/functions/v1'),
    /In staging mode, BFF URL cannot point to localhost or loopback/
  );
  assert.throws(
    () => validateStagingBffUrl('http://10.0.2.2:54321/functions/v1'),
    /In staging mode, BFF URL cannot point to localhost or loopback/
  );

  // Insecure HTTP
  assert.throws(
    () => validateStagingBffUrl('http://ramyas-staging.supabase.co/functions/v1'),
    /Staging BFF URL must use HTTPS protocol/
  );

  // Production backend URL rejection (CRITICAL SAFETY RULE)
  assert.throws(
    () => validateStagingBffUrl('https://yjpbswsgtbmgageburmy.supabase.co/functions/v1'),
    /In staging mode, BFF URL cannot point to the production backend/
  );
  assert.throws(
    () => validateStagingBffUrl(DEFAULT_HOSTED_BFF_URL),
    /In staging mode, BFF URL cannot point to the production backend/
  );
});

test('7. getBffBaseUrl in staging mode resolves staging URL when configured', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const origStagingUrl = process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL;

  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL = 'https://ramyas-staging.supabase.co/functions/v1';

    assert.equal(getBffBaseUrl(), 'https://ramyas-staging.supabase.co/functions/v1');

    // Synonym 'preview'
    process.env.EXPO_PUBLIC_APP_ENV = 'preview';
    assert.equal(getBffBaseUrl(), 'https://ramyas-staging.supabase.co/functions/v1');
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
    process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL = origStagingUrl;
  }
});

test('8. getBffBaseUrl in staging mode fails safely without silent fallback when unconfigured or targeting production', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const origStagingUrl = process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL;
  const origBffUrl = process.env.EXPO_PUBLIC_BFF_BASE_URL;

  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'staging';
    delete process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL;
    delete process.env.EXPO_PUBLIC_BFF_BASE_URL;

    // Must NOT silently fall back to production or local Docker
    assert.throws(
      () => getBffBaseUrl(),
      /Staging BFF URL is not configured/
    );

    // If pointing to production
    process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';
    assert.throws(
      () => getBffBaseUrl(),
      /In staging mode, BFF URL cannot point to the production backend/
    );
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
    process.env.EXPO_PUBLIC_STAGING_BFF_BASE_URL = origStagingUrl;
    process.env.EXPO_PUBLIC_BFF_BASE_URL = origBffUrl;
  }
});

test('9. getBffBaseUrl resolves local Docker URL when EXPO_PUBLIC_APP_ENV=local', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const origLocalUrl = process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL;

  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'local';
    process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL = 'http://127.0.0.1:54321/functions/v1';

    const resolved = getBffBaseUrl();
    assert.equal(resolved, 'http://127.0.0.1:54321/functions/v1');
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
    process.env.EXPO_PUBLIC_LOCAL_BFF_BASE_URL = origLocalUrl;
  }
});

test('10. getBffBaseUrl resolves hosted HTTPS URL when EXPO_PUBLIC_APP_ENV=hosted or production', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const origHostedUrl = process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL;

  try {
    // Mode 'hosted'
    process.env.EXPO_PUBLIC_APP_ENV = 'hosted';
    process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';
    assert.equal(getBffBaseUrl(), 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1');

    // Synonym 'production'
    process.env.EXPO_PUBLIC_APP_ENV = 'production';
    assert.equal(getBffBaseUrl(), 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1');
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
    process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL = origHostedUrl;
  }
});

test('11. getBffBaseUrl in hosted mode rejects misconfigured localhost URLs with clear error', () => {
  const origEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const origHostedUrl = process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL;

  try {
    process.env.EXPO_PUBLIC_APP_ENV = 'hosted';
    process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL = 'http://127.0.0.1:54321/functions/v1';

    assert.throws(
      () => getBffBaseUrl(),
      /BFF URL cannot point to localhost or loopback/
    );
  } finally {
    process.env.EXPO_PUBLIC_APP_ENV = origEnv;
    process.env.EXPO_PUBLIC_HOSTED_BFF_BASE_URL = origHostedUrl;
  }
});

test('12. buildBffUrl correctly formats endpoint paths without duplicate /customer-bff segments', () => {
  const hostedBase = 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1';

  assert.equal(
    buildBffUrl('/auth/login', hostedBase),
    'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff/auth/login'
  );

  assert.equal(
    buildBffUrl('dashboard', hostedBase),
    'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff/dashboard'
  );

  assert.equal(
    buildBffUrl('/customer-bff/receipt?receiptNumber=123', hostedBase),
    'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff/receipt?receiptNumber=123'
  );

  // If base already contains /customer-bff
  assert.equal(
    buildBffUrl('/auth/login', 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff'),
    'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1/customer-bff/auth/login'
  );
});

test('13. customer-app/eas.json separates production and preview, and removes live production URL from preview', () => {
  const easPath = path.join(PROJECT_ROOT, 'customer-app', 'eas.json');
  assert.equal(fs.existsSync(easPath), true, 'eas.json must exist');

  const eas = JSON.parse(fs.readFileSync(easPath, 'utf-8'));
  assert.ok(eas.build, 'eas.json must define build profiles');

  // Verify production profile
  assert.ok(eas.build.production, 'production profile must exist');
  assert.equal(eas.build.production.developmentClient, false, 'production profile must have developmentClient: false');
  assert.equal(eas.build.production.distribution, 'store', 'production profile must have distribution: store');
  assert.equal(eas.build.production.android?.buildType, 'app-bundle', 'production profile must build app-bundle');
  assert.equal(eas.build.production.env?.EXPO_PUBLIC_APP_ENV, 'hosted', 'production profile must specify EXPO_PUBLIC_APP_ENV=hosted');
  assert.match(eas.build.production.env?.EXPO_PUBLIC_HOSTED_BFF_BASE_URL, /^https:\/\//, 'production profile must use https BFF URL');

  // Verify preview profile: MUST BE STAGING AND MUST NOT CONTAIN PRODUCTION URL
  assert.ok(eas.build.preview, 'preview profile must exist');
  assert.equal(eas.build.preview.developmentClient, false, 'preview profile must have developmentClient: false');
  assert.equal(eas.build.preview.distribution, 'internal', 'preview profile must have distribution: internal');
  assert.equal(eas.build.preview.android?.buildType, 'apk', 'preview profile must build apk for testing');
  assert.equal(eas.build.preview.env?.EXPO_PUBLIC_APP_ENV, 'staging', 'preview profile must specify EXPO_PUBLIC_APP_ENV=staging');

  // Hardcoded production URL must be removed
  assert.equal(eas.build.preview.env?.EXPO_PUBLIC_HOSTED_SUPABASE_URL, undefined, 'preview must not hardcode production Supabase URL');
  assert.equal(eas.build.preview.env?.EXPO_PUBLIC_HOSTED_BFF_BASE_URL, undefined, 'preview must not hardcode production BFF URL');
});

test('14. customer-app/.env.local preserves local development configuration', () => {
  const envLocalPath = path.join(PROJECT_ROOT, 'customer-app', '.env.local');
  assert.equal(fs.existsSync(envLocalPath), true, '.env.local must exist');

  const content = fs.readFileSync(envLocalPath, 'utf-8');
  assert.match(content, /EXPO_PUBLIC_APP_ENV=local/, '.env.local must have EXPO_PUBLIC_APP_ENV=local');
  assert.match(content, /EXPO_PUBLIC_LOCAL_BFF_BASE_URL=http:\/\/127\.0\.0\.1:54321/, '.env.local must have local Docker URL');
});

test('15. Client build configurations never contain server secrets or service-role keys', () => {
  const easPath = path.join(PROJECT_ROOT, 'customer-app', 'eas.json');
  const easContent = fs.readFileSync(easPath, 'utf-8');
  assert.doesNotMatch(easContent, /service_role/i, 'eas.json must never contain service_role');
  assert.doesNotMatch(easContent, /RAZORPAY_KEY_SECRET/i, 'eas.json must never contain Razorpay secret key');
  assert.doesNotMatch(easContent, /RAZORPAY_WEBHOOK_SECRET/i, 'eas.json must never contain webhook secret');

  const appJsonPath = path.join(PROJECT_ROOT, 'customer-app', 'app.json');
  const appJsonContent = fs.readFileSync(appJsonPath, 'utf-8');
  assert.doesNotMatch(appJsonContent, /service_role/i, 'app.json must never contain service_role');
  assert.doesNotMatch(appJsonContent, /RAZORPAY/i, 'app.json must never contain Razorpay secrets');
});

test('16. validateBuildEnvironment correctly enforces preflight build safety', () => {
  // Staging with missing URL
  const stagingMissing = validateBuildEnvironment({ EXPO_PUBLIC_APP_ENV: 'staging' });
  assert.equal(stagingMissing.valid, false);
  assert.match(stagingMissing.error, /Preview build blocked/);

  // Staging with production URL
  const stagingProd = validateBuildEnvironment({
    EXPO_PUBLIC_APP_ENV: 'staging',
    EXPO_PUBLIC_STAGING_BFF_BASE_URL: 'https://yjpbswsgtbmgageburmy.supabase.co/functions/v1',
  });
  assert.equal(stagingProd.valid, false);
  assert.match(stagingProd.error, /cannot point to the production backend/);

  // Staging with localhost URL
  const stagingLocal = validateBuildEnvironment({
    EXPO_PUBLIC_APP_ENV: 'staging',
    EXPO_PUBLIC_STAGING_BFF_BASE_URL: 'http://127.0.0.1:54321/functions/v1',
  });
  assert.equal(stagingLocal.valid, false);
  assert.match(stagingLocal.error, /cannot point to localhost/);

  // Staging with valid URL
  const stagingValid = validateBuildEnvironment({
    EXPO_PUBLIC_APP_ENV: 'staging',
    EXPO_PUBLIC_STAGING_BFF_BASE_URL: 'https://ramyas-staging.supabase.co/functions/v1',
  });
  assert.equal(stagingValid.valid, true);
  assert.equal(stagingValid.url, 'https://ramyas-staging.supabase.co/functions/v1');

  // Production with valid default
  const prodValid = validateBuildEnvironment({ EXPO_PUBLIC_APP_ENV: 'hosted' });
  assert.equal(prodValid.valid, true);
  assert.equal(prodValid.url, DEFAULT_HOSTED_BFF_URL);

  // Local development
  const localValid = validateBuildEnvironment({ EXPO_PUBLIC_APP_ENV: 'local' });
  assert.equal(localValid.valid, true);
});
