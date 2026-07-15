// tests/white-label-order-shipping.spec.ts
//
// Guards PR2 — the three bugs found in the order/shipping/upload path
// (WHITE_LABEL_IMPLEMENTATION_PLAN.md §2.2):
//
//   B3  Shipping was quoted for the wrong weight. Enter an address at qty=50,
//       rates load, change qty to 500 -> the dollar total updates but
//       calculateShipping() is bound only to address blur / state change, so
//       the stale rate (and its stale weight) stays selected and checkout
//       proceeds at the wrong price. Fix: qty change invalidates the current
//       selection and, if an address is already on file, re-quotes immediately.
//
//   B4  Gallery sort was a no-op. Upload signs via the legacy client.sign(),
//       which uses PayloadBuilder.build() (v1.0.x, no Timestamp field) --
//       dao.py:369 reads created_at from a "Timestamp" line in the signed
//       body, so it was always "". Fix: inject Timestamp into the attributes
//       passed to sign() (the backend's _extract_field() is a plain regex
//       scan for "- Timestamp: ..." anywhere in the header -- it does not
//       require dao-client's buildSubmitEvent() specifically).
//
//   B5  A network-level shipping failure failed silently: catch (e) {} left
//       the submit button disabled with zero explanation. Fix: render the
//       same visible error the "quote succeeded but empty" branch already had.
//
// Run: npx playwright test tests/white-label-order-shipping.spec.ts --reporter=list
// Start local server first: python3 -m http.server 8000

import { test, expect, type Page, type BrowserContext, type Route } from '@playwright/test';

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

/** Stub GitHub so the gallery renders exactly one design, then reach the order screen. */
async function openOrderScreen(page: Page, context: BrowserContext) {
  await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

  const DOWNLOAD_URL = 'https://raw.githubusercontent.com/TrueSightDAO/agroverse-designs/main/designs/deadbeef/design-0001.json';
  await context.route('**/api.github.com/repos/TrueSightDAO/agroverse-designs/contents/designs/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ name: 'design-0001.json', download_url: DOWNLOAD_URL }]),
    })
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

/** Stub the GAS shipping-rate endpoint and record the weightOz sent on each call. */
function stubShippingRates(context: BrowserContext, weights: number[], opts: { fail?: boolean } = {}) {
  return context.route('**/script.google.com/**action=calculateShippingRates**', (route: Route) => {
    const url = new URL(route.request().url());
    const weightOz = parseFloat(url.searchParams.get('weightOz') || '0');
    weights.push(weightOz);

    if (opts.fail) return route.abort('failed');

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'success',
        rates: [{ id: 'rate_' + weightOz, service: 'USPS Ground', rate: (5 + weightOz * 0.05).toFixed(2), delivery_days: '5' }],
      }),
    });
  });
}

async function fillAddress(page: Page) {
  await page.fill('#wl-ship-address', '1 Market St');
  await page.fill('#wl-ship-city', 'San Francisco');
  await page.selectOption('#wl-ship-state', 'CA');
  await page.fill('#wl-ship-zip', '94105');
  // blur triggers pollShippingRates(); its debounce is 300ms
  await page.locator('#wl-ship-zip').blur();
  await page.waitForTimeout(600);
}

test.describe('B3 — shipping rate re-quotes when quantity changes', () => {

  test('changing qty after rates are loaded disables checkout and re-fetches for the new weight', async ({ page, context }) => {
    const weights: number[] = [];
    await stubShippingRates(context, weights);
    await openOrderScreen(page, context);

    await page.selectOption('#wl-order-qty', '50');
    await fillAddress(page);
    await expect(page.locator('#wl-order-submit')).toBeEnabled();
    expect(weights.length, 'first quote fetched at qty=50').toBe(1);
    const firstWeight = weights[0];

    await page.selectOption('#wl-order-qty', '500');

    // The stale rate must not survive the qty change even for an instant --
    // this is the exact gap that let checkout proceed at the wrong price.
    await expect(page.locator('#wl-order-submit')).toBeDisabled();

    await page.waitForTimeout(600);
    expect(weights.length, 'qty change re-fetches rates automatically (address already on file)').toBe(2);
    expect(weights[1], 'the re-fetch uses the NEW quantity\'s weight, not the stale one').not.toBe(firstWeight);
    await expect(page.locator('#wl-order-submit')).toBeEnabled();
  });

  test('changing qty before any address is entered does not error and leaves checkout disabled', async ({ page, context }) => {
    const weights: number[] = [];
    await stubShippingRates(context, weights);
    await openOrderScreen(page, context);

    await page.selectOption('#wl-order-qty', '500');
    await page.waitForTimeout(400);

    expect(weights.length, 'no address on file yet -- must not call the rates API').toBe(0);
    await expect(page.locator('#wl-order-submit')).toBeDisabled();
  });
});

test.describe('B4 — design uploads carry a Timestamp Edgar can extract', () => {

  test('the signed upload payload includes a Timestamp field', async ({ page, context }) => {
    await page.addInitScript(() => localStorage.setItem('agroverse_wl_email', 'brand@acme.com'));
    await context.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));

    let capturedText = '';
    await context.route('**/edgar.truesight.me/dao/submit_contribution', (route) => {
      capturedText = route.request().postData() || '';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signature_verification: 'success' }) });
    });

    await page.goto(WL_URL);
    await page.waitForTimeout(1200);
    await page.click('#wl-upload-btn');

    // Drop a conforming 600x1200 portrait PNG (per D0).
    await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 1200;
      canvas.getContext('2d')!.fillRect(0, 0, 600, 1200);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const file = new File([blob], 'artwork.png', { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('wl-design-file') as HTMLInputElement;
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(600);
    await expect(page.locator('#wl-upload-submit')).toBeVisible();
    await page.click('#wl-upload-submit');
    await page.waitForTimeout(800);

    // dao.py:369 -- created_at = _extract_field(text, "Timestamp") or "".
    // Same header-line format the backend regex expects: ^-\s*Timestamp:\s*(.+)$
    expect(capturedText, 'submitted body must carry a Timestamp field for created_at').toMatch(/^-\s*Timestamp:\s*\S+/m);
    const m = capturedText.match(/^-\s*Timestamp:\s*(\S+)/m);
    expect(m, 'Timestamp value present').not.toBeNull();
    expect(new Date(m![1]).toString(), 'Timestamp is a valid, parseable date').not.toBe('Invalid Date');
  });
});

test.describe('B5 — a shipping-quote network failure is never silent', () => {

  test('an aborted shipping request shows a visible, actionable error', async ({ page, context }) => {
    await stubShippingRates(context, [], { fail: true });
    await openOrderScreen(page, context);

    await fillAddress(page);

    const rates = page.locator('#wl-ship-rates');
    await expect(rates).toBeVisible();
    await expect(rates).not.toBeEmpty();
    await expect(page.locator('#wl-order-submit')).toBeDisabled();
  });
});
