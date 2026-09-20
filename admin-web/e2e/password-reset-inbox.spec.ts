import { test, expect } from '@playwright/test';

test.describe('AW-10 & AW-11: Admin Password Reset Request Inbox', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
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
