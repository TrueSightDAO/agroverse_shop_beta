import { test, expect } from '@playwright/test';

/**
 * Ensures the cart control stays visible on mobile without opening the hamburger menu.
 * Pages must include cart-ui.js / #cart-icon (same set as cart-icon-consistency).
 */

const MOBILE_VIEWPORT = { width: 375, height: 667 };

const TEST_PAGES = [
  '/',
  '/category/retail-packs',
  '/category/wholesale-bulk',
  '/product-page/oscar-s-bahia-ceremonial-cacao',
  '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  '/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans',
  '/product-page/8-ounce-organic-cacao-nibs-from-brazil',
  '/farms/oscar-bahia',
  '/farms/paulo-la-do-sitio-para',
  '/shipments/agl4',
  '/shipments/agl8',
  '/partners',
  '/blog/',
  '/post/bean-to-bliss-episode-12/',
];

test.describe('Mobile header cart visibility', () => {
  test('Cart icon is visible without opening the hamburger menu', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    await page.setViewportSize(MOBILE_VIEWPORT);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1200);

        const toggle = page.locator('.mobile-menu-toggle').first();
        const hasHamburger = await toggle.isVisible().catch(() => false);

        if (hasHamburger) {
          const expanded = await toggle.getAttribute('aria-expanded');
          if (expanded === 'true') {
            await toggle.click();
            await page.waitForTimeout(300);
          }
        }

        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        const cartIcon = page.locator('#cart-icon').first();

        if (!(await cartIcon.isVisible())) {
          errors.push(`${url}: #cart-icon is not visible`);
          continue;
        }

        const detail = await cartIcon.evaluate((el) => {
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const inHeader = !!document.getElementById('mobile-header-cart')?.contains(el);
          return {
            display: style.display,
            visibility: style.visibility,
            width: rect.width,
            height: rect.height,
            inHeader,
          };
        });

        if (detail.display === 'none' || detail.visibility === 'hidden') {
          errors.push(`${url}: cart icon is hidden (${detail.display} / ${detail.visibility})`);
        }
        if (detail.width < 8 || detail.height < 8) {
          errors.push(`${url}: cart icon has no usable tap target (${detail.width}x${detail.height})`);
        }
        if (hasHamburger && !detail.inHeader) {
          errors.push(`${url}: cart should be inside #mobile-header-cart when the hamburger is present`);
        }

        await expect(cartIcon).toBeEnabled();
      } catch (e) {
        errors.push(`${url}: ${e}`);
      }
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
