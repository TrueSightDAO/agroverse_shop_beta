/**
 * Shipment page media gallery (JSON-driven) — pilot: agl4 (PR1); PR4: agl0, agl1, agl2; PR5: agl5, agl7, agl8
 *
 * Verifies that media-gallery.js loads ./media.json and fills the hero/farmer slots:
 * - hero slots get the shipment's own image (aglX.avif, or agl7.gif) — no cross-shipment bleed
 * - agl8: farmer-photo is a genuinely different image (paulo_profile_photo.jpeg) → distinct farmer slot
 * - inline hero video iframes stay in place where present (Option A)
 * - zero console errors / page errors on each page
 */
import { test, expect } from '@playwright/test';

const PAGES = [
  { path: '/shipments/agl4/', slug: 'agl4', heroSrc: 'agl4.avif', videoIds: ['BI55aQ6B73U'], galleryIframes: 0, alt: "AGL4 - Oscar's Farm", farmerAlt: '' },
  { path: '/shipments/agl0/', slug: 'agl0', heroSrc: 'agl0.avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL0 - Foundational Shipment', farmerAlt: '' },
  { path: '/shipments/agl1/', slug: 'agl1', heroSrc: 'agl1.avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL1 - Coopercabruca', farmerAlt: '' },
  { path: '/shipments/agl2/', slug: 'agl2', heroSrc: 'agl2.avif', videoIds: ['Kn13I7ijufs'], galleryIframes: 0, alt: 'AGL2 - Coopercabruca', farmerAlt: '' },
  { path: '/shipments/agl5/', slug: 'agl5', heroSrc: 'agl5.avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL5 - Cacao Molasses', farmerAlt: '' },
  { path: '/shipments/agl7/', slug: 'agl7', heroSrc: 'agl7.gif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL7 - Cacao Molasses', farmerAlt: '' },
  { path: '/shipments/agl8/', slug: 'agl8', heroSrc: 'agl8.avif', farmerSrc: 'paulo_profile_photo.jpeg', videoIds: [] as string[], galleryIframes: 0, alt: "AGL8 Shipment - Cacao from Paulo's La do Sitio Farm", farmerAlt: 'Paulo' },
  { path: '/shipments/agl10/', slug: 'agl10', heroSrc: 'agl10.avif', videoIds: [] as string[], galleryIframes: 0, alt: 'AGL10 - Capela Velha Fazenda', farmerAlt: '' },
  { path: '/shipments/agl13/', slug: 'agl13', heroSrc: 'agl13.avif', videoIds: ['FthJ9mftGsY'], galleryIframes: 0, alt: "AGL13 - Vivi's Farm", farmerAlt: '' },
  { path: '/shipments/agl14/', slug: 'agl14', heroSrc: 'agl14.avif', videoIds: ['BI55aQ6B73U'], galleryIframes: 0, alt: "AGL14 - Oscar's Farm", farmerAlt: '' },
  { path: '/shipments/agl6/', slug: 'agl6', heroSrc: 'agl6.avif', videoIds: [] as string[], galleryIframes: 1, alt: 'AGL6 - São Jorge Farm', farmerAlt: '' },
];

test.describe('Shipment media gallery (JSON-driven)', () => {
  for (const { path, slug, heroSrc, farmerSrc, videoIds, nativeVideo, galleryIframes, alt, farmerAlt } of PAGES) {
    test(`${slug} fills media slots from media.json with zero console errors`, async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        // Ignore benign/flaky browser-network noise: Chromium permissions-policy
        // "compute-pressure" (version-specific) and GitHub raw 403 throttling
        // under parallel test load (assets verified to exist with HTTP 200).
        const t = msg.text();
        if (msg.type() === 'error' && !t.includes('compute-pressure') && !t.includes('Failed to load resource: the server responded with a status of 403')) consoleErrors.push(t);
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Hero slots: the shipment-image + (unless distinct farmer) farmer-photo resolve to the hero image
      const heroSlots = page.locator('[data-media-slot="hero"]');
      if (farmerSrc) {
        // agl8 pattern: hero slot is ONLY the shipment-image; farmer-photo is a distinct slot
        await expect(heroSlots).toHaveCount(1);
      } else {
        await expect(heroSlots).toHaveCount(2);
      }
      const srcs = await heroSlots.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
      for (const src of srcs) {
        expect(src).toContain(heroSrc);
      }

      // Alt text from media.json hero.alt
      await expect(heroSlots.first()).toHaveAttribute('alt', alt);

      // Distinct farmer photo (agl8 pattern): farmer slot keeps its own image, not the hero
      const farmerSlots = page.locator('[data-media-slot="farmer"]');
      if (farmerSrc) {
        await expect(farmerSlots).toHaveCount(1);
        const farmerUrl = await farmerSlots.getAttribute('src');
        expect(farmerUrl).toContain(farmerSrc);
        await expect(farmerSlots).toHaveAttribute('alt', farmerAlt as string);
      }

      // Inline hero video stays in place (Option A), when the page has one
      if (nativeVideo) {
        // agl10: native HTML5 <video> with <source> mp4 (no iframe src)
        const heroVideo = page.locator('.shipment-hero-video');
        await expect(heroVideo).toBeVisible();
        await expect(heroVideo.locator('source')).toHaveCount(1);
        const src = await heroVideo.locator('source').getAttribute('src');
        expect(src).toContain('.mp4');
      } else {
        for (const vid of videoIds) {
          const heroVideo = page.locator('.shipment-hero-video');
          await expect(heroVideo).toBeVisible();
          const heroVideoSrc = await heroVideo.getAttribute('src');
          expect(heroVideoSrc).toContain(vid);
        }
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
