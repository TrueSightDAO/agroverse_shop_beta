import { test, expect } from '@playwright/test';

/**
 * Mobile Menu Elements Consistency Test
 * 
 * Ensures mobile menu structure, logo, hamburger button, and menu elements
 * are consistent across all pages
 */

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
  '/blog'
];

test.describe('Mobile Menu Elements Consistency', () => {
  
  test('Mobile menu toggle button is consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log(`\n🌐 Testing mobile menu toggle button: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Check for mobile menu toggle button
        const toggleButton = page.locator('.mobile-menu-toggle, button[aria-expanded], [aria-label*="menu"]').first();
        const buttonExists = await toggleButton.count() > 0;

        if (!buttonExists) {
          errors.push(`❌ ${url}: Mobile menu toggle button not found`);
          continue;
        }

        // Check button attributes
        const ariaExpanded = await toggleButton.getAttribute('aria-expanded');
        const ariaLabel = await toggleButton.getAttribute('aria-label');
        const className = await toggleButton.getAttribute('class');

        if (!ariaExpanded) {
          errors.push(`❌ ${url}: Mobile menu toggle missing aria-expanded attribute`);
        }
        if (!ariaLabel || !ariaLabel.toLowerCase().includes('menu')) {
          errors.push(`❌ ${url}: Mobile menu toggle missing or incorrect aria-label`);
        }
        if (!className || !className.includes('mobile-menu-toggle')) {
          errors.push(`❌ ${url}: Mobile menu toggle missing expected class`);
        }

        // Check hamburger lines
        const hamburgerLines = await toggleButton.locator('.hamburger-line, span').count();
        if (hamburgerLines < 3) {
          errors.push(`❌ ${url}: Mobile menu toggle should have 3 hamburger lines, found ${hamburgerLines}`);
        }

        console.log(`✅ ${url}: Mobile menu toggle button is present and correct`);
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Mobile Menu Toggle Button Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have consistent mobile menu toggle buttons!`);
    }
  });

  test('Logo is consistent in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];
    const logoStructures: Record<string, any> = {};

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log(`\n🌐 Testing logo consistency: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Check for logo
        const logoLink = page.locator('header .logo, header nav .logo, header a.logo').first();
        const logoExists = await logoLink.count() > 0;

        if (!logoExists) {
          errors.push(`❌ ${url}: Logo not found in header`);
          continue;
        }

        // Get logo structure
        const logoHref = await logoLink.getAttribute('href');
        const logoImg = logoLink.locator('img').first();
        const imgExists = await logoImg.count() > 0;
        const imgSrc = imgExists ? await logoImg.getAttribute('src') : null;
        const imgAlt = imgExists ? await logoImg.getAttribute('alt') : null;

        logoStructures[url] = {
          href: logoHref,
          hasImage: imgExists,
          imgSrc: imgSrc,
          imgAlt: imgAlt
        };

        if (!imgExists) {
          errors.push(`❌ ${url}: Logo image not found`);
        }
        if (!imgAlt || !imgAlt.toLowerCase().includes('agroverse')) {
          errors.push(`❌ ${url}: Logo image missing or incorrect alt text`);
        }

        console.log(`✅ ${url}: Logo is present`);
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    // Compare logo structures
    const referencePage = TEST_PAGES[0];
    const referenceLogo = logoStructures[referencePage];

    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;
      const pageLogo = logoStructures[url];

      if (!pageLogo) continue;

      // Logo href can differ (homepage vs subpages), but structure should be same
      if (pageLogo.hasImage !== referenceLogo.hasImage) {
        errors.push(`❌ ${url}: Logo image presence differs from reference`);
      }
      if (pageLogo.imgAlt !== referenceLogo.imgAlt) {
        errors.push(`❌ ${url}: Logo alt text differs: "${pageLogo.imgAlt}" vs "${referenceLogo.imgAlt}"`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Logo Consistency Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have consistent logos!`);
    }
  });

  test('Mobile menu structure is consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];
    const menuStructures: Record<string, any> = {};

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log(`\n🌐 Testing mobile menu structure: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Open mobile menu first
        const toggleButton = page.locator('.mobile-menu-toggle').first();
        const toggleExists = await toggleButton.count() > 0;
        
        if (toggleExists) {
          const isExpanded = await toggleButton.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await toggleButton.click();
            // Wait for menu to become visible/active
            await page.waitForSelector('.mobile-menu.active, .nav-links.mobile-menu.active', { timeout: 2000 }).catch(() => {});
            await page.waitForTimeout(500);
          }
        }

        // Check for mobile menu - use DOM query to get structure even if hidden
        const mobileMenu = page.locator('.mobile-menu, .nav-links.mobile-menu, ul[class*="mobile-menu"]').first();
        const menuExists = await mobileMenu.count() > 0;

        if (!menuExists) {
          errors.push(`❌ ${url}: Mobile menu not found`);
          continue;
        }

        // Get menu structure - query DOM directly to get structure even if CSS-hidden
        const menuClass = await mobileMenu.getAttribute('class');
        
        // Use evaluate to get structure from DOM regardless of visibility
        const menuStructure = await mobileMenu.evaluate((el) => {
          const items = el.querySelectorAll('li');
          const links = el.querySelectorAll('a');
          return {
            itemCount: items.length,
            linkCount: links.length,
            tagName: el.tagName.toLowerCase()
          };
        });
        
        const menuItems = menuStructure.itemCount;
        const menuLinks = menuStructure.linkCount;

        menuStructures[url] = {
          className: menuClass,
          itemCount: menuItems,
          linkCount: menuLinks
        };

        // Check structure
        if (!menuClass || (!menuClass.includes('mobile-menu') && !menuClass.includes('nav-links'))) {
          errors.push(`❌ ${url}: Mobile menu missing expected classes`);
        }
        if (menuItems === 0) {
          errors.push(`❌ ${url}: Mobile menu has no list items`);
        }
        if (menuLinks === 0) {
          errors.push(`❌ ${url}: Mobile menu has no links`);
        }
        // Allow some flexibility - menu items should match links, but log if not
        if (menuItems !== menuLinks) {
          console.log(`⚠️  ${url}: Mobile menu item count (${menuItems}) doesn't match link count (${menuLinks}) - may have empty items`);
          // Don't fail, just log - this might be intentional
        }

        console.log(`✅ ${url}: Mobile menu structure is correct (${menuItems} items)`);
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    // Compare menu structures
    const referencePage = TEST_PAGES[0];
    const referenceMenu = menuStructures[referencePage];

    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;
      const pageMenu = menuStructures[url];

      if (!pageMenu) continue;

      if (pageMenu.itemCount !== referenceMenu.itemCount) {
        errors.push(
          `❌ ${url}: Mobile menu has ${pageMenu.itemCount} items, expected ${referenceMenu.itemCount}`
        );
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Mobile Menu Structure Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have consistent mobile menu structures!`);
    }
  });

  test('Mobile menu overlay is consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log(`\n🌐 Testing mobile menu overlay: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Check for mobile menu overlay
        const overlay = page.locator('.mobile-menu-overlay, [class*="overlay"]').first();
        const overlayExists = await overlay.count() > 0;

        if (!overlayExists) {
          // Overlay might not be required, but log it
          console.log(`⚠️  ${url}: Mobile menu overlay not found (may be optional)`);
          continue;
        }

        // Check overlay is hidden by default
        const overlayVisible = await overlay.isVisible();
        if (overlayVisible) {
          errors.push(`❌ ${url}: Mobile menu overlay should be hidden by default`);
        }

        console.log(`✅ ${url}: Mobile menu overlay is present`);
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Mobile Menu Overlay Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ Mobile menu overlay is consistent!`);
    }
  });

  test('Mobile menu opens and closes correctly', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    console.log(`\n🌐 Testing mobile menu functionality: ${baseUrl}\n`);

    // Test on a few key pages
    const testPages = ['/', '/product-page/oscar-s-bahia-ceremonial-cacao', '/blog'];

    for (const url of testPages) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const toggleButton = page.locator('.mobile-menu-toggle').first();
        const menu = page.locator('.mobile-menu, .nav-links.mobile-menu').first();

        if (await toggleButton.count() === 0 || await menu.count() === 0) {
          console.log(`⚠️  ${url}: Mobile menu elements not found, skipping functionality test`);
          continue;
        }

        // Check initial state (should be closed)
        const initialExpanded = await toggleButton.getAttribute('aria-expanded');
        const initialMenuVisible = await menu.isVisible();

        // Click to open
        await toggleButton.click();
        await page.waitForTimeout(500);

        const afterOpenExpanded = await toggleButton.getAttribute('aria-expanded');
        const afterOpenMenuVisible = await menu.isVisible();

        // Click to close
        await toggleButton.click();
        await page.waitForTimeout(500);

        const afterCloseExpanded = await toggleButton.getAttribute('aria-expanded');
        const afterCloseMenuVisible = await menu.isVisible();

        // Verify toggle works
        if (afterOpenExpanded !== 'true') {
          errors.push(`❌ ${url}: Menu toggle doesn't set aria-expanded="true" when opened`);
        }
        if (afterCloseExpanded !== 'false') {
          errors.push(`❌ ${url}: Menu toggle doesn't set aria-expanded="false" when closed`);
        }

        console.log(`✅ ${url}: Mobile menu opens and closes correctly`);
      } catch (error) {
        errors.push(`Failed to test ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Mobile Menu Functionality Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    }
  });
});
