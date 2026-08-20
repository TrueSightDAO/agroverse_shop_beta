/**
 * Shipment page media gallery (JSON-driven) — PR1: agl4 pilot; PR4: agl0, agl1, agl2
 *
 * Verifies that media-gallery.js loads ./media.json and fills the hero slots:
 * - both hero slots (shipment-image + farmer-photo) get the correct <shipment>.avif src
 *   from media.json (fixes the live agl14.avif bug by construction)
 * - the hero video iframe remains in place where present (hero-video stays inline per Option A)
 * - zero console errors / page errors on load
 */
import { test, expect } from '@playwright/test';

const SHIPMENTS: { path: string; avif: string; alt: string; videoId?: string }[] = [
  { path: '/shipments/agl4/', avif: 'agl4.avif', alt: "AGL4 - Oscar's Farm", videoId: 'BI55aQ6B73U' },
  { path: '/shipments/agl0/', avif: 'agl0.avif', alt: 'AGL0 - Foundational Shipment' },
  { path: '/shipments/agl1/', avif: 'agl1.avif', alt: 'AGL1 - Coopercabruca' },
  { path: '/shipments/agl2/', avif: 'agl2.avif', alt: 'AGL2 - Coopercabruca', videoId: 'Kn13I7ijufs' },
];

for (const ship of SHIPMENTS) {
  const name = ship.path.split('/').filter(Boolean).join('-');
  test.describe(`Shipment media gallery (JSON-driven): ${name}`, () => {
    test('fills both hero slots from media.json with zero console errors', async ({ page }) => {
      const consoleErrors: string[] = [];
      const pageErrors: Error[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', (err) => pageErrors.push(err));

      await page.goto(ship.path, { waitUntil: 'domcontentloaded', timeout: 30000 });

      // Hero slots: both must resolve to the correct avif
      const heroSlots = page.locator('[data-media-slot="hero"]');
      await expect(heroSlots).toHaveCount(2);
      const srcs = await heroSlots.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
      for (const src of srcs) {
        expect(src).toContain(ship.avif);
      }

      // Alt text comes from media.json hero.alt
      await expect(heroSlots.first()).toHaveAttribute('alt', ship.alt);

      // Hero video iframe remains in place where present (Option A)
      if (ship.videoId) {
        const heroVideo = page.locator('.shipment-hero-video');
        await expect(heroVideo).toBeVisible();
        const heroVideoSrc = await heroVideo.getAttribute('src');
        expect(heroVideoSrc).toContain(ship.videoId);
      }

      // Zero console errors / page errors
      expect(consoleErrors).toEqual([]);
      expect(pageErrors).toEqual([]);
    });
  });
}
