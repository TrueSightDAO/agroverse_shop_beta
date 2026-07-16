// tests/white-label-state-a.spec.ts
//
// Guards PR3 — State A re-composition (WHITE_LABEL_IMPLEMENTATION_PLAN.md §2.3, State A):
//
//   P1  The hero showed the stock 81% retail bar -- the one product this page
//       is NOT selling. The mockup (customer artwork on the bar) is what
//       carries the value proposition; it now IS the hero image.
//
//   P2  "Proof before ask": How It Works + Pricing previously rendered AFTER
//       the email-capture card in DOM order, so the ask landed before the
//       visitor had any reason to trust it. They now precede #wl-auth.
//
//   B10 The stock bar photo and the mockup previously both rendered on the
//       page (hero + auth card) -- deleted the stock photo entirely rather
//       than just de-duplicating it, since P1 says it shouldn't be the
//       dominant visual anywhere on this page.
//
//   B12 The steps grid (auto-fit, minmax(160px,1fr)) only fit 4 columns in
//       the card's ~856px content width, wrapping step 5 onto its own row.
//
// Run: npx playwright test tests/white-label-state-a.spec.ts --reporter=list

import { test, expect } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;

test.describe('State A re-composition', () => {

  test('P1 — the hero shows the customer mockup, not the stock retail bar', async ({ page }) => {
    await page.goto(WL_URL);
    const heroSrc = await page.locator('.wl-hero-img').getAttribute('src');
    expect(heroSrc, 'hero image must be the white-label mockup').toContain('white-label-mockup');

    const stockPhotoCount = await page.locator('img[src*="81-dark-chocolate-bar-50g-packaging"]').count();
    expect(stockPhotoCount, 'the stock retail-bar photo should not appear anywhere on this page').toBe(0);
  });

  test('P2 — How It Works and Pricing precede the email-capture card in DOM order', async ({ page }) => {
    await page.goto(WL_URL);
    // PR4 wraps hero/how/pricing in #wl-marketing-frame (hidden as a group
    // once authenticated), so a direct-children scan of <main> no longer
    // reflects nesting -- compareDocumentPosition is robust to that.
    const result = await page.evaluate(() => {
      const how = document.querySelector('.wl-how');
      const pricing = document.querySelector('.wl-pricing');
      const auth = document.getElementById('wl-auth');
      if (!how || !pricing || !auth) return { how: false, pricing: false, missing: true };
      const FOLLOWING = Node.DOCUMENT_POSITION_FOLLOWING;
      return {
        missing: false,
        how: !!(how.compareDocumentPosition(auth) & FOLLOWING),
        pricing: !!(pricing.compareDocumentPosition(auth) & FOLLOWING),
      };
    });

    expect(result.missing, 'How It Works, Pricing, and the auth card must all exist').toBe(false);
    expect(result.how, 'proof (How It Works) must precede the ask').toBe(true);
    expect(result.pricing, 'proof (Pricing) must precede the ask').toBe(true);
  });

  test('B12 — all 5 how-it-works steps render on a single row at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(WL_URL);

    const tops = await page.locator('.wl-step').evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().top)
    );
    expect(tops.length).toBe(5);
    const uniqueTops = new Set(tops.map((t) => Math.round(t)));
    expect(uniqueTops.size, 'all 5 steps must share the same row (no orphaned 5th step)').toBe(1);
  });

  test('the CTA leads with the outcome, not an instruction to sign in', async ({ page }) => {
    await page.goto(WL_URL);
    const heading = await page.locator('#wl-auth h2').textContent();
    expect(heading).not.toMatch(/sign in/i);
    await expect(page.locator('#wl-auth')).toContainText(/link to your design workspace/i);
  });
});
