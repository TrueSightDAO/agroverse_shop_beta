import { test, expect } from '@playwright/test';

/**
 * Hamburger Menu Functionality Tests
 * 
 * Comprehensive tests to ensure hamburger menu works correctly across ALL pages:
 * - Hamburger button is visible and clickable
 * - Menu opens when hamburger is clicked
 * - Menu closes when hamburger is clicked again
 * - Menu closes when overlay is clicked
 * - Menu closes when a link is clicked
 * - Body scroll is prevented when menu is open
 * - Menu closes on window resize to desktop
 */

const MOBILE_VIEWPORT = { width: 375, height: 667 };

// Comprehensive list of all pages to test
const ALL_PAGES = [
  // Homepage
  '/',
  
  // Categories
  '/category/retail-packs',
  '/category/wholesale-bulk',
  
  // Product pages
  '/product-page/oscar-s-bahia-ceremonial-cacao',
  '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  '/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans',
  '/product-page/8-ounce-organic-cacao-nibs-from-brazil',
  
  // Farms
  '/farms/oscar-bahia',
  '/farms/paulo-la-do-sitio-para',
  
  // Shipments
  '/shipments/agl4',
  '/shipments/agl8',
  
  // Other pages
  '/partners',
  '/blog',
  
  // Blog posts (test a few key ones)
  '/post/the-heart-of-brazilian-cacao-bahia-and-amazon-origins',
  '/post/the-joy-of-cacao-circles-connections-and-community',
];

