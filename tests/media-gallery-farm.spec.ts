/**
 * Farm page media gallery (JSON-driven) — pilot: farms/oscar-bahia; PR2: santa-ana + paulo
 *
 * Verifies that media-gallery.js loads ./media.json and rebuilds the gallery:
 * - each farm's YouTube iframes render with the correct video IDs
 * - the JSON-driven titles are present
 * - zero console errors / page errors on load
 */
import { test, expect } from '@playwright/test';

const PAGES: { path: string; videoIds: string[]; titles: string[] }[] = [
  {
    path: '/farms/oscar-bahia/',
    videoIds: ['lh_dAXhE7xQ', 'BI55aQ6B73U'],
    titles: ['Hear from Oscar: The Family Story', 'Witness the Cacao Selection Process'],
  },
  {
    path: '/farms/fazenda-santa-ana-bahia/',
    videoIds: ['Kn13I7ijufs', 'J80B6TgWtFs', 'PwUu7ACzBdk'],
    titles: ['Farm Biodiversity', 'Harvesting & Fermentation', 'Organic Fertilizer Practices'],
  },
  {
    path: '/farms/paulo-la-do-sitio-para/',
    videoIds: ['8PIi57AOEE0'],
    titles: ["Experience Paulo's Farm"],
  },
];

for (const pageDef of PAGES) {
  const name = pageDef.path.split('/').filter(Boolean).join('-');
  test.describe(`Farm media gallery (JSON-driven): ${name}`, () => {
    test('renders all gallery videos from media.json with zero console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(pageDef.path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      const gallery = page.locator('#media-gallery');
      await expect(gallery).toBeVisible();

      const sections = gallery.locator('.farm-video-section');
      await expect(sections).toHaveCount(pageDef.videoIds.length);

      const iframes = gallery.locator('iframe.farm-video');
      await expect(iframes).toHaveCount(pageDef.videoIds.length);
      const srcs = await iframes.evaluateAll((els) => els.map((el) => (el as HTMLIFrameElement).src));
      for (let i = 0; i < pageDef.videoIds.length; i++) {
        expect(srcs[i]).toContain(pageDef.videoIds[i]);
      }

      for (let i = 0; i < pageDef.titles.length; i++) {
        await expect(gallery.locator('h3').nth(i)).toHaveText(pageDef.titles[i]);
      }

      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}
