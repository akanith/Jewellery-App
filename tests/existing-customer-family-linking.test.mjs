import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');

/**
 * RAMYAS JEWELLER — Existing-Customer Family Linking & Profile-Sync Regression Suite
 *
 * Offline-verifiable suite covering:
 * 1. Migration SQL security & consistency invariants (20261112120000_support_existing_customer_family_linking.sql).
 * 2. Customer BFF profile listing & profile switching payload synchronization (customer-bff/index.ts).
 * 3. Live TypeScript-transpiled execution of customer-app/src/services/customerAuthService.ts
 *    for profile switching, mobile number sync across phone changes, password reset sync,
 *    and server-side unlink snapback.
 * 4. Customer App reset-password & localization safety.
 * 5. Admin Dashboard Family Access & Linked Profiles UI/RPC contracts.
 */

function loadCustomerAppTsModule(relativePath, mocks = {}) {
  const rootDir = process.cwd();
  const cache = new Map();

  function resolveModulePath(specifier, fromFile) {
    if (specifier.startsWith('@/')) {
      return resolve(rootDir, 'customer-app/src', specifier.slice(2)) + '.ts';
    }
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      const base = resolve(dirname(fromFile), specifier);
      return base.endsWith('.ts') ? base : `${base}.ts`;
    }
    return null;
  }

  function loadFile(filePath) {
    if (cache.has(filePath)) {
      return cache.get(filePath).exports;
    }

    const source = readFileSync(filePath, 'utf-8');
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        strict: false,
      },
      fileName: filePath,
    });

    const mod = { exports: {} };
    cache.set(filePath, mod);

    const localRequire = (specifier) => {
      if (Object.prototype.hasOwnProperty.call(mocks, specifier)) {
        return mocks[specifier];
      }
      const targetPath = resolveModulePath(specifier, filePath);
      if (targetPath) {
        return loadFile(targetPath);
      }
      throw new Error(`Unexpected unmocked dependency '${specifier}' imported from ${filePath}`);
    };

    const fn = new vm.Script(
      `(function (exports, require, module, __filename, __dirname) { ${transpiled.outputText}\n})`,
      { filename: filePath }
    ).runInThisContext();

    fn(mod.exports, localRequire, mod, filePath, dirname(filePath));
    return mod.exports;
  }

  return loadFile(resolve(rootDir, relativePath));
}

function createMemoryAsyncStorage() {
  const store = new Map();
  return {
    store,
    api: {
      __esModule: true,
      default: {
        getItem: async (k) => (store.has(k) ? store.get(k) : null),
        setItem: async (k, v) => {
          store.set(k, String(v));
        },
        removeItem: async (k) => {
          store.delete(k);
        },
      },
    },
  };
}

