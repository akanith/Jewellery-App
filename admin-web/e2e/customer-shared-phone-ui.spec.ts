import { test, expect } from '@playwright/test';
import {
  generateTestMobile,
  loginAsAdmin,
  deleteTestCustomer,
  getAuthenticatedAdminSupabaseClient,
} from './helpers/test-utils';

test.describe('AW-06: Shared Mobile Number Customer Creation & Verified Family Linking UI Flow', () => {
  const createdCustomerIds: string[] = [];

  test.afterEach(async () => {
    while (createdCustomerIds.length > 0) {
      const id = createdCustomerIds.pop();
      if (id) {
        await deleteTestCustomer(id);
      }
    }
  });

  test('admin can register a second customer with existing mobile and link as verified family member', async ({ page }) => {
    const supabase = await getAuthenticatedAdminSupabaseClient();
    const sharedMobile = generateTestMobile();
    const parentName = `Parent User ${Date.now().toString().slice(-4)}`;
    const childName = `Child User ${Date.now().toString().slice(-4)}`;

    // 1. Create initial customer (Customer A) with sharedMobile
    const { data: custA, error: errA } = await supabase.rpc('create_customer_with_scheme', {
      p_full_name: parentName,
      p_phone_number: sharedMobile,
      p_address: '10 Bazaar Street',
      p_city: 'Dindigul',
      p_pincode: '624001',
      p_enroll_scheme: true,
    });
    expect(errA).toBeNull();
    expect(custA?.customer_id).toBeDefined();
    createdCustomerIds.push(custA.customer_id);

    // 2. Log in as showroom admin and visit customer creation form
    await loginAsAdmin(page);
    await page.goto('/customers/new');

    // 3. Fill customer name
    await page.getByPlaceholder(/enter customer full name/i).fill(childName);

    // 4. Enter the SAME mobile number
    await page.getByPlaceholder(/98765 43210/i).fill(sharedMobile);

    // 5. Verify the existing customer warning appears
    await expect(page.getByText(/shared number warning/i)).toBeVisible();
    await expect(page.getByText(parentName)).toBeVisible();

    // 6. Select "Link as verified family member"
    const familyCheckbox = page.getByRole('checkbox');
    await familyCheckbox.check();
    await expect(familyCheckbox).toBeChecked();

    // 7. Complete required form fields
    await page.getByPlaceholder(/street name, house number/i).fill('10 Bazaar Street');
    await page.getByPlaceholder(/coimbatore/i).fill('Dindigul');

    // 8. Submit form
    await page.getByRole('button', { name: /save customer profile/i }).click();

    // 9. Verify success enrollment view without P0001 error
    await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();
    await expect(page.getByText(childName)).toBeVisible();
    await expect(page.getByText(/family member profiles successfully linked/i)).toBeVisible();

    // 10. Open Passbook and capture Customer B ID
    await page.getByRole('link', { name: /open customer passbook/i }).click();
    await page.waitForURL(/\/customers\/[a-f0-9-]+/i);
    const childCustomerId = page.url().split('/customers/')[1];
    expect(childCustomerId).not.toBe(custA.customer_id);
    createdCustomerIds.push(childCustomerId);

    // 11. Verify passbook loads cleanly
    await expect(page.getByRole('heading', { name: childName })).toBeVisible();

    // 12. Verify in database: Both exist, have distinct UUIDs & codes, and have bidirectional authorization
    const { data: dbCustomers } = await supabase
      .from('customers')
      .select('id, customer_code, full_name, phone_number')
      .eq('phone_number', sharedMobile);

    expect(dbCustomers?.length).toBe(2);
    expect(dbCustomers?.map((c) => c.id).sort()).toEqual([custA.customer_id, childCustomerId].sort());

    // Verify bidirectional authorization via the approved security-definer RPC
    const { data: isAuth1 } = await supabase.rpc('is_customer_authorized_for_profile', {
      p_auth_customer_id: custA.customer_id,
      p_target_customer_id: childCustomerId,
    });
    expect(isAuth1).toBe(true);

    const { data: isAuth2 } = await supabase.rpc('is_customer_authorized_for_profile', {
      p_auth_customer_id: childCustomerId,
      p_target_customer_id: custA.customer_id,
    });
    expect(isAuth2).toBe(true);
  });
});
