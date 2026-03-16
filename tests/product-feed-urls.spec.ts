import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Product Feed URL Tests
 *
 * Ensures every product URL in the feed (facebook_product_feed.xml) resolves to a
 * valid product page (200). Prevents Google Merchant / Facebook Commerce errors
 * when feed URLs don't match actual product-page paths.
 *
 * Run: npm test -- product-feed-urls
 */

const FEED_PATH = path.join(__dirname, '..', 'facebook_product_feed.xml');

function extractProductUrlsFromFeed(): string[] {
  const content = fs.readFileSync(FEED_PATH, 'utf-8');
  const linkRegex = /<g:link>([^<]+)<\/g:link>/g;
  const urls: string[] = [];
  let match;
  while ((match = linkRegex.exec(content)) !== null) {
    urls.push(match[1].trim());
  }
  return urls;
}

function urlToPath(fullUrl: string): string {
  try {
    const url = new URL(fullUrl);
    return url.pathname.endsWith('/') ? url.pathname : url.pathname + '/';
  } catch {
    return fullUrl;
  }
}

test.describe('Product Feed URLs', () => {
  test('every product URL in feed resolves to a valid page (200)', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const productUrls = extractProductUrlsFromFeed();

    expect(productUrls.length).toBeGreaterThan(0);

    for (const fullUrl of productUrls) {
      const pathname = urlToPath(fullUrl);
      const targetUrl = `${baseUrl.replace(/\/$/, '')}${pathname}`;

      const response = await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      expect(
        response?.status(),
        `Feed URL ${fullUrl} should return 200 (got ${response?.status()}). ` +
          `Ensure product-page path matches feed. Actual path: ${pathname}`,
      ).toBe(200);
    }
  });

  test('feed product URLs match existing product-page directories', async () => {
    const productUrls = extractProductUrlsFromFeed();
    const productPageDir = path.join(__dirname, '..', 'product-page');

    for (const fullUrl of productUrls) {
      const pathname = urlToPath(fullUrl);
      // Extract slug: /product-page/SLUG/ -> SLUG
      const slugMatch = pathname.match(/\/product-page\/([^/]+)\/?/);
      const slug = slugMatch ? slugMatch[1] : null;

      expect(slug, `Could not parse slug from ${fullUrl}`).not.toBeNull();

      const productDir = path.join(productPageDir, slug!);
      const exists = fs.existsSync(productDir) && fs.statSync(productDir).isDirectory();

      expect(
        exists,
        `Feed URL ${fullUrl} points to product-page/${slug}/ but that directory does not exist. ` +
          `Add the directory or fix the feed URL to match an existing product.`,
      ).toBe(true);
    }
  });
});
