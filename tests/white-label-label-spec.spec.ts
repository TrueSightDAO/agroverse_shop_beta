// tests/white-label-label-spec.spec.ts
//
// Guards D0: the physical label is 2" W x 4" H PORTRAIT (confirmed by Gary
// 2026-07-14; measured at 267x520px = 1:1.95 in the product photo). The page
// originally asserted 4"x2" landscape in SEVEN separate places, and every design
// collected under that spec would have been unusable.
//
// Two guards:
//  1. Spec drift — no surface may assert the landscape spec, and every surface
//     that states dimensions must agree. This is the bug class that caused D0:
//     the same fact hard-coded in 7 places, and nothing checking they matched.
//  2. The validator itself — exercised through a real file drop, because
//     validateImageDimensions() only runs on interaction. Per OPERATING_
//     INSTRUCTIONS §10, page-load-only tests cannot catch handler bugs.
//
// Run: npx playwright test tests/white-label-label-spec.spec.ts --reporter=list
// Start local server first: python3 -m http.server 8000

import { test, expect, type Page } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;

/** Build a PNG of exact pixel dimensions and hand it to the file input. */
async function uploadImage(page: Page, width: number, height: number) {
  await page.evaluate(
    async ({ w, h }) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, 0, w, h);
      const blob: Blob = await new Promise((res) => canvas.toBlob((b) => res(b!), 'image/png'));
      const file = new File([blob], `artwork-${w}x${h}.png`, { type: 'image/png' });
      const dt = new DataTransfer();
      dt.items.add(file);
      const input = document.getElementById('wl-design-file') as HTMLInputElement;
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    },
    { w: width, h: height }
  );
  // validateImageDimensions() decodes the image via FileReader -> Image.onload
  await page.waitForTimeout(600);
}

/** Reach the gallery (upload lives behind the auth gate). */
async function openUploadPanel(page: Page) {
  await page.addInitScript(() => localStorage.setItem('agroverse_wl_email', 'uat@agroverse.shop'));
  await page.route('**/api.github.com/**', (r) => r.fulfill({ status: 404, body: '{}' }));
  await page.goto(WL_URL);
  await page.waitForTimeout(1200);
  await page.click('#wl-upload-btn');
  await expect(page.locator('#wl-drop-zone')).toBeVisible();
}

test.describe('D0 — label is 2"x4" portrait, asserted consistently', () => {

  test('no surface asserts the old 4"x2" landscape spec', async ({ page }) => {
    await page.goto(WL_URL);
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    expect(body, 'page must not advertise a 4"x2" label').not.toMatch(/4\s*["″]?\s*[x×]\s*2\s*["″]/i);
    expect(body, 'page must not advertise 1200x600 artwork').not.toMatch(/1200\s*[x×]\s*600/i);
  });

  test('every stated dimension agrees: 2"x4" / 600x1200', async ({ page }) => {
    await page.goto(WL_URL);

    await expect(page.locator('.wl-subtitle')).toContainText('2"×4"');
    await expect(page.locator('.wl-badge')).toContainText('2"×4"');
    await expect(page.locator('.wl-drop-hint')).toContainText('600×1200px');
    await expect(page.locator('.wl-drop-hint')).toContainText('2"×4"');
    await expect(page.locator('.wl-steps')).toContainText('600×1200px');
  });

  test('gallery cards are portrait (aspect-ratio 1/2), matching the label', async ({ page }) => {
    await page.goto(WL_URL);
    const ratio = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'wl-design-card-img';
      document.body.appendChild(probe);
      return getComputedStyle(probe).aspectRatio;
    });
    expect(ratio.replace(/\s/g, '')).toBe('1/2');
  });

  test('the mockup is a portrait product shot, not a landscape diagram', async ({ page }) => {
    // PR3 moved the mockup from the auth card into the hero — it's the
    // product this page sells, so it belongs at the top, not the auth card (P1).
    await page.goto(WL_URL);
    const img = page.locator('.wl-hero-img');
    await expect(img).toBeVisible();
    const dims = await img.evaluate((el: HTMLImageElement) => ({
      w: el.naturalWidth,
      h: el.naturalHeight,
    }));
    expect(dims.h, 'mockup must be taller than it is wide').toBeGreaterThan(dims.w);
  });
});

test.describe('D0 — the upload validator enforces portrait', () => {

  test('accepts exactly 600x1200', async ({ page }) => {
    await openUploadPanel(page);
    await uploadImage(page, 600, 1200);

    await expect(page.locator('#wl-upload-preview')).toBeVisible();
    await expect(page.locator('#wl-upload-error')).toBeHidden();
  });

  test('rejects the old 1200x600 landscape artwork', async ({ page }) => {
    await openUploadPanel(page);
    await uploadImage(page, 1200, 600);

    const err = page.locator('#wl-upload-error');
    await expect(err).toBeVisible();
    await expect(err).toContainText('600x1200');
    await expect(err).toContainText('1200x600');   // echoes what the user actually gave us
    await expect(page.locator('#wl-upload-preview')).toBeHidden();
  });

  test('rejects a wrong-size portrait image', async ({ page }) => {
    await openUploadPanel(page);
    await uploadImage(page, 300, 600);

    await expect(page.locator('#wl-upload-error')).toBeVisible();
    await expect(page.locator('#wl-upload-preview')).toBeHidden();
  });
});
