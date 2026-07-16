// tests/white-label-state-c.spec.ts
//
// Guards PR4 — State C/D (WHITE_LABEL_IMPLEMENTATION_PLAN.md §2.3, State C/D):
//
//   P4  Marketing chrome is state-scoped, not global. The 600px hero/how/
//       pricing frame previously rendered identically in every state,
//       including once authenticated -- a repeat customer reordering had to
//       scroll past a pitch they'd already accepted. Now hidden as a group
//       (#wl-marketing-frame) once showGallery() runs.
//
//   B9  Upload success used to just close the panel and reload -- silent,
//       indistinguishable from a failure. Now shows an explicit confirmation
//       and highlights the new card once the grid re-renders.
//
// Run: npx playwright test tests/white-label-state-c.spec.ts --reporter=list

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const WL_BASE = process.env.WL_BASE_URL || 'http://localhost:8000';
const WL_URL = `${WL_BASE}/white-label/index.html`;
const EMAIL = 'brand@acme.com';

test.describe('P4 — marketing frame is hidden once authenticated', () => {

  test('the hero/how/pricing frame disappears once the gallery shows', async ({ page, context }) => {
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);
    await context.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));

    await page.goto(WL_URL);
    await page.waitForTimeout(1200);

    await expect(page.locator('#wl-gallery')).toBeVisible();
    await expect(page.locator('#wl-marketing-frame')).toBeHidden();
  });

  test('the frame IS visible for an anonymous first-time visitor', async ({ page }) => {
    await page.goto(WL_URL);
    await expect(page.locator('#wl-marketing-frame')).toBeVisible();
    await expect(page.locator('.wl-how')).toBeVisible();
  });
});

test.describe('B9 — upload confirmation is explicit, not silent', () => {

  async function uploadConformingDesign(page: Page, context: BrowserContext) {
    await page.addInitScript((e) => localStorage.setItem('agroverse_wl_email', e), EMAIL);
    await context.route('**/api.github.com/**', (route) => route.fulfill({ status: 404, body: '{}' }));
    await context.route('**/edgar.truesight.me/dao/submit_contribution', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ signature_verification: 'success' }) })
    );

    await page.goto(WL_URL);
    await page.waitForTimeout(1200);
    await expect(page.locator('#wl-drop-zone')).toBeVisible();

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
    await page.click('#wl-upload-submit');
    await page.waitForTimeout(800);
  }

  test('shows an explicit success confirmation, not just a closed panel', async ({ page, context }) => {
    await uploadConformingDesign(page, context);
    await expect(page.locator('#wl-upload-success')).toBeVisible();
    await expect(page.locator('#wl-upload-success')).toContainText(/uploaded/i);
  });
});
