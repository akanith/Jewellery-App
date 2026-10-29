import { test, expect } from '@playwright/test';
import {
  createTestCustomerWithPastScheme,
  seedHistoricalSchemePayments,
  deleteTestCustomer,
  generateTestMobile,
  generateTestName,
  getAuthenticatedAdminSupabaseClient,
  loginAsAdmin,
} from './helpers/test-utils';

test.describe('AW-09: Scheme Maturity Redemption', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/$/);
  });

  test('admin can access redemption page and view eligible customer schemes', async ({ page }) => {
    await page.goto('/redemption');

    await expect(page.getByRole('heading', { name: /scheme redemption hub/i })).toBeVisible();
    await expect(page.getByPlaceholder(/search by customer name, mobile, code, or scheme/i)).toBeVisible();
  });

  test('a matured test scheme can be redeemed and the transaction is persisted', async ({ page }) => {
    test.setTimeout(120000);

    const customerName = generateTestName();
    const phoneNumber = generateTestMobile();
    let customerId: string | null = null;

    try {
      // All data created by this test stays inside Playwright's isolated local Supabase.
      const customer = await createTestCustomerWithPastScheme(customerName, phoneNumber, 11);
      customerId = customer.customer_id;

      const supabase = await getAuthenticatedAdminSupabaseClient();

      // Seed past installments 1 through 11 in their respective past calendar months.
      // This respects the database business rule of at most one payment per calendar month.
      await seedHistoricalSchemePayments(customer.scheme_id, 11);

      // Record the 12th installment for the current month through the guarded financial RPC.
      // This exercises the real RPC bonus crediting & maturity transition logic.
      const { data: p12Data, error: p12Error } = await supabase.rpc('record_installment_payment', {
        p_scheme_id: customer.scheme_id,
        p_installment_number: 12,
        p_payment_method: 'CASH',
        p_transaction_reference: `E2E-REDEMPTION-${Date.now()}-12`,
        p_notes: 'Isolated Playwright redemption lifecycle test - 12th installment',
      });
      expect(p12Error, '12th installment should be recorded via guarded RPC').toBeNull();
      expect(p12Data?.status).toBe('MATURED');
      expect(p12Data?.bonus_credited).toBe(true);

      const { data: maturedScheme, error: maturedSchemeError } = await supabase
        .from('schemes')
        .select('status, maturity_amount')
        .eq('id', customer.scheme_id)
        .single();

      expect(maturedSchemeError).toBeNull();
      expect(maturedScheme?.status).toBe('MATURED');
      expect(Number(maturedScheme?.maturity_amount)).toBe(13000);

      await page.goto('/redemption');
      await expect(page.getByRole('heading', { name: /scheme redemption hub/i })).toBeVisible();

      const search = page.getByPlaceholder(/search by customer name, mobile, code, or scheme/i);
      await search.fill(customerName);

      const customerRow = page.getByRole('row').filter({ hasText: customerName });
      await expect(customerRow).toBeVisible();
      await customerRow.getByRole('button', { name: /^redeem$/i }).click();

      await expect(page.getByRole('heading', { name: /complete scheme redemption/i })).toBeVisible();

      const invoiceNumber = `E2E-INV-${Date.now()}`;
      await page.getByPlaceholder('e.g. INV-8829').fill(invoiceNumber);
      await page.locator('input[type="number"]').fill('13000');
      await page.getByRole('button', { name: 'Complete Redemption', exact: true }).click();

      await expect(page.getByText(/redemption successfully recorded! voucher:/i)).toBeVisible({
        timeout: 15000,
      });

      const { data: redemptions, error: redemptionError } = await supabase
        .from('redemptions')
        .select('status, scheme_amount_used, purchase_total, invoice_number')
        .eq('scheme_id', customer.scheme_id);

      expect(redemptionError).toBeNull();
      expect(redemptions).toHaveLength(1);
      expect(redemptions?.[0].status).toBe('COMPLETED');
      expect(Number(redemptions?.[0].scheme_amount_used)).toBe(13000);
      expect(Number(redemptions?.[0].purchase_total)).toBe(13000);
      expect(redemptions?.[0].invoice_number).toBe(invoiceNumber);

      const { data: redeemedScheme, error: redeemedSchemeError } = await supabase
        .from('schemes')
        .select('status')
        .eq('id', customer.scheme_id)
        .single();

      expect(redeemedSchemeError).toBeNull();
      expect(redeemedScheme?.status).toBe('FULLY_REDEEMED');
    } finally {
      if (customerId) {
        // Uses the existing guarded cleanup helper in isolated CI only.
        await deleteTestCustomer(customerId);
      }
    }
  });
});
