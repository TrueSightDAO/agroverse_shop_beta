/**
 * Farm page media gallery (JSON-driven) — pilot: farms/oscar-bahia; PR2: santa-ana + paulo
 *
 * Verifies that media-gallery.js loads ./media.json and rebuilds the gallery:
 * - oscar-bahia: both YouTube iframes with correct IDs + JSON titles
 * - santa-ana: hero slot filled from media.json + three YouTube iframes with correct IDs
 * - paulo: single YouTube iframe with correct ID
 * - zero console errors / page errors on each page
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/farms/oscar-bahia/', videoIds: ['lh_dAXhE7xQ', 'BI55aQ6B73U'], hero: false },
  { path: '/farms/fazenda-santa-ana-bahia/', videoIds: ['Kn13I7ijufs', 'J80B6TgWtFs', 'PwUu7ACzBdk'], hero: true },
  { path: '/farms/paulo-la-do-sitio-para/', videoIds: ['8PIi57AOEE0'], hero: false },
];

test.describe('Farm media gallery (JSON-driven)', () => {
  for (const { path, videoIds, hero } of PAGES) {
    test(`${path} renders gallery from media.json with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const gallery = page.locator('#media-gallery');
      await expect(gallery).toBeVisible();

      // All video iframes present with the correct IDs (in order)
      const iframes = gallery.locator('iframe.farm-video');
      await expect(iframes).toHaveCount(videoIds.length);
      const srcs = await iframes.evaluateAll((els) => els.map((el) => (el as HTMLIFrameElement).src));
      for (let i = 0; i < videoIds.length; i++) {
        expect(srcs[i]).toContain(videoIds[i]);
      }

      // Hero slot filled from media.json when the page declares one
      if (hero) {
        const heroSlot = page.locator('[data-media-slot="hero"]');
        await expect(heroSlot).toHaveCount(1);
        await expect(heroSlot).not.toHaveAttribute('src', '');
        await expect(heroSlot).toHaveAttribute('alt', 'Fazenda Santa Ana ceremonial cacao and on-farm chocolate from the same estate');
      }

      // Zero console errors / page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
