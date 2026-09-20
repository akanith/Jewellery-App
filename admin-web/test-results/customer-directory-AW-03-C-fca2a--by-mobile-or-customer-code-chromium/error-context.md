# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: customer-directory.spec.ts >> AW-03: Customer Directory Search & Filters >> admin can search customer directory by mobile or customer code
- Location: e2e\customer-directory.spec.ts:13:7

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
- text: Invalid login credentials Email Address
- textbox "Email Address":
  - /placeholder: name@aurelian.com
  - text: admin1@gmail.com
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
  3  | test.describe('AW-03: Customer Directory Search & Filters', () => {
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
  13 |   test('admin can search customer directory by mobile or customer code', async ({ page }) => {
  14 |     await page.goto('/customers');
  15 | 
  16 |     // Search input should be present
  17 |     const searchInput = page.getByPlaceholder(/search by customer name, mobile, or id/i);
  18 |     await expect(searchInput).toBeVisible();
  19 | 
  20 |     // Type test search query
  21 |     await searchInput.fill('8778173682');
  22 | 
  23 |     // Directory table should filter matching rows
  24 |     await expect(page.getByRole('table')).toBeVisible();
  25 |     await expect(page.getByText('8778173682')).toBeVisible();
  26 |   });
  27 | });
  28 | 
```