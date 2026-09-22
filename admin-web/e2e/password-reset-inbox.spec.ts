import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-utils';

test.describe('AW-10 & AW-11: Admin Password Reset Request Inbox', () => {

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL('http://localhost:3000/');
  });

  test('admin can navigate to password reset requests inbox and view request list / empty state', async ({ page }) => {
    await page.goto('/password-reset-requests');

    // Page title should be visible
    await expect(page.getByRole('heading', { name: /customer password reset inbox/i })).toBeVisible();

    // Refresh inbox button
    await expect(page.getByRole('button', { name: /refresh inbox/i })).toBeVisible();

    // Either pending requests table or clean empty state is displayed
    const hasEmptyState = await page.getByText(/no password reset requests/i).isVisible();
    const hasTable = await page.getByRole('table').isVisible();

    expect(hasEmptyState || hasTable).toBe(true);
  });
});
