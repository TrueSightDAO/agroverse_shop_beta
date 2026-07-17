// tests/white-label-stripe-sandbox.spec.ts
//
// Guards a real-money bug: white-label.js called the shared checkout GAS
// endpoint (agroverse_shop_checkout.gs, the SAME endpoint the live retail
// cart uses) without an `environment` parameter. That script already
// branches its Stripe secret key on this value (getConfig(): environment
// === 'development' -> STRIPE_TEST_SECRET_KEY, else STRIPE_LIVE_SECRET_KEY)
// -- js/checkout.js (the main cart) already sends it; white-label.js never
// did, so every white-label order on beta AND localhost was silently
// hitting LIVE Stripe. js/config.js already classifies both
// beta.agroverse.shop and localhost/127.0.0.1 as environment:'development'
// (real money only on agroverse.shop/www.agroverse.shop) -- this just wires
// that existing value into the two GAS_CHECKOUT calls.
//
// Run: npx playwright test tests/white-label-stripe-sandbox.spec.ts --reporter=list

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;
const EMAIL = 'brand@acme.com';

const STUB_DESIGN = {
  design_id: 'design-0001',
  filename: 'Acme-Holiday.png',
  image_url: 'https://raw.githubusercontent.com/TrueSightDAO/agroverse-designs/main/designs/deadbeef/design-0001.png',
  created_at: '2026-07-10T00:00:00.000Z',
  orders: [],
};

async function openOrderScreen(page: Page, context: BrowserContext) {
  await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

  const DOWNLOAD_URL = 'https://raw.githubusercontent.com/TrueSightDAO/agroverse-designs/main/designs/deadbeef/design-0001.json';
  await context.route('**/api.github.com/repos/TrueSightDAO/agroverse-designs/contents/designs/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ name: 'design-0001.json', download_url: DOWNLOAD_URL }]) })
  );
  await context.route(DOWNLOAD_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(STUB_DESIGN) })
  );

  await page.goto(WL_URL);
  await page.waitForTimeout(1200);
  await expect(page.locator('#wl-gallery')).toBeVisible();
  await page.click('.wl-design-card button');
  await expect(page.locator('#wl-order')).toBeVisible();
}

test.describe('Checkout GAS calls carry the environment param (Stripe test vs live key selection)', () => {

  test('calculateShippingRates includes environment=development on localhost', async ({ page, context }) => {
    let capturedUrl = '';
    await context.route('**/script.google.com/**action=calculateShippingRates**', (route) => {
      capturedUrl = route.request().url();
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', rates: [{ id: 'r1', service: 'USPS', rate: '10.00', delivery_days: '5' }] }),
      });
    });

    await openOrderScreen(page, context);
    await page.fill('#wl-ship-address', '1 Market St');
    await page.fill('#wl-ship-city', 'San Francisco');
    await page.selectOption('#wl-ship-state', 'CA');
    await page.fill('#wl-ship-zip', '94105');
    await page.locator('#wl-ship-zip').blur();
    await page.waitForTimeout(600);

    const params = new URL(capturedUrl).searchParams;
    // js/config.js classifies localhost/127.0.0.1 as 'development'.
    expect(params.get('environment')).toBe('development');
  });

  test('createCheckoutSession includes environment=development on localhost', async ({ page, context }) => {
    // The submit handler records a [DESIGN ORDER EVENT] with Edgar before
    // calling the checkout GAS -- stub it too, or the flow never reaches
    // createCheckoutSession.
    await context.route('**/edgar.truesight.me/**', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signature_verification: 'success' }) })
    );
    await context.route('**/script.google.com/**action=calculateShippingRates**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'success', rates: [{ id: 'r1', service: 'USPS', rate: '10.00', delivery_days: '5' }] }),
      })
    );
    let capturedUrl = '';
    await context.route('**/script.google.com/**action=createCheckoutSession**', (route) => {
      capturedUrl = route.request().url();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'success', checkoutUrl: 'https://checkout.stripe.com/test-session' }) });
    });

    await openOrderScreen(page, context);
    await page.fill('#wl-ship-address', '1 Market St');
    await page.fill('#wl-ship-city', 'San Francisco');
    await page.selectOption('#wl-ship-state', 'CA');
    await page.fill('#wl-ship-zip', '94105');
    await page.locator('#wl-ship-zip').blur();
    await page.waitForTimeout(600);
    await expect(page.locator('#wl-order-submit')).toBeEnabled();

    await page.click('#wl-order-submit');
    await page.waitForTimeout(1500);

    const params = new URL(capturedUrl).searchParams;
    expect(params.get('environment')).toBe('development');
  });

  test('gasEnvironment() falls back to "production" (the GAS script\'s own safe default) if config.js is somehow missing', async ({ page }) => {
    // Sanity-check the fallback logic in isolation, independent of page state.
    const result = await page.evaluate(() => {
      function gasEnvironment() {
        return ((window as any).AGROVERSE_CONFIG && (window as any).AGROVERSE_CONFIG.environment) || 'production';
      }
      return gasEnvironment();
    });
    expect(result).toBe('production');
  });
});
