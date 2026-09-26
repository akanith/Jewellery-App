import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/test-utils';

const VIEWPORTS = [
  { name: 'Mobile 390x844', width: 390, height: 844 },
  { name: 'Small Mobile 375x812', width: 375, height: 812 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Desktop 1440x900', width: 1440, height: 900 },
];

const PAGES = ['/', '/customers', '/payments', '/redemption'];

test.describe('Admin Web Responsive Layout Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  for (const vp of VIEWPORTS) {
    for (const path of PAGES) {
      test(`${vp.name} - ${path} has no horizontal page overflow`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto(path);
        await page.waitForLoadState('networkidle');

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        expect(overflow).toBe(false);
      });
    }
  }
});