test('1. Migration 20261112120000 enforces security invariants, normalization, duplicate rejection, and non-destructive guarantees', () => {
  const sql = readFileSync(
    'supabase/migrations/20261112120000_support_existing_customer_family_linking.sql',
    'utf-8'
  );

  // Non-destructive guarantees: must never delete or truncate financial/customer data
  assert.doesNotMatch(sql, /\bDELETE\s+FROM\b/i, 'Migration must not delete existing records');
  assert.doesNotMatch(sql, /\bTRUNCATE\b/i, 'Migration must not truncate tables');

  // Shared helper handles +91 / 0 normalization cleanly
  assert.match(sql, /CREATE OR REPLACE FUNCTION private\.normalize_mobile_number/i);
  assert.match(sql, /pg_catalog\.length\(v_digits\) = 12 AND pg_catalog\.left\(v_digits, 2\) = '91'/i);
  assert.match(sql, /pg_catalog\.length\(v_digits\) = 11 AND pg_catalog\.left\(v_digits, 1\) = '0'/i);

  // link_customer_family_profiles hardens against duplicates & cross-phone multi-member group bridging
  assert.match(sql, /Duplicate link rejected:.*USING ERRCODE = '23505'/s);
  assert.match(sql, /Existing family link with % \(%\) uses a different mobile number/i);
  assert.match(sql, /IF NOT private\.is_admin\(\)/i);
  assert.match(sql, /IF p_consent_confirmed IS NULL OR p_consent_confirmed IS NOT TRUE/i);

  // unlink_customer_family_profiles deactivates both directions and snaps switched sessions back to root
  assert.match(sql, /SET customer_id = authenticated_root_id/i);

  // verify_customer_session enforces live authorization check on every request
  assert.match(
    sql,
    /AND public\.is_customer_authorized_for_profile\(\s*COALESCE\(s\.authenticated_root_id, s\.customer_id\),\s*s\.customer_id\s*\)/i
  );

  // is_customer_authorized_for_profile requires active CUSTOMER role on both profiles
  assert.match(sql, /p_auth\.role = 'CUSTOMER'/i);
  assert.match(sql, /p_target\.role = 'CUSTOMER'/i);

  // Security Advisor grant hygiene: revoke PUBLIC and anon on every function in the migration
  const revokes = sql.match(/REVOKE ALL ON FUNCTION .+ FROM PUBLIC, anon/gi) || [];
  assert.ok(revokes.length >= 7, `Expected >= 7 function REVOKE guards, found ${revokes.length}`);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_customer_family_context\(UUID\) TO authenticated, service_role/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.verify_customer_session\(VARCHAR\) TO service_role, postgres/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.switch_customer_profile_session\(VARCHAR, UUID\) TO service_role, postgres/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.customer_password_login\(VARCHAR, TEXT, TEXT\) TO service_role, postgres/i);
});

