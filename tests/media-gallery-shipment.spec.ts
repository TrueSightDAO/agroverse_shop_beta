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
  { path: '/shipments/agl4/', slug: 'agl4', ext: 'avif', videoIds: ['BI55aQ6B73U'], galleryIframes: 0, alt: "AGL4 - Oscar's Farm", farmer: null },
  { path: '/shipments/agl0/', slug: 'agl0', ext: 'avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL0 - Foundational Shipment', farmer: null },
  { path: '/shipments/agl1/', slug: 'agl1', ext: 'avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL1 - Coopercabruca', farmer: null },
  { path: '/shipments/agl2/', slug: 'agl2', ext: 'avif', videoIds: ['Kn13I7ijufs'], galleryIframes: 0, alt: 'AGL2 - Coopercabruca', farmer: null },
  { path: '/shipments/agl5/', slug: 'agl5', ext: 'avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL5 - Cacao Molasses', farmer: null },
  { path: '/shipments/agl7/', slug: 'agl7', ext: 'gif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL7 - Cacao Molasses', farmer: null },
  { path: '/shipments/agl8/', slug: 'agl8', ext: 'avif', videoIds: [] as string[], galleryIframes: 0, alt: "AGL8 Shipment - Cacao from Paulo's La do Sitio Farm", farmer: 'paulo_profile_photo.jpeg' },
];

test.describe('Shipment media gallery (JSON-driven)', () => {
  for (const { path, slug, ext, videoIds, galleryIframes, alt, farmer } of PAGES) {
    test(`${slug} fills both hero slots from media.json with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error' && !msg.text().includes('compute-pressure')) consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Hero slots: hero-count is 2 for pages without a distinct farmer slot, 1 for pages with one
      const heroSlots = page.locator('[data-media-slot="hero"]');
      const farmerSlot = page.locator('[data-media-slot="farmer"]');
      await expect(heroSlots).toHaveCount(farmer ? 1 : 2);
      if (farmer) await expect(farmerSlot).toHaveCount(1);
      const srcs = await heroSlots.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
      for (const src of srcs) {
        expect(src).toContain(`${slug}.${ext}`);
      }

      // Alt text from media.json hero.alt
      await expect(heroSlots.first()).toHaveAttribute('alt', alt);

      // Distinct farmer photo (when the page has one): the farmer slot resolves
      // to its own src, NOT the hero src (AGL8 trap — must stay distinct)
      if (farmer) {
        const farmerSrc = await farmerSlot.getAttribute('src');
        expect(farmerSrc).toContain(farmer);
        expect(farmerSrc).not.toContain(`${slug}.${ext}`);
      }

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
