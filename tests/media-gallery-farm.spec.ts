/**
 * Farm page media gallery (JSON-driven) — pilot: farms/oscar-bahia; PR2: santa-ana + paulo; PR3: sao-jorge + vivi
 *
 * Verifies that media-gallery.js loads ./media.json and rebuilds the gallery:
 * - oscar-bahia: both YouTube iframes with correct IDs + JSON titles
 * - santa-ana: hero slot filled from media.json + three YouTube iframes
 * - paulo: single YouTube iframe
 * - sao-jorge: TWO sectioned containers (story-videos: 2 portrait iframes; photos: 2 images)
 * - vivi: two YouTube iframes
 * - zero console errors / page errors on each page
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/farms/oscar-bahia/', videoIds: ['lh_dAXhE7xQ', 'BI55aQ6B73U'], hero: false, containers: 1, sections: [] as string[] },
  { path: '/farms/fazenda-santa-ana-bahia/', videoIds: ['Kn13I7ijufs', 'J80B6TgWtFs', 'PwUu7ACzBdk'], hero: true, containers: 1, sections: [] },
  { path: '/farms/paulo-la-do-sitio-para/', videoIds: ['8PIi57AOEE0'], hero: false, containers: 1, sections: [] },
  { path: '/farms/fazenda-sao-jorge-bahia/', videoIds: ['sLNS9pZUBVw', '33nwH67UIag'], hero: false, containers: 2, sections: ['story-videos', 'photos'] },
  { path: '/farms/vivi-jesus-do-deus-itacare/', videoIds: ['FthJ9mftGsY', 'Z2RPqJzqS2k'], hero: false, containers: 1, sections: [] },
];

test.describe('Farm media gallery (JSON-driven)', () => {
  for (const { path, videoIds, hero, containers, sections } of PAGES) {
    test(`${path} renders gallery from media.json with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Container(s) present and visible
      const all = page.locator('[data-media-gallery], #media-gallery');
      await expect(all).toHaveCount(containers);

      // All video iframes present with the correct IDs (in order, across all containers)
      const iframes = page.locator('iframe.farm-video');
      await expect(iframes).toHaveCount(videoIds.length);
      const srcs = await iframes.evaluateAll((els) => els.map((el) => (el as HTMLIFrameElement).src));
      for (let i = 0; i < videoIds.length; i++) {
        expect(srcs[i]).toContain(videoIds[i]);
      }

      // Sectioned containers each got the right items
      for (const section of sections) {
        const box = page.locator(`[data-media-gallery="${section}"]`);
        await expect(box).toHaveCount(1);
        await expect(box.locator('.farm-video-section')).not.toHaveCount(0);
      }

      // sao-jorge "photos" container renders IMAGES (not iframes)
      if (sections.includes('photos')) {
        const photosBox = page.locator('[data-media-gallery="photos"]');
        await expect(photosBox.locator('img.farm-video')).toHaveCount(2);
        await expect(photosBox.locator('iframe')).toHaveCount(0);
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
