// tests/white-label-state-e.spec.ts
//
// Guards PR5 — State E/F (WHITE_LABEL_IMPLEMENTATION_PLAN.md §2.3, State E/F):
//
//   B6  A greyed checkout button with no stated reason read as broken, not
//       as "one more step". Blocker text now names what's missing.
//   B8  Realizing the wrong design was selected only offered "Back to
//       Gallery" -- an extra click to find Upload again. Added a direct
//       "Use a different design" route.
//   B11 The state <select> truncated to "Stat" -- .wl-ship-row gave it 80px,
//       not enough for a 2-letter value + the select's own arrow.
//   E4  There was no order summary. "Total" was bars-only and excluded
//       shipping -- the number shown was not the number Stripe would charge.
//   F   The success state was unreachable in Phase 1 (B2, fixed in PR1) and
//       even when reached showed "Session ID: cs_test_..." -- developer
//       output, not a receipt. Now reads order details stashed client-side
//       right before the Stripe redirect.
//
// Run: npx playwright test tests/white-label-state-e.spec.ts --reporter=list

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
  await context.route('**/script.google.com/**action=calculateShippingRates**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'success', rates: [{ id: 'rate_1', service: 'USPS Ground', rate: '47.30', delivery_days: '5' }] }),
    })
  );

  await page.goto(WL_URL);
  await page.waitForTimeout(1200);
  await expect(page.locator('#wl-gallery')).toBeVisible();
  await page.click('.wl-design-card button');
  await expect(page.locator('#wl-order')).toBeVisible();
}

test.describe('B6 — checkout button names its blocker', () => {
  test('states the missing address before any rate exists', async ({ page, context }) => {
    await openOrderScreen(page, context);
    await expect(page.locator('#wl-order-submit')).toBeDisabled();
    await expect(page.locator('#wl-order-blocker')).toBeVisible();
    await expect(page.locator('#wl-order-blocker')).toContainText(/address/i);
  });

  test('the blocker disappears once a rate is selected', async ({ page, context }) => {
    await openOrderScreen(page, context);
    await page.fill('#wl-ship-address', '1 Market St');
    await page.fill('#wl-ship-city', 'San Francisco');
    await page.selectOption('#wl-ship-state', 'CA');
    await page.fill('#wl-ship-zip', '94105');
    await page.locator('#wl-ship-zip').blur();
    await page.waitForTimeout(600);

    await expect(page.locator('#wl-order-submit')).toBeEnabled();
    await expect(page.locator('#wl-order-blocker')).toBeHidden();
  });
});

test.describe('B8 — a direct route back to upload from the order screen', () => {
  test('"Use a different design" returns to an open gallery/upload state', async ({ page, context }) => {
    await openOrderScreen(page, context);
    await page.click('#wl-order-different-design');
    await page.waitForTimeout(600);

    await expect(page.locator('#wl-order')).toBeHidden();
    await expect(page.locator('#wl-gallery')).toBeVisible();
    await expect(page.locator('#wl-upload-panel')).toBeVisible();
  });
});

test.describe('B11 — the state select has room to show its value', () => {
  test('the state column is wide enough not to clip a 2-letter value', async ({ page, context }) => {
    await openOrderScreen(page, context);
    const width = await page.locator('#wl-ship-state').evaluate((el) => el.getBoundingClientRect().width);
    expect(width, 'state select must be wider than the old 80px column').toBeGreaterThan(90);
  });
});

test.describe('E4 — order summary includes shipping in the total', () => {
  test('total updates to bars + shipping once a rate is selected', async ({ page, context }) => {
    await openOrderScreen(page, context);
    await page.fill('#wl-ship-address', '1 Market St');
    await page.fill('#wl-ship-city', 'San Francisco');
    await page.selectOption('#wl-ship-state', 'CA');
    await page.fill('#wl-ship-zip', '94105');
    await page.locator('#wl-ship-zip').blur();
    await page.waitForTimeout(600);

    // 200 bars (default qty) * $10 + $47.30 shipping = $2,047.30
    await expect(page.locator('#wl-order-summary-total')).toContainText('2,047.30');
    await expect(page.locator('#wl-order-summary-shipping-row')).toBeVisible();
    await expect(page.locator('#wl-order-summary-trees')).toContainText('200');
  });
});

test.describe('F — the success receipt shows what was actually bought', () => {
  test('renders design, total, ETA, trees, and email from the stashed order', async ({ page }) => {
    const order = {
      designImageUrl: 'https://raw.githubusercontent.com/TrueSightDAO/agroverse-designs/main/designs/deadbeef/design-0001.png',
      designName: 'Acme-Holiday.png',
      qty: 200,
      barsTotal: 2000,
      shippingAmount: 47.30,
      total: 2047.30,
      eta: new Date('2026-08-04').toISOString(),
      email: EMAIL,
    };
    await page.addInitScript((o) => localStorage.setItem('agroverse_wl_last_order', JSON.stringify(o)), order);
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

    await page.goto(`${WL_URL}?session_id=cs_test_abc123`);
    await page.waitForTimeout(1000);

    await expect(page.locator('#wl-success')).toBeVisible();
    await expect(page.locator('#wl-success-design-img')).toBeVisible();
    await expect(page.locator('#wl-success-summary')).toContainText('200 bars');
    await expect(page.locator('#wl-success-summary')).toContainText('2,047.30');
    await expect(page.locator('#wl-success-trees')).toContainText('200 trees');
    await expect(page.locator('#wl-success-email')).toContainText(EMAIL);

    // The order ref is fine to show (labeled) -- what's not fine is the old
    // bare "Session ID: cs_test_..." developer-output framing.
    const body = await page.locator('#wl-success').innerText();
    expect(body).not.toMatch(/^Session ID:/m);
    expect(body).toContain('Order reference: cs_test_abc123');
  });

  test('degrades gracefully with no stashed order (e.g. a bookmarked/shared link)', async ({ page }) => {
    await page.goto(`${WL_URL}?session_id=cs_test_xyz789`);
    await page.waitForTimeout(1000);
    await expect(page.locator('#wl-success')).toBeVisible();
    await expect(page.locator('#wl-success-ref')).toContainText('cs_test_xyz789');
  });
});
