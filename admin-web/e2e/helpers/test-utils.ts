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
 * Retrieves E2E Admin Credentials from environment variables.
 * Fails clearly if E2E_ADMIN_EMAIL or E2E_ADMIN_PASSWORD is missing.
 */
export function getE2EAdminCredentials() {
  const email = process.env.E2E_ADMIN_EMAIL;
  const password = process.env.E2E_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing required E2E credentials: E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD environment variables must be set.'
    );
  }

  return { email, password };
}

/**
 * Helper to log into the Admin Web portal using E2E Admin Credentials
 */
export async function loginAsAdmin(page: Page) {
  const { email, password } = getE2EAdminCredentials();
  await page.goto('/login');

  if (!page.url().includes('/login')) {
    await expect(
      page.getByRole('heading', { name: /good day|dashboard|customers directory|ramya/i })
    ).toBeVisible({ timeout: 20000 });
    return;
  }

  const emailInput = page.getByLabel(/email address/i);
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
  await expect(
    page.getByRole('heading', { name: /good day|dashboard|customers directory|ramya/i })
  ).toBeVisible({ timeout: 20000 });
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
  const { email, password } = getE2EAdminCredentials();
  const supabase = getTestSupabaseClient();

  const { error: authErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authErr) {
    throw new Error(`Failed to sign in admin for test setup: ${authErr.message}`);
  }

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
