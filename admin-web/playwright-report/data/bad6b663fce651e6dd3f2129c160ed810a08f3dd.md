# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-auth.spec.ts >> AW-01: Admin Authentication & Route Protection >> invalid login credentials display an error alert
- Location: e2e\admin-auth.spec.ts:29:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText(/invalid email or password|invalid login credentials/i)
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByText(/invalid email or password|invalid login credentials/i) with timeout 10000ms
  - waiting for getByText(/invalid email or password|invalid login credentials/i)

```

```yaml
- text: R RAMYAS JEWELLER
- heading "Jewellery Savings Scheme Management" [level=1]
- paragraph: Manage customer savings with absolute confidence and the precision of heritage craftsmanship.
- img "Ramyas Jeweller - Heritage Gold and Diamond Jewellery Showcase"
- text: RAMYAS
- heading "Welcome Back" [level=2]
- paragraph: Sign in to your dashboard
- text: Email Address
- textbox "Email Address":
  - /placeholder: name@aurelian.com
- text: Password
- button "Forgot Password?"
- textbox "Password":
  - /placeholder: ••••••••
  - text: WrongPassword123!
- button "Show secret"
- checkbox "Remember this device"
- text: Remember this device
- button "Sign In"
- paragraph:
  - text: Admin assistance?
  - button "Contact Support"
- text: Don't have an account?
- button "Request access"
- contentinfo: © 2024 Ramyas Jeweller Privacy Policy Terms of Service Security
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('AW-01: Admin Authentication & Route Protection', () => {
  4  | 
  5  |   test('unauthenticated users navigating to protected routes are redirected to login', async ({ page }) => {
  6  |     await page.goto('/customers');
  7  |     await expect(page).toHaveURL(/\/login/);
  8  | 
  9  |     await page.goto('/payments');
  10 |     await expect(page).toHaveURL(/\/login/);
  11 | 
  12 |     await page.goto('/password-reset-requests');
  13 |     await expect(page).toHaveURL(/\/login/);
  14 |   });
  15 | 
  16 |   test('admin can log in successfully with valid credentials', async ({ page }) => {
  17 |     await page.goto('/login');
  18 | 
  19 |     // Fill login form using resilient role/label selectors
  20 |     await page.getByLabel(/email address/i).fill('admin1@gmail.com');
  21 |     await page.getByLabel(/password/i).fill('AdminPassword123!');
  22 |     await page.getByRole('button', { name: /sign in|login/i }).click();
  23 | 
  24 |     // Verify successful authentication and redirection to dashboard/home
  25 |     await expect(page).toHaveURL('http://localhost:3000/');
  26 |     await expect(page.getByRole('heading', { name: /dashboard|customers directory|ramya/i })).toBeVisible();
  27 |   });
  28 | 
  29 |   test('invalid login credentials display an error alert', async ({ page }) => {
  30 |     await page.goto('/login');
  31 | 
  32 |     await page.getByLabel(/email address/i).fill('invalid_admin@gmail.com');
  33 |     await page.getByLabel(/password/i).fill('WrongPassword123!');
  34 |     await page.getByRole('button', { name: /sign in|login/i }).click();
  35 | 
  36 |     // Error alert banner should be displayed
> 37 |     await expect(page.getByText(/invalid email or password|invalid login credentials/i)).toBeVisible();
     |                                                                                          ^ Error: expect(locator).toBeVisible() failed
  38 |     await expect(page).toHaveURL(/\/login/);
  39 |   });
  40 | });
  41 | 
```