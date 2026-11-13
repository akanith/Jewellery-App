import { test, expect } from '@playwright/test';
import {
  getAuthenticatedAdminSupabaseClient,
  getTestServiceRoleClient,
  generateTestMobile,
  deleteTestCustomers,
  loginAsAdmin,
} from './helpers/test-utils';

test.describe('AW-ID-03: Post-Registration Existing Customer Family Linking & Unlinking UI', () => {
  const createdCustomerIds: string[] = [];

  test.afterEach(async () => {
    if (createdCustomerIds.length > 0) {
      await deleteTestCustomers(createdCustomerIds);
      createdCustomerIds.length = 0;
    }
  });

  test('Admin updates existing customer mobile to match partner, explicitly links via Family Access UI with consent, and unlinks cleanly', async ({ page }) => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const serviceClient = getTestServiceRoleClient();
    const sharedMobile = generateTestMobile();
    const initialSecondMobile = generateTestMobile();
    const ts = Date.now();

    // 1. Register two separate existing customers with DIFFERENT mobile numbers
    const { data: p1Data, error: p1Err } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: `Rukmani E2E ${ts}`,
      p_phone_number: sharedMobile,
      p_city: 'Dindigul',
      p_enroll_scheme: true,
    });
    expect(p1Err).toBeNull();
    createdCustomerIds.push(p1Data.customer_id);

    const { data: p2Data, error: p2Err } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: `Govindaraj E2E ${ts}`,
      p_phone_number: initialSecondMobile,
      p_city: 'Dindigul',
      p_enroll_scheme: true,
    });
    expect(p2Err).toBeNull();
    createdCustomerIds.push(p2Data.customer_id);

    // 2. Log into Admin Portal and open second customer details
    await loginAsAdmin(page);
    await page.goto(`/customers/${p2Data.customer_id}`);

    // Update second customer mobile number via Edit Profile modal to match Customer 1
    await page.getByRole('button', { name: /edit profile/i }).click();
    await expect(page.getByText(/preserves any existing family links and never automatically links/i)).toBeVisible();
    const phoneInput = page.getByLabel(/mobile number/i).first();
    await phoneInput.fill(sharedMobile);
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByRole('heading', { name: /family access & linked profiles/i })).toBeVisible();

    // 3. Family Access card must NOT auto-link; instead show shared-phone candidate with explicit Link action
    await expect(page.getByText(p1Data.customer_code)).toBeVisible({ timeout: 15000 });
    await page.getByRole('button', { name: /link family member/i }).first().click();

    // Verify modal guards: Confirm button disabled until consent is checked, relationship selectable
    const confirmLinkBtn = page.getByRole('button', { name: /confirm & link profiles/i });
    await expect(confirmLinkBtn).toBeDisabled();

    await page.getByLabel(/family relationship/i).selectOption('SPOUSE');
    await page.locator('input[type="checkbox"]').check();
    await expect(confirmLinkBtn).toBeEnabled();
    await confirmLinkBtn.click();

    // Wait for link modal to close and success feedback banner to appear
    await expect(page.getByText(/Linked .* as SPOUSE/i)).toBeVisible({ timeout: 15000 });
    await expect(confirmLinkBtn).not.toBeVisible();

    // Linked badge & partner details now appear without merging customer codes
    await expect(page.getByText(p1Data.customer_code).first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(p2Data.customer_code).first()).toBeVisible();

    // Verify backend authorization & separate records exist cleanly
    const { data: authCheck } = await serviceClient.rpc('is_customer_authorized_for_profile', {
      p_auth_customer_id: p1Data.customer_id,
      p_target_customer_id: p2Data.customer_id,
    });
    expect(authCheck).toBe(true);

    // 4. Unlink cleanly via inline confirmation on Family Access card
    await page.getByRole('button', { name: /^unlink$/i }).first().click();
    await page.getByRole('button', { name: /confirm unlink/i }).click();
    await expect(page.getByText(/Unlinked /i)).toBeVisible({ timeout: 15000 });

    await expect(page.getByRole('button', { name: /link family member/i }).first()).toBeVisible({ timeout: 15000 });
    const { data: postUnlinkAuth } = await serviceClient.rpc('is_customer_authorized_for_profile', {
      p_auth_customer_id: p1Data.customer_id,
      p_target_customer_id: p2Data.customer_id,
    });
    expect(postUnlinkAuth).toBe(false);
  });
});
