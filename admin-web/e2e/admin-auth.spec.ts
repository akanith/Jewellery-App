import { test, expect } from '@playwright/test';

test.describe('AW-01: Admin Authentication & Route Protection', () => {

  test('unauthenticated users navigating to protected routes are redirected to login', async ({ page }) => {
    await page.goto('/customers');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/payments');
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/password-reset-requests');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin can log in successfully with valid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill login form using resilient role/label selectors
    await page.getByLabel(/email address/i).fill('admin1@gmail.com');
    await page.getByLabel(/password/i).fill('AdminPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Verify successful authentication and redirection to dashboard/home
    await expect(page).toHaveURL('http://localhost:3000/');
    await expect(page.getByRole('heading', { name: /dashboard|customers directory|ramya/i })).toBeVisible();
  });

  test('invalid login credentials display an error alert', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/email address/i).fill('invalid_admin@gmail.com');
    await page.getByLabel(/password/i).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();

    // Error alert banner should be displayed
    await expect(page.getByText(/invalid email or password|invalid login credentials/i)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
