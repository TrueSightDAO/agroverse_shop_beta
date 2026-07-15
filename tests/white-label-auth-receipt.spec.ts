// tests/white-label-auth-receipt.spec.ts
//
// Guards PR1 — the two bugs that made the shipped funnel unusable end-to-end:
//
//   B1  Registration dead-ended into an empty card. handleAuth() wrote to
//       #wl-auth-loading, an element that never existed, throwing a TypeError
//       *between* hide('wl-auth-form') and show('wl-verify-state'). The catch
//       then wrote the error into #wl-auth-error — which was a child of the
//       form it had just hidden — so the error was invisible too. The user was
//       left with a heading and ~250px of void, forever.
//
//   B2  After paying, the customer saw "No designs yet. Upload your first one
//       above." Two separate IIFEs raced: one showed #wl-success, the other ran
//       initAuth(), which for any returning visitor reaches showGallery() ->
//       hide('wl-success'). The receipt was destroyed ~200ms after it rendered.
//
// Both only reproduce through interaction or a specific URL, which is why the
// original UAT spec (page-load assertions only) passed while the funnel was
// dead. See OPERATING_INSTRUCTIONS.md §10 — this is the base64ToArrayBuffer
// postmortem repeating itself.
//
// Run: npx playwright test tests/white-label-auth-receipt.spec.ts --reporter=list
// Start local server first: python3 -m http.server 8000

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;
const EMAIL = 'brand@acme.com';

type EdgarStub = { status?: number; body?: unknown };

/** Stub Edgar + GitHub so the flow is deterministic and offline. */
async function stub(ctx: BrowserContext, edgar: EdgarStub = {}) {
  await ctx.route('**/edgar.truesight.me/**', (route) =>
    route.fulfill({
      status: edgar.status ?? 200,
      contentType: 'application/json',
      body: JSON.stringify(
        edgar.body ?? { signature_verification: 'success', emailRegistration: { status: 'pending' } }
      ),
    })
  );
  // No designs — so if the gallery ever wins, the test sees "No designs yet",
  // which is exactly the string a paying customer was shown.
  await ctx.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));
}

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !m.text().includes('404')) errors.push(m.text());
  });
  return errors;
}

test.describe('B1 — registration reaches the "check your inbox" state', () => {

  test('submitting an email shows the verify state, not an empty card', async ({ page, context }) => {
    await stub(context);
    const errors = collectErrors(page);

    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');

    await expect(page.locator('#wl-verify-state')).toBeVisible();
    await expect(page.locator('#wl-auth-form')).toBeHidden();

    // The card must never be left with no readable content — that is the
    // failure B1 produced.
    await expect(page.locator('#wl-verify-msg')).toContainText('Check your inbox');

    expect(errors, 'no uncaught errors during registration').toEqual([]);
  });

  test('the verify message names the address we sent to', async ({ page, context }) => {
    await stub(context);
    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');

    // Echoing the address back is the only way a user catches their own typo,
    // the most common reason "it never arrived".
    await expect(page.locator('#wl-verify-msg')).toContainText(EMAIL);
  });

  test('#wl-auth-error is not trapped inside #wl-auth-form', async ({ page, context }) => {
    await stub(context);
    await page.goto(WL_URL);

    // Structural guard: an error nested inside the form is unreadable exactly
    // when the form is hidden — i.e. whenever we most need to explain ourselves.
    const trapped = await page.evaluate(() => {
      const form = document.getElementById('wl-auth-form');
      const err = document.getElementById('wl-auth-error');
      return !!(form && err && form.contains(err));
    });
    expect(trapped, '#wl-auth-error must live outside #wl-auth-form').toBe(false);
  });

  test('a failing Edgar leaves the form visible with a readable error', async ({ page, context }) => {
    await stub(context, { status: 500, body: { error: 'edgar exploded' } });
    await page.goto(WL_URL);
    await page.waitForTimeout(1000);
    await page.fill('#wl-email', EMAIL);
    await page.click('#wl-auth-btn');
    await page.waitForTimeout(800);

    const err = page.locator('#wl-auth-error');
    await expect(err).toBeVisible();
    await expect(page.locator('#wl-auth-form')).toBeVisible();   // a way back
    await expect(page.locator('#wl-auth-btn')).toBeEnabled();    // retryable
  });
});

test.describe('B2 — the post-payment receipt survives', () => {

  test('returning from Stripe shows the receipt, and it STAYS shown', async ({ page, context }) => {
    await stub(context);
    // A returning customer: keys + email present. This is the exact condition
    // that made initAuth() fall through to showGallery() and destroy the receipt.
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

    await page.goto(`${WL_URL}?session_id=cs_test_a1b2c3d4e5f6`);

    await expect(page.locator('#wl-success')).toBeVisible();

    // The original bug killed it ~200ms in. Outlast the gallery's async work.
    await page.waitForTimeout(3000);
    await expect(page.locator('#wl-success'), 'receipt must survive initAuth()').toBeVisible();
    await expect(page.locator('#wl-gallery')).toBeHidden();
  });

  test('a paying customer is never shown "No designs yet"', async ({ page, context }) => {
    await stub(context);
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

    await page.goto(`${WL_URL}?session_id=cs_test_a1b2c3d4e5f6`);
    await page.waitForTimeout(3000);

    const body = await page.locator('main').innerText();
    expect(body, 'the empty-gallery message must never greet a paying customer')
      .not.toContain('No designs yet');
    expect(body).toContain('Order Placed');
  });

  test('the receipt does not hijack an ordinary visit', async ({ page, context }) => {
    await stub(context);
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);

    await page.goto(WL_URL);          // no session_id
    await page.waitForTimeout(2000);

    await expect(page.locator('#wl-success')).toBeHidden();
    await expect(page.locator('#wl-gallery')).toBeVisible();
  });

  test('an email-verification link still routes to verification, not the receipt', async ({ page, context }) => {
    await stub(context);
    await page.goto(`${WL_URL}?em=${encodeURIComponent(EMAIL)}&vk=testkey123`);
    await page.waitForTimeout(800);

    // Branches must stay mutually exclusive.
    await expect(page.locator('#wl-verify-state')).toBeVisible();
    await expect(page.locator('#wl-success')).toBeHidden();
  });
});
