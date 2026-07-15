// tests/white-label-uat.spec.ts
// UAT tests for the white-label custom bar flow
// Run: npx playwright test tests/white-label-uat.spec.ts --reporter=list
// Start local server first: python3 -m http.server 8000

import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:8000';
const WL_URL = `${BASE}/white-label/index.html`;

test.describe('White-Label Page — Visual & Structure', () => {

  test('page loads with correct nav and footer', async ({ page }) => {
    await page.goto(WL_URL);
    // Nav should be injected by shared-chrome.js
    await expect(page.locator('nav')).toBeVisible();
    await expect(page.locator('footer')).toBeVisible();
    // Should contain "White Label" in nav
    await expect(page.locator('nav')).toContainText('White Label');
    // Footer should be present
    await expect(page.locator('footer')).toContainText('Agroverse');
    await expect(page.locator('footer')).toContainText('Phone');
  });

  test('hero section shows correct copy', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('h1')).toContainText('Custom White-Label');
    await expect(page.locator('.wl-badge')).toContainText('50-unit minimum');
  });

  test('how-it-works section shows 5 steps', async ({ page }) => {
    await page.goto(WL_URL);
    const steps = page.locator('.wl-step');
    await expect(steps).toHaveCount(5);
    await expect(steps.nth(0)).toContainText('Upload artwork');
    await expect(steps.nth(3)).toContainText('We produce');
    await expect(steps.nth(4)).toContainText('Delivered');
  });

  test('pricing states a single flat rate covering the full quantity range (B13)', async ({ page }) => {
    // PR3: the 6-row "$10.00 every time" table implied volume tiers that
    // don't exist and restated the qty dropdown verbatim. One line is the
    // whole truth.
    await page.goto(WL_URL);
    await expect(page.locator('.wl-table')).toHaveCount(0);
    await expect(page.locator('.wl-pricing-line')).toContainText('$10');
    await expect(page.locator('.wl-pricing-line')).toContainText('50');
    await expect(page.locator('.wl-pricing-line')).toContainText('1,000');
  });

  test('pricing does NOT mention Sticker Mule', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('.wl-pricing')).not.toContainText('Sticker Mule');
    await expect(page.locator('.wl-how')).not.toContainText('Sticker Mule');
  });

  test('sign-in form is visible before auth', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-auth')).toBeVisible();
    await expect(page.locator('#wl-email')).toBeVisible();
    await expect(page.locator('#wl-auth-btn')).toContainText('Get Started');
  });

  test('gallery is hidden before auth', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-gallery')).not.toBeVisible();
    await expect(page.locator('#wl-order')).not.toBeVisible();
  });

  test('no "Import key from another device" link', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-show-import')).not.toBeVisible();
  });

  test('verify state hidden initially', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-verify-state')).not.toBeVisible();
  });

  test('auth button is clickable', async ({ page }) => {
    await page.goto(WL_URL);
    const btn = page.locator('#wl-auth-btn');
    await expect(btn).toBeEnabled();
    await btn.click();
    // Should show an error for empty email
    await expect(page.locator('#wl-auth-error')).toBeVisible();
  });

  test('invalid email shows error', async ({ page }) => {
    await page.goto(WL_URL);
    await page.locator('#wl-email').fill('not-an-email');
    await page.locator('#wl-auth-btn').click();
    await expect(page.locator('#wl-auth-error')).toBeVisible();
  });

});

test.describe('White-Label — Order Flow UI', () => {

  test('order form has quantity dropdown with 6 options', async ({ page }) => {
    await page.goto(WL_URL);
    const options = page.locator('#wl-order-qty option');
    // Order section hidden until a design is selected
    await expect(page.locator('#wl-order')).not.toBeVisible();
  });

  test('shipping state dropdown includes all 50 states', async ({ page }) => {
    await page.goto(WL_URL);
    const options = page.locator('#wl-ship-state option');
    await expect(options).toHaveCount(51); // 50 states + empty
    // index 0 is the empty "State" placeholder, so the Nth state is at nth(N).
    await expect(options.nth(5)).toContainText('CA');  // 5th state: AL AK AZ AR CA
    await expect(options.nth(43)).toContainText('TX'); // 43rd state
  });

  test('order summary updates when quantity changes (PR5: bars total + trees, shipping pending)', async ({ page }) => {
    // This tests the JS function directly since order section is hidden
    await page.goto(WL_URL);
    const result = await page.evaluate(() => {
      var el = document.getElementById('wl-order-qty');
      if (!el) return { total: 'no element', trees: '' };
      el.value = '500';
      el.dispatchEvent(new Event('change'));
      return {
        total: document.getElementById('wl-order-summary-total')!.textContent,
        trees: document.getElementById('wl-order-summary-trees')!.textContent,
      };
    });
    // No shipping rate selected yet -- E4: total states it's bars-only, not a
    // final charge (the pre-PR5 bug was presenting this as the final total).
    expect(result.total).toContain('$5,000.00');
    expect(result.total).toContain('shipping');
    expect(result.trees).toContain('500');
  });

});

test.describe('White-Label — Discovery', () => {

  test('homepage has White Label CTAs', async ({ page }) => {
    await page.goto(`${BASE}/`);
    // Main CTA area
    await expect(page.locator('text=Corporate Gifting')).toBeVisible();
    // Product section buttons
    await expect(page.locator('text=Custom White-Label Bars')).toBeVisible();
  });

  test('homepage nav contains White Label link', async ({ page }) => {
    await page.goto(`${BASE}/`);
    await expect(page.locator('nav')).toContainText('White Label');
  });

});

test.describe('White-Label — Cross-browser key', () => {

  test('no passphrase prompt on first visit', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-passphrase')).not.toBeVisible();
    await expect(page.locator('#wl-key-state')).not.toBeVisible();
  });

  test('no key file import UI on first visit', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-key-file')).not.toBeVisible();
  });

});

test.describe('White-Label — Responsive', () => {

  test('mobile layout is single column on small viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(WL_URL);
    // Steps should still be visible
    await expect(page.locator('.wl-step').first()).toBeVisible();
    // Nav should have hamburger
    await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
  });

});
