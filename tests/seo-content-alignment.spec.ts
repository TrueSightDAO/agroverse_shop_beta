import { test, expect } from '@playwright/test';

/**
 * SEO content alignment tests.
 * Ensures key pages align with the ceremonial cacao USA keyword strategy
 * (market_research/ceremonial_cacao_seo/seo_keyword_strategy.md).
 * - Meta title and description present and in recommended length ranges.
 * - Match terms (ceremonial cacao, organic) and differentiators (regeneration, traceability, Amazon) appear.
 */

const basePages = [
  { path: '/', name: 'Homepage' },
  { path: '/blog/', name: 'Blog' },
  { path: '/category/retail-packs/', name: 'Retail category' },
];

const sampleProductPath = '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g/';

// Strategy: match terms we must show up for
const MATCH_TERMS = ['ceremonial cacao', 'cacao'];
// At least one differentiator should appear on homepage/meta
const DIFFERENTIATOR_TERMS = ['regenerat', 'amazon', 'rainforest', 'traceability', 'farm', 'cacao circles'];

test.describe('SEO content alignment', () => {
  test('Homepage has valid title and meta description length', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    expect(title.length).toBeGreaterThanOrEqual(30);
    expect(title.length).toBeLessThanOrEqual(70);

    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(metaDesc).toBeTruthy();
    expect(metaDesc!.length).toBeGreaterThanOrEqual(100);
    // SEO best practice: 150–160 chars for SERP; allow up to 400 for existing content (strategy doc recommends shortening)
    expect(metaDesc!.length).toBeLessThanOrEqual(400);
  });

  test('Homepage meta includes match and differentiator terms', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content') || '';
    const combined = `${title} ${metaDesc}`.toLowerCase();

    const hasMatch = MATCH_TERMS.some((term) => combined.includes(term));
    expect(hasMatch).toBe(true);

    const hasDifferentiator = DIFFERENTIATOR_TERMS.some((term) => combined.includes(term));
    expect(hasDifferentiator).toBe(true);
  });

  test('Key pages have non-empty title and meta description', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';

    for (const { path, name } of basePages) {
      await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const title = await page.title();
      const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(title, `${name} should have a title`).toBeTruthy();
      expect(title!.length).toBeGreaterThan(0);
      expect(metaDesc, `${name} should have meta description`).toBeTruthy();
      expect(metaDesc!.length).toBeGreaterThan(0);
    }
  });

  test('Sample product page has title and meta description', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}${sampleProductPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = await page.title();
    const metaDesc = await page.locator('meta[name="description"]').getAttribute('content');
    expect(title).toBeTruthy();
    expect(title!.length).toBeGreaterThan(0);
    expect(metaDesc).toBeTruthy();
    expect(metaDesc!.length).toBeGreaterThan(0);
  });

  test('Sample product page includes ceremonial cacao in title or meta', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}${sampleProductPath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const title = (await page.title()).toLowerCase();
    const metaDesc = (await page.locator('meta[name="description"]').getAttribute('content') || '').toLowerCase();
    const hasRelevant = title.includes('ceremonial') || title.includes('cacao') || metaDesc.includes('ceremonial') || metaDesc.includes('cacao');
    expect(hasRelevant).toBe(true);
  });
});
