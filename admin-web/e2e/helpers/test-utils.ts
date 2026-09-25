import { createClient } from '@supabase/supabase-js';
import { Page, expect } from '@playwright/test';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjpbswsgtbmgageburmy.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_bYOw6Eq1dE-7ARfmhCjc5A_YGLFalvD';

export function getTestSupabaseClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  let lastError: any = null;
  let lastData: any = null;

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
 * Safely deletes a test-created customer using public.delete_customer_account RPC.
 * Verifies that the customer ID belongs to a valid test-tracked UUID and has no financial records.
 * Fails gracefully without throwing if deletion is rejected due to financial history safety rules.
 */
export async function deleteTestCustomer(customerId: string): Promise<boolean> {
  if (!customerId || typeof customerId !== 'string' || customerId.length < 32) {
    console.warn(`[E2E Teardown] Invalid customerId provided: ${customerId}`);
    return false;
  }

  try {
    const supabase = await getAuthenticatedAdminSupabaseClient();

    const { data, error } = await supabase.rpc('delete_customer_account', {
      p_customer_id: customerId,
    });

    if (error) {
      console.warn(`[E2E Teardown] delete_customer_account RPC rejected for ${customerId}: ${error.message}`);
      return false;
    }

    if (data?.success) {
      console.log(`[E2E Teardown] Cleaned up temporary test customer ${customerId} (${data.customer_code})`);
      return true;
    }

    return false;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[E2E Teardown] Exception during cleanup for ${customerId}: ${msg}`);
    return false;
  }
}

/**
 * Cleanup helper for an array of test-created customer UUIDs.
 */
export async function deleteTestCustomers(customerIds: string[]): Promise<void> {
  for (const id of customerIds) {
    if (id) {
      await deleteTestCustomer(id);
    }
  }
}