test('2. Customer BFF synchronizes mobileNumber and enforces role=CUSTOMER across /select-profile and /profiles', () => {
  const bff = readFileSync('supabase/functions/customer-bff/index.ts', 'utf-8');

  // handleSelectProfile extracts phone/mobile and enforces CUSTOMER role in fallback
  const selectFn = bff.slice(
    bff.indexOf('async function handleSelectProfile'),
    bff.indexOf('async function handleGetProfiles')
  );
  assert.match(selectFn, /profiles!inner\(is_active, role\)/);
  assert.match(selectFn, /\.eq\(["']profiles\.role["'], ["']CUSTOMER["']\)/);
  assert.match(selectFn, /mobileNumber:/);
  assert.match(selectFn, /normalizeMobileNumber\(targetCust\.phone_number/);

  // handleGetProfiles returns normalized mobileNumber and enforces CUSTOMER role
  const getProfilesFn = bff.slice(
    bff.indexOf('async function handleGetProfiles'),
    bff.indexOf('async function handleForgotPassword')
  );
  assert.match(getProfilesFn, /profiles!inner\(is_active, role\)/);
  assert.match(getProfilesFn, /\.eq\(["']profiles\.role["'], ["']CUSTOMER["']\)/);
  assert.match(getProfilesFn, /mobileNumber:\s*normalizeMobileNumber\(/);
});

test('3. customerAuthService runtime execution keeps mobileNumber, customerId, and passwordStatus synced across profile switches and phone splits', async () => {
  const mem = createMemoryAsyncStorage();
  const originalFetch = globalThis.fetch;

  const rukmaniId = '11111111-1111-1111-1111-111111111147';
  const govindarajId = '22222222-2222-2222-2222-222222222248';
  let serverActiveId = govindarajId;
  let serverPasswordStatus = {
    [rukmaniId]: 'RESET_REQUIRED',
    [govindarajId]: 'RESET_REQUIRED',
  };
  let serverAuthorizedProfiles = [
    {
      customerId: govindarajId,
      customerCode: 'RJ2026-048',
      fullName: 'Govindaraj',
      mobileNumber: '9943199768',
      passwordStatus: 'RESET_REQUIRED',
      schemeCount: 1,
    },
    {
      customerId: rukmaniId,
      customerCode: 'RJ2026-047',
      fullName: 'Rukmani',
      // Simulate Rukmani later changing her phone while remaining linked
      mobileNumber: '9888877777',
      passwordStatus: 'RESET_REQUIRED',
      schemeCount: 1,
    },
  ];

  globalThis.fetch = async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : {};

    if (u.endsWith('/auth/login')) {
      return new Response(
        JSON.stringify({
          success: true,
          token: 'tok-family-session',
          requiresSelection: true,
          customer: {
            customerId: govindarajId,
            customerCode: 'RJ2026-048',
            fullName: 'Govindaraj',
            mobileNumber: '9943199768',
            passwordStatus: serverPasswordStatus[govindarajId],
          },
          profiles: serverAuthorizedProfiles.map((p) => ({
            ...p,
            passwordStatus: serverPasswordStatus[p.customerId],
          })),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (u.endsWith('/auth/select-profile')) {
      serverActiveId = body.customerId;
      const picked = serverAuthorizedProfiles.find((p) => p.customerId === serverActiveId);
      return new Response(
        JSON.stringify({
          success: true,
          customer: {
            customerId: picked.customerId,
            customerCode: picked.customerCode,
            fullName: picked.fullName,
            mobileNumber: picked.mobileNumber,
            passwordStatus: serverPasswordStatus[picked.customerId],
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (u.endsWith('/auth/change-password')) {
      serverPasswordStatus[serverActiveId] = 'ACTIVE';
      return new Response(
        JSON.stringify({ success: true, message: 'Password updated' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (u.endsWith('/auth/profiles')) {
      const current = serverAuthorizedProfiles.find((p) => p.customerId === serverActiveId);
      return new Response(
        JSON.stringify({
          success: true,
          authenticatedRootId: govindarajId,
          activeCustomerId: current.customerId,
          profiles: serverAuthorizedProfiles.map((p) => ({
            ...p,
            passwordStatus: serverPasswordStatus[p.customerId],
          })),
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Unexpected fetch URL: ${u}`);
  };

  try {
    const authService = loadCustomerAppTsModule('customer-app/src/services/customerAuthService.ts', {
      '@react-native-async-storage/async-storage': mem.api,
      './urlConfig': {
        buildBffUrl: (endpoint) => `https://mock.local/functions/v1/customer-bff${endpoint}`,
      },
    });

    // A. Initial login succeeds as Govindaraj with both family profiles present
    const loginRes = await authService.loginWithMobile('9943199768', '9768');
    assert.equal(loginRes.success, true);
    assert.equal(loginRes.requiresSelection, true);
    assert.equal(loginRes.session.customerId, govindarajId);
    assert.equal(loginRes.session.authorizedProfiles.length, 2);

    // B. Switch to Rukmani (whose current mobile differs: 9888877777)
    const switchRes = await authService.selectCustomerProfile(rukmaniId);
    assert.equal(switchRes.success, true);

    const switchedSession = await authService.getStoredCustomerSession();
    assert.equal(switchedSession.customerId, rukmaniId);
    assert.equal(switchedSession.customerCode, 'RJ2026-047');
    assert.equal(switchedSession.fullName, 'Rukmani');
    assert.equal(
      switchedSession.mobileNumber,
      '9888877777',
      'Switching profile must update session.mobileNumber so password reset verifies current mobile'
    );

    // C. Complete password reset as Rukmani and verify authorizedProfiles reflects ACTIVE for Rukmani ONLY
    const pwdRes = await authService.changePassword('7777', 'RukmaniNewPass#1');
    assert.equal(pwdRes.success, true);
    const postPwdSession = await authService.getStoredCustomerSession();
    assert.equal(postPwdSession.passwordStatus, 'ACTIVE');
    assert.equal(
      postPwdSession.authorizedProfiles.find((p) => p.customerId === rukmaniId)?.passwordStatus,
      'ACTIVE',
      'Active profile entry in authorizedProfiles must update to ACTIVE after password reset'
    );
    assert.equal(
      postPwdSession.authorizedProfiles.find((p) => p.customerId === govindarajId)?.passwordStatus,
      'RESET_REQUIRED',
      'Linked partner password status must remain isolated'
    );

    // D. Simulate admin unlinking Rukmani server-side -> session snaps back to Govindaraj on /auth/profiles
    serverActiveId = govindarajId;
    serverAuthorizedProfiles = [serverAuthorizedProfiles[0]];
    const refreshedProfiles = await authService.getAuthorizedProfiles();
    assert.equal(refreshedProfiles.length, 1);

    const snappedSession = await authService.getStoredCustomerSession();
    assert.equal(snappedSession.customerId, govindarajId);
    assert.equal(snappedSession.customerCode, 'RJ2026-048');
    assert.equal(snappedSession.mobileNumber, '9943199768');
    assert.equal(snappedSession.authorizedProfiles.length, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('4. Customer App reset-password and localization files reflect linked-family model', () => {
  const resetPwd = readFileSync('customer-app/src/app/reset-password.tsx', 'utf-8');
  assert.match(
    resetPwd,
    /session\?\.authorizedProfiles\?\.find\(\s*\(p\) => p\.customerId === session\.customerId\s*\)/,
    'reset-password.tsx must prefer active profile from authorizedProfiles'
  );
  assert.match(
    resetPwd,
    /activeProfile\?\.mobileNumber \|\| session\?\.mobileNumber \|\| ''/,
    'reset-password.tsx must fall back cleanly to session.mobileNumber'
  );

  const translations = readFileSync('customer-app/src/i18n/translations.ts', 'utf-8');
  assert.match(translations, /Switch between linked family customer profiles/);
  assert.match(translations, /Linked Family Access/);
  assert.doesNotMatch(translations, /registered with the same mobile number/);
});

test('5. Admin Dashboard Family Access UI, EditCustomerModal, and RPC types enforce explicit consent and no auto-merge', () => {
  const card = readFileSync('admin-web/src/components/customers/FamilyAccessCard.tsx', 'utf-8');
  const editModal = readFileSync('admin-web/src/components/modals/EditCustomerModal.tsx', 'utf-8');
  const detailPage = readFileSync('admin-web/src/app/(dashboard)/customers/[id]/page.tsx', 'utf-8');
  const rpc = readFileSync('admin-web/src/lib/supabase/rpc.ts', 'utf-8');
  const dbTypes = readFileSync('admin-web/src/types/database.ts', 'utf-8');

  // Customer Details mounts FamilyAccessCard cleanly (single instance) and passes refreshKey
  const mountMatches = detailPage.match(/<FamilyAccessCard\b/g) || [];
  assert.equal(mountMatches.length, 1, 'FamilyAccessCard must be mounted exactly once on Customer Details');
  assert.match(detailPage, /refreshKey=\{familyRefreshKey\}/);

  // EditCustomerModal explains phone edits preserve links and never auto-link
  assert.match(
    editModal,
    /preserves any existing family links and never automatically links customers/i
  );

  // FamilyAccessCard enforces consent checkbox before enabling link confirmation
  assert.match(card, /Family Access &amp; Linked Profiles|Family Access & Linked Profiles/);
  assert.match(card, /disabled=\{!consentConfirmed \|\| isLinking\}/);
  assert.match(card, /No Account Merge/i);
  assert.match(card, /Different Mobile Now/);
  assert.match(card, /linkCustomerFamilyProfiles\(/);
  assert.match(card, /unlinkCustomerFamilyProfiles\(/);

  // RPC wrapper & database types expose get_customer_family_context
  assert.match(rpc, /export async function getCustomerFamilyContext\(\s*customerId: string\s*\)/);
  assert.match(rpc, /'get_customer_family_context'/);
  assert.match(dbTypes, /export interface CustomerFamilyContextResult/);
  assert.match(dbTypes, /unlinked_rows\?: number/);
});
