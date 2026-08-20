/**
 * Shipment page media gallery (JSON-driven) — pilot: shipments/agl4
 *
 * Verifies that media-gallery.js loads ./media.json and fills the hero slots:
 * - both hero slots (shipment-image + farmer-photo) get the correct agl4.avif src
 *   (fixes the live agl14.avif bug on the farmer-photo slot)
 * - the hero video iframe (BI55aQ6B73U) remains in place (hero-video stays inline per Option A)
 * - zero console errors / page errors on load
 */
import { test, expect } from '@playwright/test';

const SHIPMENT_PAGE = '/shipments/agl4/';

test.describe('Shipment media gallery (JSON-driven)', () => {
  test('agl4 fills both hero slots from media.json with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto(SHIPMENT_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Hero slots: both must resolve to the correct agl4.avif (farmer-photo previously agl14.avif)
    const heroSlots = page.locator('[data-media-slot="hero"]');
    await expect(heroSlots).toHaveCount(2);
    const srcs = await heroSlots.evaluateAll((els) => els.map((el) => (el as HTMLImageElement).src));
    for (const src of srcs) {
      expect(src).toContain('agl4.avif');
      expect(src).not.toContain('agl14.avif');
    }

    // Alt text comes from media.json hero.alt
    await expect(heroSlots.first()).toHaveAttribute('alt', "AGL4 - Oscar's Farm");

    // Hero video iframe remains in place (Option A: hero video stays inline, not moved to gallery)
    const heroVideo = page.locator('.shipment-hero-video');
    await expect(heroVideo).toBeVisible();
    const heroVideoSrc = await heroVideo.getAttribute('src');
    expect(heroVideoSrc).toContain('BI55aQ6B73U');

    // Zero console errors / page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
