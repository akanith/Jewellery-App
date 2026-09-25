import { test, expect } from '@playwright/test';
import {
  getTestSupabaseClient,
  getE2EAdminCredentials,
  loginAsAdmin,
  generateTestMobile,
  generateTestName,
  createTestCustomerWithPastScheme,
  deleteTestCustomer,
} from './helpers/test-utils';

test.describe('AW-09: Safe Delete Customer Account', () => {

  test('AW-09.1: Unauthorized/non-admin cannot execute deletion RPC', async () => {
    const supabase = getTestSupabaseClient();
    const fakeUuid = '00000000-0000-0000-0000-000000000000';

    const { data, error } = await supabase.rpc('delete_customer_account', {
      p_customer_id: fakeUuid,
    });

    expect(data).toBeNull();
    expect(error).not.toBeNull();
    expect(error?.message).toMatch(/unauthorized|permission denied/i);
  });

  test('AW-09.2: Customer with financial history cannot be deleted', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    let customerId: string | null = null;

    try {
      // Create a customer with a scheme and record 1 payment
      const result = await createTestCustomerWithPastScheme(testName, testMobile, 11);
      customerId = result.customer_id;

      // Record 1 installment payment so financial history exists
      await loginAsAdmin(page);
      await page.goto(`/customers/${customerId}`);

      // Click Record Installment for Month 1
      const recordBtn = page.getByRole('button', { name: /record installment|record payment/i }).first();
      await expect(recordBtn).toBeVisible();
      await recordBtn.click();

      const drawerConfirmBtn = page.getByRole('button', { name: 'Record Installment', exact: true });
      await expect(drawerConfirmBtn).toBeVisible();
      await drawerConfirmBtn.click();
      await expect(page.getByText(/installment payment recorded successfully|payment recorded successfully|installment recorded|1 of 12/i)).toBeVisible();

      // Now attempt to delete this customer with financial history
      const deleteBtn = page.getByRole('button', { name: /delete customer/i });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // Modal dialog should open
      await expect(page.getByRole('heading', { name: /delete customer/i })).toBeVisible();
      await expect(
        page.getByText(/this permanently removes the customer account and cannot be undone/i)
      ).toBeVisible();

      // Click Confirm Delete
      const confirmDeleteBtn = page.getByRole('button', { name: /confirm delete/i });
      await expect(confirmDeleteBtn).toBeVisible();
      await confirmDeleteBtn.click();

      // Expect safety block error message
      await expect(
        page.getByText(/customer cannot be deleted because financial records are associated with this account/i)
      ).toBeVisible();

      // Close modal
      await page.getByRole('button', { name: /cancel/i }).click();

      // Customer page remains open and accessible
      await expect(page).toHaveURL(new RegExp(`/customers/${customerId}`));
      await expect(page.getByRole('heading', { name: testName })).toBeVisible();
    } finally {
      if (customerId) {
        await deleteTestCustomer(customerId);
      }
    }
  });

  test('AW-09.3: Eligible test customer can be deleted and creates audit log', async ({ page }) => {
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    const { email, password } = getE2EAdminCredentials();
    let deletedCustomerId: string | null = null;

    try {
      // Log into admin web and register an eligible customer without payments
      await loginAsAdmin(page);
      await page.goto('/customers/new');
      await page.getByPlaceholder(/enter customer full name/i).fill(testName);
      await page.getByPlaceholder(/98765 43210/i).fill(testMobile);
      await page.getByRole('button', { name: /save customer profile/i }).click();
      await expect(page.getByText(/customer successfully enrolled!/i)).toBeVisible();

      // Navigate to new customer detail page
      const viewProfileBtn = page.getByRole('link', { name: /open customer passbook|view customer profile/i });
      await expect(viewProfileBtn).toBeVisible();
      await viewProfileBtn.click();

      // Extract customer ID from URL
      await page.waitForURL(/\/customers\/[a-f0-9-]+/i);
      const url = page.url();
      deletedCustomerId = url.split('/customers/')[1];

      // Click Delete Customer
      const deleteBtn = page.getByRole('button', { name: /delete customer/i });
      await expect(deleteBtn).toBeVisible();
      await deleteBtn.click();

      // Modal confirmation
      await expect(page.getByRole('heading', { name: /delete customer/i })).toBeVisible();
      const confirmDeleteBtn = page.getByRole('button', { name: /confirm delete/i });
      await expect(confirmDeleteBtn).toBeVisible();
      await confirmDeleteBtn.click();

      // Redirects to Customer Directory with success message
      await expect(page).toHaveURL(/http:\/\/localhost:3000\/customers\/?$/);
      await expect(page.getByText(/customer account successfully deleted/i)).toBeVisible();

      // Search for deleted customer code/mobile in directory
      const searchInput = page.getByPlaceholder(/search by customer name, mobile, or id/i);
      await searchInput.fill(testMobile);

      // Customer no longer appears in directory
      await expect(page.getByText(testName)).not.toBeVisible();

      // Verify audit log record exists in database using authenticated admin client
      const supabase = getTestSupabaseClient();
      const { data: authData } = await supabase.auth.signInWithPassword({ email, password });
      expect(authData.session).not.toBeNull();

      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('action', 'CUSTOMER_DELETED')
        .eq('entity_id', deletedCustomerId);

      expect(auditLogs).not.toBeNull();
      expect(auditLogs?.length).toBeGreaterThan(0);
      const log = auditLogs![0];
      expect(log.action).toBe('CUSTOMER_DELETED');
      expect(log.entity_table).toBe('customers');
      expect(log.entity_id).toBe(deletedCustomerId);
    } finally {
      if (deletedCustomerId) {
        await deleteTestCustomer(deletedCustomerId);
      }
    }
  });
});