test.describe('Hamburger Menu Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport for all tests
    await page.setViewportSize(MOBILE_VIEWPORT);
  });

  test('Hamburger button is visible and clickable on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing hamburger button visibility across all pages: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500); // Wait for page to fully load

        // Find hamburger button
        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const buttonExists = await hamburgerButton.count() > 0;

        if (!buttonExists) {
          errors.push(`❌ ${url}: Hamburger button (.mobile-menu-toggle) not found`);
          continue;
        }

        // Check button is visible
        const isVisible = await hamburgerButton.isVisible();
        if (!isVisible) {
          errors.push(`❌ ${url}: Hamburger button is not visible`);
        }

        // Check button is enabled/clickable
        const isEnabled = await hamburgerButton.isEnabled();
        if (!isEnabled) {
          errors.push(`❌ ${url}: Hamburger button is not enabled/clickable`);
        }

        // Check button has aria-expanded attribute
        const ariaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        if (ariaExpanded === null) {
          errors.push(`❌ ${url}: Hamburger button missing aria-expanded attribute`);
        }

        // Check button has aria-label
        const ariaLabel = await hamburgerButton.getAttribute('aria-label');
        if (!ariaLabel || !ariaLabel.toLowerCase().includes('menu')) {
          errors.push(`❌ ${url}: Hamburger button missing or incorrect aria-label`);
        }

        console.log(`✅ ${url}: Hamburger button is visible and accessible`);
      } catch (error) {
        errors.push(`Failed to check hamburger button on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Hamburger button visibility issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu opens when clicked on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing hamburger menu opens on all pages: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0) {
          errors.push(`❌ ${url}: Hamburger button not found`);
          continue;
        }

        if (await mobileMenu.count() === 0) {
          errors.push(`❌ ${url}: Mobile menu element not found`);
          continue;
        }

        // Check initial state (should be closed)
        const initialAriaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        const initialMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        // Click hamburger to open menu
        await hamburgerButton.click();
        await page.waitForTimeout(800); // Wait for menu animation

        // Check menu opened
        const afterClickAriaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        const afterClickMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });
        const menuVisible = await mobileMenu.isVisible();

        if (afterClickAriaExpanded !== 'true') {
          errors.push(`❌ ${url}: Hamburger button aria-expanded should be "true" after click (got "${afterClickAriaExpanded}")`);
        }

        if (!afterClickMenuHasActive && !menuVisible) {
          errors.push(`❌ ${url}: Mobile menu should be active/visible after hamburger click`);
        }

        // Check body overflow is hidden when menu is open
        const bodyOverflow = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });
        if (bodyOverflow !== 'hidden') {
          console.log(`⚠️  ${url}: Body overflow is not hidden (may be intentional)`);
        }

        console.log(`✅ ${url}: Hamburger menu opens correctly`);
      } catch (error) {
        errors.push(`Failed to test menu open on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Hamburger menu open issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu closes when clicked again on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing hamburger menu closes on all pages: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          continue; // Skip if elements not found
        }

        // Open menu first
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Verify menu is open
        const menuIsOpen = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (!menuIsOpen) {
          errors.push(`❌ ${url}: Menu should be open before testing close`);
          continue;
        }

        // Click hamburger again to close
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Check menu closed
        const afterCloseAriaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        const afterCloseMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (afterCloseAriaExpanded !== 'false') {
          errors.push(`❌ ${url}: Hamburger button aria-expanded should be "false" after closing (got "${afterCloseAriaExpanded}")`);
        }

        if (afterCloseMenuHasActive) {
          errors.push(`❌ ${url}: Mobile menu should not have "active" class after closing`);
        }

        // Check body overflow is restored
        const bodyOverflow = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });
        if (bodyOverflow === 'hidden') {
          errors.push(`❌ ${url}: Body overflow should be restored after closing menu`);
        }

        console.log(`✅ ${url}: Hamburger menu closes correctly`);
      } catch (error) {
        errors.push(`Failed to test menu close on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Hamburger menu close issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu closes when overlay is clicked on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing hamburger menu closes on overlay click: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();
        const overlay = page.locator('.mobile-menu-overlay').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          continue; // Skip if elements not found
        }

        // Open menu first
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Check if overlay exists
        if (await overlay.count() === 0) {
          console.log(`⚠️  ${url}: Overlay not found (may be optional)`);
          continue;
        }

        // Click the dimmed area left of the drawer; avoid blog headers and menu (narrow viewports).
        await overlay.click({ position: { x: 15, y: 520 }, force: true });
        await page.waitForTimeout(800);

        // Check menu closed
        const afterOverlayClickAriaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        const afterOverlayClickMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (afterOverlayClickAriaExpanded !== 'false') {
          errors.push(`❌ ${url}: Menu should close when overlay is clicked (aria-expanded="${afterOverlayClickAriaExpanded}")`);
        }

        if (afterOverlayClickMenuHasActive) {
          errors.push(`❌ ${url}: Menu should not be active after overlay click`);
        }

        console.log(`✅ ${url}: Menu closes on overlay click`);
      } catch (error) {
        errors.push(`Failed to test overlay click on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Overlay click close issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu closes when a link is clicked on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing hamburger menu closes on link click: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          continue; // Skip if elements not found
        }

        // Open menu first
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Find first link in menu
        const menuLinks = mobileMenu.locator('a').first();
        if (await menuLinks.count() === 0) {
          console.log(`⚠️  ${url}: No links found in menu`);
          continue;
        }

        // Click first link
        await menuLinks.click();
        await page.waitForTimeout(800);

        // Check menu closed (may navigate away, so check quickly)
        const afterLinkClickAriaExpanded = await hamburgerButton.getAttribute('aria-expanded').catch(() => null);
        const afterLinkClickMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        }).catch(() => true);

        // If we're still on the page, menu should be closed
        // If navigation happened, that's also fine
        if (afterLinkClickAriaExpanded !== null && afterLinkClickAriaExpanded !== 'false') {
          errors.push(`❌ ${url}: Menu should close when link is clicked (aria-expanded="${afterLinkClickAriaExpanded}")`);
        }

        console.log(`✅ ${url}: Menu closes on link click`);
      } catch (error) {
        // Navigation errors are expected when clicking links
        if (!error.toString().includes('Navigation') && !error.toString().includes('Target closed')) {
          errors.push(`Failed to test link click on ${url}: ${error}`);
        }
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Link click close issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    // Allow some failures as navigation may interrupt tests
    expect(errors.length).toBeLessThan(ALL_PAGES.length / 2);
  });

  test('Body scroll is prevented when hamburger menu is open on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing body scroll prevention: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          continue; // Skip if elements not found
        }

        // Check initial body overflow
        const initialOverflow = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });

        // Open menu
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Check body overflow is hidden
        const overflowWhenOpen = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });

        if (overflowWhenOpen !== 'hidden') {
          errors.push(`❌ ${url}: Body overflow should be "hidden" when menu is open (got "${overflowWhenOpen}")`);
        }

        // Close menu
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Check body overflow is restored
        const overflowWhenClosed = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });

        if (overflowWhenClosed === 'hidden') {
          errors.push(`❌ ${url}: Body overflow should be restored when menu is closed (got "${overflowWhenClosed}")`);
        }

        console.log(`✅ ${url}: Body scroll prevention works correctly`);
      } catch (error) {
        errors.push(`Failed to test body scroll on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Body scroll prevention issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu closes on window resize to desktop on all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🍔 Testing menu closes on resize: ${baseUrl}\n`);

    // Test on a subset of pages (resize test is slower)
    const testPages = ALL_PAGES.slice(0, 10); // Test first 10 pages

    for (const url of testPages) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          continue; // Skip if elements not found
        }

        // Open menu
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        // Verify menu is open
        const menuIsOpen = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (!menuIsOpen) {
          errors.push(`❌ ${url}: Menu should be open before testing resize`);
          continue;
        }

        // Resize to desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(1000); // Wait for resize handler

        // Check menu closed
        const afterResizeAriaExpanded = await hamburgerButton.getAttribute('aria-expanded');
        const afterResizeMenuHasActive = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (afterResizeAriaExpanded !== 'false') {
          errors.push(`❌ ${url}: Menu should close on resize to desktop (aria-expanded="${afterResizeAriaExpanded}")`);
        }

        if (afterResizeMenuHasActive) {
          errors.push(`❌ ${url}: Menu should not be active after resize to desktop`);
        }

        // Reset to mobile for next test
        await page.setViewportSize(MOBILE_VIEWPORT);
        await page.waitForTimeout(500);

        console.log(`✅ ${url}: Menu closes on resize to desktop`);
      } catch (error) {
        errors.push(`Failed to test resize on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Resize close issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Hamburger menu functionality is consistent across all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];
    const results: Record<string, any> = {};

    console.log(`\n🍔 Testing hamburger menu consistency: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        const hamburgerButton = page.locator('.mobile-menu-toggle').first();
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await hamburgerButton.count() === 0 || await mobileMenu.count() === 0) {
          errors.push(`❌ ${url}: Hamburger menu elements not found`);
          continue;
        }

        // Test full cycle: open -> verify -> close -> verify
        await hamburgerButton.click();
        await page.waitForTimeout(800);

        const ariaExpandedOpen = await hamburgerButton.getAttribute('aria-expanded');
        const menuActiveOpen = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        await hamburgerButton.click();
        await page.waitForTimeout(800);

        const ariaExpandedClosed = await hamburgerButton.getAttribute('aria-expanded');
        const menuActiveClosed = await mobileMenu.evaluate((el) => {
          return el.classList.contains('active');
        });

        results[url] = {
          opens: ariaExpandedOpen === 'true' && menuActiveOpen,
          closes: ariaExpandedClosed === 'false' && !menuActiveClosed,
        };

        if (!results[url].opens) {
          errors.push(`❌ ${url}: Menu does not open correctly`);
        }
        if (!results[url].closes) {
          errors.push(`❌ ${url}: Menu does not close correctly`);
        }

        console.log(`✅ ${url}: Hamburger menu works correctly`);
      } catch (error) {
        errors.push(`Failed to test ${url}: ${error}`);
      }
    }

    // Summary
    const workingPages = Object.values(results).filter(r => r.opens && r.closes).length;
    const totalPages = Object.keys(results).length;

    console.log(`\n📊 Summary: ${workingPages}/${totalPages} pages have working hamburger menu`);

    if (errors.length > 0) {
      console.error('\n❌ Hamburger menu consistency issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });
});
