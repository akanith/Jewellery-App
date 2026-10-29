import { test, expect } from '@playwright/test';
import {
  createTestCustomerWithPastScheme,
  seedHistoricalSchemePayments,
  generateTestMobile,
  generateTestName,
  loginAsAdmin,
  deleteTestCustomer,
} from './helpers/test-utils';

test.describe('AW-08: 12th Installment Bonus Crediting & Maturity Transition', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test('completing 12th installment automatically credits ₹1,000 bonus and transitions scheme to MATURED', async ({ page }) => {
    test.setTimeout(90000);
    const testName = generateTestName();
    const testMobile = generateTestMobile();
    let createdCustomerId: string | null = null;

    try {
      // Create test customer with scheme starting 11 months ago
      const customerData = await createTestCustomerWithPastScheme(testName, testMobile, 11);
      createdCustomerId = customerData.customer_id;

      // Pre-seed installments 1 through 11 in their respective past calendar months.
      // This respects the database business rule of at most one payment per calendar month.
      await seedHistoricalSchemePayments(customerData.scheme_id, 11);

      // Open Customer Passbook
      await page.goto(`/customers/${customerData.customer_id}`);

      // Verify passbook shows 11 installments completed before final payment
      await expect(page.getByText('11 of 12 Months Completed')).toBeVisible({ timeout: 15000 });

      // Record the 12th and final installment through the Admin Web slide-over drawer UI
      const recordBtn = page.getByRole('button', { name: /record installment #12/i });
      await expect(recordBtn).toBeVisible({ timeout: 10000 });
      await expect(recordBtn).toBeEnabled({ timeout: 10000 });
      await recordBtn.click();

      // Ensure slide-over drawer has opened
      const drawerHeading = page.getByRole('heading', { name: 'RECORD INSTALLMENT', exact: true });
      await expect(drawerHeading).toBeVisible({ timeout: 10000 });

      const confirmBtn = page.getByRole('button', { name: 'Record Installment', exact: true });
      await expect(confirmBtn).toBeVisible({ timeout: 10000 });
      await expect(confirmBtn).toBeEnabled({ timeout: 10000 });

      // Wait for slide-in drawer CSS animation (duration-300) to settle before pointer action
      await page.waitForTimeout(350);
      await confirmBtn.click();

      // Wait for drawer to close completely and passbook progress state to settle
      await expect(drawerHeading).toBeHidden({ timeout: 10000 });

      // Verify final MATURED state, 12 of 12 completed, ₹13,000 maturity value, and redemption CTA
      await expect(page.getByText('12 of 12 Months Completed')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('₹13,000')).toBeVisible({ timeout: 15000 });
      await expect(page.getByRole('link', { name: /proceed to scheme redemption/i })).toBeVisible({ timeout: 15000 });
    } finally {
      if (createdCustomerId) {
        // Safe RPC call - will preserve customer with financial history and clean up if unfulfilled
        await deleteTestCustomer(createdCustomerId);
      }
    }
  });
});
