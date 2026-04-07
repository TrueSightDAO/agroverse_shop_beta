import { test, expect } from '@playwright/test';

/**
 * Blog and article pages must use the same shell as the shop:
 * shared navigation.css layout, navigation.js (window.Navigation), hamburger + slide-out,
 * and cart-ui (mobile header cart via #mobile-header-cart).
 */

const MOBILE = { width: 375, height: 667 };

const BLOG_AND_POST_URLS = [
  '/blog/',
  '/post/bean-to-bliss-episode-12/',
  '/post/the-joy-of-cacao-circles-connections-and-community/',
];

test.describe('Blog & posts: shared header shell', () => {
  test('Mobile: hamburger, nav list, Navigation API, cart in header bar', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    await page.setViewportSize(MOBILE);

    for (const path of BLOG_AND_POST_URLS) {
      try {
        const fullUrl = `${baseUrl}${path}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(800);

        const hasHeaderNav = (await page.locator('header nav').count()) > 0;
        if (!hasHeaderNav) {
          errors.push(`${path}: missing header nav`);
          continue;
        }

        const toggle = page.locator('header nav .mobile-menu-toggle').first();
        if (!(await toggle.isVisible().catch(() => false))) {
          errors.push(`${path}: .mobile-menu-toggle not visible`);
        }

        const navList = page.locator('header nav ul.nav-links.mobile-menu');
        if ((await navList.count()) !== 1) {
          errors.push(`${path}: expected exactly one ul.nav-links.mobile-menu`);
        }

        const navOk = await page.evaluate(() => typeof window.Navigation !== 'undefined');
        if (!navOk) {
          errors.push(`${path}: navigation.js not loaded (window.Navigation missing)`);
        }

        const expanded = await toggle.getAttribute('aria-expanded');
        if (expanded === 'true') {
          await toggle.click();
          await page.waitForTimeout(200);
        }

        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        const inBar = await page.locator('#cart-icon').evaluate((el) =>
          Boolean(document.getElementById('mobile-header-cart')?.contains(el))
        );
        if (!inBar) {
          errors.push(`${path}: #cart-icon should be inside #mobile-header-cart on mobile`);
        }

        await expect(page.locator('#cart-icon').first()).toBeEnabled();
      } catch (e) {
        errors.push(`${path}: ${e}`);
      }
    }

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
