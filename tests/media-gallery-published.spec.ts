/**
 * media-gallery.js fetch-first published gallery (PR6).
 *
 * media-gallery.js now prefers galleries/<collection>.json published by the
 * farm-media-daemon publisher into the machine-owned farm_media_manifests repo
 * (raw host, CORS-open), falling back to the hand-authored ./media.json, and
 * enriching published entries with local curation (caption/section/alt).
 *
 * The published URL is intercepted so both paths are deterministic:
 *  - published 404 -> local ./media.json renders (no regression)
 *  - published 200 -> published membership renders, merged with local captions
 */
import { test, expect, Page } from '@playwright/test';

const PUBLISHED_GLOB = '**/farm_media_manifests/main/galleries/**'; // published gallery on the raw host
const PAGE = '/farms/cacau-na-veia-pacaje/';

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    const t = msg.text();
    if (msg.type() !== 'error') return;
    if (t.includes('compute-pressure')) return;
    if (t.includes('status of 403')) return; // raw-host throttling noise
    if (t.includes('status of 404')) return; // expected: no published gallery yet
    errors.push(t);
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  return errors;
}

test.describe('media-gallery.js fetch-first published gallery', () => {
  test('falls back to local ./media.json when no published gallery exists', async ({ page }) => {
    let probed = 0;
    await page.route(PUBLISHED_GLOB, (route) => {
      probed += 1;
      return route.fulfill({ status: 404, body: '' });
    });
    const errors = trackErrors(page);

    await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect.poll(() => probed, { timeout: 10000 }).toBeGreaterThan(0); // probed first
    await expect.poll(async () => page.locator('iframe.farm-video').count(), { timeout: 15000 }).toBeGreaterThan(0);
    await expect(page.locator('iframe.farm-video[src*="tBwb-lY0avY"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('prefers the published gallery and enriches it with local curation', async ({ page }) => {
    let probed = 0;
    const published = {
      schemaVersion: 1,
      hero: null,
      gallery: [
        { type: 'youtube', videoId: 'tBwb-lY0avY', title: 'IMG_9493 (97 s)' },
        { type: 'youtube', videoId: 'PUBLISHEDONLY1', title: 'From the publisher' },
      ],
    };
    await page.route(PUBLISHED_GLOB, (route) => {
      probed += 1;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(published) });
    });
    const errors = trackErrors(page);

    await page.goto(PAGE, { waitUntil: 'domcontentloaded', timeout: 30000 });

    await expect.poll(() => probed, { timeout: 10000 }).toBeGreaterThan(0);
    await expect(page.locator('iframe.farm-video[src*="tBwb-lY0avY"]')).toHaveCount(1);
    await expect(page.locator('iframe.farm-video[src*="PUBLISHEDONLY1"]')).toHaveCount(1);

    // shared entry keeps local curated caption (enrichment)
    const shared = page.locator('.farm-video-section', {
      has: page.locator('iframe.farm-video[src*="tBwb-lY0avY"]'),
    });
    await expect(shared.locator('p')).toContainText('Site walk 9 September 2026');

    // union semantics (PR #328): published membership AND local curated entries
    // both render; a shared item appears exactly once, local-only entries survive.
    await expect(page.locator('iframe.farm-video[src*="PUBLISHEDONLY1"]')).toHaveCount(1);
    await expect(page.locator('iframe.farm-video[src*="tBwb-lY0avY"]')).toHaveCount(1);
    await expect(page.locator('iframe.farm-video[src*="R-UAgsRw328"]')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('sectioned page renders published entries that carry no section (sao-jorge)', async ({ page }) => {
    // Regression: the publisher emits no `section` field, and sao-jorge is the only
    // farm page with two sectioned containers. Pre-fix these published entries were
    // dropped from every container, leaving the page blank.
    const published = {
      schemaVersion: 1,
      hero: null,
      gallery: [
        { type: 'youtube', videoId: 'PUBSAOJORGE1' },
        { type: 'youtube', videoId: 'PUBSAOJORGE2' },
      ],
    };
    await page.route(PUBLISHED_GLOB, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(published) })
    );
    const errors = trackErrors(page);

    await page.goto('/farms/fazenda-sao-jorge-bahia/', { waitUntil: 'domcontentloaded', timeout: 30000 });

    const storyBox = page.locator('[data-media-gallery="story-videos"]');
    await expect(storyBox.locator('iframe.farm-video[src*="PUBSAOJORGE1"]')).toHaveCount(1);
    await expect(storyBox.locator('iframe.farm-video[src*="PUBSAOJORGE2"]')).toHaveCount(1);

    // curated local photos still render (union, not replace)
    await expect(page.locator('[data-media-gallery="photos"] img.farm-video')).toHaveCount(5);
    expect(errors).toEqual([]);
  });
});
