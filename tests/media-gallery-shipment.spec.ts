/**
 * Shipment page media gallery (JSON-driven) — pilot: agl4 (PR1); PR4: agl0, agl1, agl2
 *
 * Verifies that media-gallery.js loads ./media.json and fills the hero slots:
 * - agl4: both hero slots get agl4.avif (fixes the live agl14.avif bug); hero video BI55aQ6B73U stays inline
 * - agl0/agl1: hero-only — both slots resolve to their own aglX.avif, no gallery iframes
 * - agl2: hero + 1 video — both slots agl2.avif, hero video Kn13I7ijufs stays inline (Option A)
 * - zero console errors / page errors on each page
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/shipments/agl4/', slug: 'agl4', videoIds: ['BI55aQ6B73U'], galleryIframes: 0, alt: "AGL4 - Oscar's Farm" },
  { path: '/shipments/agl0/', slug: 'agl0', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL0 - Foundational Shipment' },
  { path: '/shipments/agl1/', slug: 'agl1', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL1 - Coopercabruca' },
  { path: '/shipments/agl2/', slug: 'agl2', videoIds: ['Kn13I7ijufs'], galleryIframes: 0, alt: 'AGL2 - Coopercabruca' },
];

test.describe('Shipment media gallery (JSON-driven)', () => {
  for (const { path, slug, videoIds, galleryIframes, alt } of PAGES) {
    test(`${slug} fills both hero slots from media.json with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Hero slots: both resolve to this shipment's own avif (no cross-shipment bleed)
      const heroSlots = page.locator('[data-media-slot="hero"]');
      await expect(heroSlots).toHaveCount(2);
      const srcs = await heroSlots.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
      for (const src of srcs) {
        expect(src).toContain(`${slug}.avif`);
      }

      // Alt text from media.json hero.alt
      await expect(heroSlots.first()).toHaveAttribute('alt', alt);

      // Inline hero video iframes stay in place (Option A), when the page has one
      for (const vid of videoIds) {
        const heroVideo = page.locator('.shipment-hero-video');
        await expect(heroVideo).toBeVisible();
        const heroVideoSrc = await heroVideo.getAttribute('src');
        expect(heroVideoSrc).toContain(vid);
      }

      // No gallery iframes (all shipment pages keep hero media inline; gallery stays empty)
      const gallery = page.locator('#media-gallery');
      if (await gallery.count()) {
        await expect(gallery.locator('iframe')).toHaveCount(galleryIframes);
      }

      // Zero console errors / page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  }
});
