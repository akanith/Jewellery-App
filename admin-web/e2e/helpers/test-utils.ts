import { createClient } from '@supabase/supabase-js';
import { Page, expect } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || 'http://127.0.0.1:54321';
const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

export function assertNotProductionSupabase(url?: string): asserts url is string {
  if (!url || url.trim() === '') {
    throw new Error(
      '[FATAL SAFETY GUARD] NEXT_PUBLIC_SUPABASE_URL is missing. E2E tests MUST run against an isolated local/staging environment.'
    );
  }
  const normalized = url.toLowerCase().trim();
  if (
    normalized.includes('yjpbswsgtbmgageburmy') ||
    normalized.includes('yjpbswsgtbmgageburmy.supabase.co')
  ) {
    throw new Error(
      '[FATAL SAFETY GUARD] Playwright E2E tests are configured against the PRODUCTION Supabase instance (yjpbswsgtbmgageburmy.supabase.co). E2E execution aborted to prevent production database corruption.'
    );
  }
}

assertNotProductionSupabase(SUPABASE_URL);

export function getTestSupabaseClient() {
  return createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Process-scoped cache for authenticated Admin Supabase client to prevent Auth rate limiting
 */
let cachedAdminClient: ReturnType<typeof getTestSupabaseClient> | null = null;
let cachedSessionExpiry: number = 0;

/**
 * Bounded retry helper for Supabase Auth password login to gracefully handle transient rate limits.
 */
async function signInWithRetry(supabase: ReturnType<typeof getTestSupabaseClient>, email: string, password: string, maxAttempts = 3) {
  let attempt = 0;
  type SignInResult = Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
  let lastError: SignInResult['error'] = null;
  let lastData: SignInResult['data'] = { user: null, session: null };

  while (attempt < maxAttempts) {
    attempt++;
    const res = await supabase.auth.signInWithPassword({ email, password });
    if (!res.error) {
      return res;
    }
    lastError = res.error;
    lastData = res.data;

    const msg = res.error.message?.toLowerCase() || '';
    const status = res.error.status;
    const isRateLimitOrTransient = msg.includes('rate limit') || status === 429 || (status && status >= 500);

    if (!isRateLimitOrTransient || attempt >= maxAttempts) {
      break;
    }

    const delay = attempt * 1000;
    console.warn(`[E2E Auth] Supabase Auth rate limit hit on attempt ${attempt}/${maxAttempts}. Retrying in ${delay}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  return { data: lastData, error: lastError };
}

/**
 * Creates and authenticates a Supabase client with Admin session context.
 * Uses process-scoped caching to reuse active session tokens across tests in the same worker.
 */
export async function getAuthenticatedAdminSupabaseClient() {
  const now = Date.now();
  if (cachedAdminClient && now < cachedSessionExpiry) {
    return cachedAdminClient;
  }

  const { email, password } = getE2EAdminCredentials();
  const supabase = getTestSupabaseClient();
  const { data, error } = await signInWithRetry(supabase, email, password);

  if (error || !data?.session) {
    throw new Error(`Failed to authenticate admin Supabase client: ${error?.message || 'No session'}`);
  }

  cachedAdminClient = supabase;
  // Session is valid for 1 hour (3600s); cache for 50 minutes
  cachedSessionExpiry = now + 50 * 60 * 1000;
  return cachedAdminClient;
}

/**
 * Retrieves E2E Admin Credentials from environment variables with safe defaults.
 */
export function getE2EAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL || 'admin1@gmail.com';
  const password = process.env.E2E_ADMIN_PASSWORD || 'admin1';

  return { email, password };
}

/**
 * Helper to log into the Admin Web portal using E2E Admin Credentials
 */
export async function loginAsAdmin(page: Page) {
  const { email, password } = getE2EAdminCredentials();
  await page.goto('/login');

  const emailInput = page.getByLabel(/email address/i);
  const dashboardHeading = page.getByRole('heading', { name: /good day|dashboard|customers directory|ramya/i });

  // Wait for either login form email input OR dashboard heading (if session already active)
  await expect(emailInput.or(dashboardHeading).first()).toBeVisible({ timeout: 20000 });

  if ((await dashboardHeading.isVisible()) && !(await emailInput.isVisible())) {
    return;
  }

  const passwordInput = page.getByLabel(/password/i);
  await expect(emailInput).toBeVisible({ timeout: 15000 });
  await emailInput.click();
  await emailInput.fill(email);
  if ((await emailInput.inputValue()) !== email) {
    await emailInput.pressSequentially(email, { delay: 10 });
  }

  await expect(passwordInput).toBeVisible({ timeout: 15000 });
  await passwordInput.click();
  await passwordInput.fill(password);
  if ((await passwordInput.inputValue()) !== password) {
    await passwordInput.pressSequentially(password, { delay: 10 });
  }

  const signInBtn = page.getByRole('button', { name: /sign in|login/i });
  await expect(signInBtn).toBeVisible({ timeout: 15000 });
  await expect(signInBtn).toBeEnabled({ timeout: 15000 });
  await signInBtn.click();

  // Wait for authenticated dashboard shell to render
  await expect(dashboardHeading).toBeVisible({ timeout: 20000 });
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

/**
 * Helper to create a test customer enrolled in a scheme starting N months in the past (default 11 months).
 * This ensures all 12 installments have calendar_month <= current_month and can be legally recorded.
 */
export async function createTestCustomerWithPastScheme(
  testName: string,
  testMobile: string,
  monthsAgo: number = 11
) {
  const supabase = await getAuthenticatedAdminSupabaseClient();

  const today = new Date();
  const pastDate = new Date(today.getFullYear(), today.getMonth() - monthsAgo, 1);
  const startMonthStr = `${pastDate.getFullYear()}-${String(pastDate.getMonth() + 1).padStart(2, '0')}-01`;

  const { data, error } = await supabase.rpc('create_customer_with_scheme', {
    p_full_name: testName,
    p_phone_number: testMobile,
    p_city: 'Coimbatore',
    p_enroll_scheme: true,
    p_start_month: startMonthStr,
  });

  if (error || !data) {
    throw new Error(`Failed to create test customer with past scheme: ${error?.message || 'Unknown error'}`);
  }

  return data as {
    customer_id: string;
    customer_code: string;
    scheme_id: string;
    scheme_code: string;
    phone_number: string;
    full_name: string;
  };
}

/**
 * Retrieves a service-role Supabase client strictly for isolated E2E test-fixture setup/teardown.
 * Protected by fatal safety guard to prevent execution against production.
 * NEVER expose this or the service-role key to browser/client code.
 */
export function getTestServiceRoleClient() {
  const targetUrl = SUPABASE_URL;
  assertNotProductionSupabase(targetUrl);

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceKey) {
    throw new Error(
      '[E2E Test Fixture Error] SUPABASE_SERVICE_ROLE_KEY environment variable is missing. Set it explicitly for the isolated local/CI test environment.'
    );
  }

  return createClient(targetUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Test fixture helper to transition a scheme to CANCELLED in the isolated test environment.
 * Direct table updates on `public.schemes` are strictly forbidden for authenticated users
 * by database RLS/privilege grants (REVOKE UPDATE ON public.schemes FROM authenticated).
 * This helper uses the service-role client strictly within the Node test runner (with production
 * safety checks) to simulate historical scheme closure for slot-reclamation testing.
 *
 * NEVER expose the service-role key to client/browser code.
 */
export async function cancelTestSchemeForTesting(schemeId: string): Promise<void> {
  if (!schemeId || typeof schemeId !== 'string') {
    throw new Error(`[E2E Test Fixture Error] Invalid schemeId provided: ${schemeId}`);
  }

  const adminServiceClient = getTestServiceRoleClient();

  const { error } = await adminServiceClient
    .from('schemes')
    .update({ status: 'CANCELLED' })
    .eq('id', schemeId);

  if (error) {
    throw new Error(`[E2E Test Fixture Error] Failed to cancel scheme ${schemeId}: ${error.message}`);
  }
}

/**
 * Creates an isolated authenticated non-admin client fixture for security tests.
 * Retains fatal production safety guard. Cleans up on teardown.
 */
export async function createAuthenticatedNonAdminFixture() {
  const adminServiceClient = getTestServiceRoleClient();
  const email = `test_non_admin_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TestPassword123!';
  const phone = generateTestMobile();

  const { data: authData, error: authErr } = await adminServiceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    throw new Error(`[E2E Security Fixture] Failed to create non-admin auth user: ${authErr?.message}`);
  }
  const userId = authData.user.id;

  const { error: profErr } = await adminServiceClient.from('profiles').insert({
    id: userId,
    role: 'CUSTOMER',
    phone_number: phone,
    full_name: 'Test Non Admin User',
    is_active: true,
  });
  if (profErr) {
    await adminServiceClient.auth.admin.deleteUser(userId);
    throw new Error(`[E2E Security Fixture] Failed to create customer profile: ${profErr.message}`);
  }

  const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) {
    await adminServiceClient.from('profiles').delete().eq('id', userId);
    await adminServiceClient.auth.admin.deleteUser(userId);
    throw new Error(`[E2E Security Fixture] Failed to sign in as non-admin: ${signInErr.message}`);
  }

  return {
    userId,
    client,
    cleanup: async () => {
      await adminServiceClient.from('profiles').delete().eq('id', userId);
      await adminServiceClient.auth.admin.deleteUser(userId);
    },
  };
}

/**
 * Creates an isolated authenticated administrator fixture with custom active/super_admin states.
 * Retains fatal production safety guard. Cleans up on teardown.
 */
export async function createAuthenticatedAdminFixture(options: {
  isSuperAdmin?: boolean;
  isActive?: boolean;
  roleTitle?: string;
} = {}) {
  const { isSuperAdmin = false, isActive = true, roleTitle = 'Test Admin' } = options;
  const adminServiceClient = getTestServiceRoleClient();
  const email = `test_admin_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
  const password = 'TestPassword123!';
  const phone = generateTestMobile();
  const empCode = `EMP-TEST-${Date.now().toString().slice(-6)}`;

  const { data: authData, error: authErr } = await adminServiceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authErr || !authData?.user) {
    throw new Error(`[E2E Security Fixture] Failed to create admin auth user: ${authErr?.message}`);
  }
  const userId = authData.user.id;

  const { error: profErr } = await adminServiceClient.from('profiles').insert({
    id: userId,
    role: 'ADMIN',
    phone_number: phone,
    full_name: `Test ${isActive ? 'Active' : 'Inactive'} Admin`,
    is_active: isActive,
  });
  if (profErr) {
    await adminServiceClient.auth.admin.deleteUser(userId);
    throw new Error(`[E2E Security Fixture] Failed to create admin profile: ${profErr.message}`);
  }

  const { error: adminErr } = await adminServiceClient.from('admin_users').insert({
    id: userId,
    employee_code: empCode,
    role_title: roleTitle,
    permissions: { all: true },
    is_super_admin: isSuperAdmin,
  });
  if (adminErr) {
    await adminServiceClient.from('profiles').delete().eq('id', userId);
    await adminServiceClient.auth.admin.deleteUser(userId);
    throw new Error(`[E2E Security Fixture] Failed to create admin_users record: ${adminErr.message}`);
  }

  const client = createClient(SUPABASE_URL!, SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInErr } = await client.auth.signInWithPassword({ email, password });
  if (signInErr) {
    await adminServiceClient.from('admin_users').delete().eq('id', userId);
    await adminServiceClient.from('profiles').delete().eq('id', userId);
    await adminServiceClient.auth.admin.deleteUser(userId);
    throw new Error(`[E2E Security Fixture] Failed to sign in as admin: ${signInErr.message}`);
  }

  return {
    userId,
    client,
    cleanup: async () => {
      await adminServiceClient.from('admin_users').delete().eq('id', userId);
      await adminServiceClient.from('profiles').delete().eq('id', userId);
      await adminServiceClient.auth.admin.deleteUser(userId);
    },
  };
}

/**
 * Creates an isolated authenticated client fixture whose profile has role = 'ADMIN'
 * but is_active = false and has a corresponding admin_users record.
 * Retains fatal production safety guard. Cleans up on teardown.
 */
export async function createAuthenticatedInactiveAdminFixture() {
  return createAuthenticatedAdminFixture({
    isSuperAdmin: false,
    isActive: false,
    roleTitle: 'Inactive Admin Test',
  });
}

/**
 * Safely deletes a test-created customer in the isolated test database.
 * First attempts atomic deletion via the security-definer `delete_customer_account` RPC.
 * Falls back to cascading child deletion if necessary.
 * Throws an error if cleanup fails.
 */
export async function deleteTestCustomer(customerId: string): Promise<boolean> {
  if (!customerId || typeof customerId !== 'string' || customerId.length < 32) {
    throw new Error(`[E2E Teardown Error] Invalid customerId provided for teardown: ${customerId}`);
  }

  try {
    const supabase = await getAuthenticatedAdminSupabaseClient();

    // 1. Prefer calling the official delete_customer_account SECURITY DEFINER RPC
    const { error: rpcErr } = await supabase.rpc('delete_customer_account', {
      p_customer_id: customerId,
    });

    if (!rpcErr) {
      console.log(`[E2E Teardown] Cleaned up temporary test customer ${customerId} via delete_customer_account`);
      return true;
    }

    // 2. Fallback: Clean up child financial/scheme records first to ensure clean deletion in isolated test DB
    await supabase.from('redemption_items').delete().eq('customer_id', customerId);
    await supabase.from('redemptions').delete().eq('customer_id', customerId);
    await supabase.from('payments').delete().eq('customer_id', customerId);
    await supabase.from('scheme_installments').delete().eq('customer_id', customerId);
    await supabase.from('bonuses').delete().eq('customer_id', customerId);
    await supabase.from('schemes').delete().eq('customer_id', customerId);
    await supabase.from('customer_auth').delete().eq('customer_id', customerId);
    await supabase.from('audit_logs').delete().eq('entity_id', customerId);

    const { error: custErr } = await supabase.from('customers').delete().eq('id', customerId);
    if (custErr) {
      throw new Error(`Failed to delete customer record ${customerId}: ${custErr.message}`);
    }

    const { error: profErr } = await supabase.from('profiles').delete().eq('id', customerId);
    if (profErr) {
      throw new Error(`Failed to delete profile record ${customerId}: ${profErr.message}`);
    }

    console.log(`[E2E Teardown] Cleaned up temporary test customer ${customerId}`);
    return true;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[E2E Teardown Error] Teardown failed for customer ${customerId}: ${msg}`);
    throw new Error(`[E2E Teardown Failure] ${msg}`);
  }
}

/**
 * Cleanup helper for an array of test-created customer UUIDs.
 */
export async function deleteTestCustomers(customerIds: string[]): Promise<void> {
  const errors: string[] = [];
  for (const id of customerIds) {
    if (id) {
      try {
        await deleteTestCustomer(id);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(msg);
      }
    }
  }
  if (errors.length > 0) {
    throw new Error(`[E2E Teardown Failure] Failed to clean up ${errors.length} test customer(s):\n${errors.join('\n')}`);
  }
}
