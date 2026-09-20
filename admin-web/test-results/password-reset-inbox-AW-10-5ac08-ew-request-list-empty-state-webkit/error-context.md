# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: password-reset-inbox.spec.ts >> AW-10 & AW-11: Admin Password Reset Request Inbox >> admin can navigate to password reset requests inbox and view request list / empty state
- Location: e2e\password-reset-inbox.spec.ts:13:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected: "http://localhost:3000/"
Received: "http://localhost:3000/login"
Timeout:  10000ms

Call log:
  - Expect "toHaveURL" with timeout 10000ms
    23 × locator resolved to <html lang="en" class="h-full bg-slate-50">…</html>
       - unexpected value "http://localhost:3000/login"

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
  - text: AdminPassword123!
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
  3  | test.describe('AW-10 & AW-11: Admin Password Reset Request Inbox', () => {
  4  | 
  5  |   test.beforeEach(async ({ page }) => {
  6  |     await page.goto('/login');
  7  |     await page.getByLabel(/email address/i).fill('admin1@gmail.com');
  8  |     await page.getByLabel(/password/i).fill('AdminPassword123!');
  9  |     await page.getByRole('button', { name: /sign in|login/i }).click();
> 10 |     await expect(page).toHaveURL('http://localhost:3000/');
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  11 |   });
  12 | 
  13 |   test('admin can navigate to password reset requests inbox and view request list / empty state', async ({ page }) => {
  14 |     await page.goto('/password-reset-requests');
  15 | 
  16 |     // Page title should be visible
  17 |     await expect(page.getByRole('heading', { name: /customer password reset inbox/i })).toBeVisible();
  18 | 
  19 |     // Refresh inbox button
  20 |     await expect(page.getByRole('button', { name: /refresh inbox/i })).toBeVisible();
  21 | 
  22 |     // Either pending requests table or clean empty state is displayed
  23 |     const hasEmptyState = await page.getByText(/no password reset requests/i).isVisible();
  24 |     const hasTable = await page.getByRole('table').isVisible();
  25 | 
  26 |     expect(hasEmptyState || hasTable).toBe(true);
  27 |   });
  28 | });
  29 | 
```