/**
 * Farm page media gallery (JSON-driven) — pilot: farms/oscar-bahia
 *
 * Verifies that media-gallery.js loads ./media.json and rebuilds the gallery:
 * - both YouTube iframes render with the correct video IDs
 * - the JSON-driven titles/captions are present
 * - zero console errors / page errors on load
 */
import { test, expect } from '@playwright/test';

const FARM_PAGE = '/farms/oscar-bahia/';

test.describe('Farm media gallery (JSON-driven)', () => {
  test('oscar-bahia renders both gallery videos from media.json with zero console errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: Error[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err));

    await page.goto(FARM_PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Wait for the gallery to be populated by the loader
    const gallery = page.locator('#media-gallery');
    await expect(gallery).toBeVisible();

    // Two gallery sections, each with a farm-video-container
    const sections = gallery.locator('.farm-video-section');
    await expect(sections).toHaveCount(2);

    // Both iframes must carry the correct YouTube IDs (built from media.json videoId)
    const iframes = gallery.locator('iframe.farm-video');
    await expect(iframes).toHaveCount(2);

    const srcs = await iframes.evaluateAll((els) => els.map((el) => (el as HTMLIFrameElement).src));
    expect(srcs[0]).toContain('lh_dAXhE7xQ');
    expect(srcs[1]).toContain('BI55aQ6B73U');

    // Titles and captions come from media.json
    await expect(gallery.locator('h3').first()).toHaveText('Hear from Oscar: The Family Story');
    await expect(gallery.locator('h3').nth(1)).toHaveText('Witness the Cacao Selection Process');

    // Zero console errors / page errors
    expect(consoleErrors).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
});
