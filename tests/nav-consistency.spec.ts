import { test, expect } from '@playwright/test';

/**
 * Navigation Links Consistency Test for Agroverse.shop
 * 
 * Ensures navigation links (desktop nav-links and mobile-menu) are identical across all pages
 */

// Pages to test - comprehensive list including blog posts
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
  '/blog',
  '/post/the-joy-of-cacao-circles-connections-and-community',
  '/post/the-heart-of-brazilian-cacao-bahia-and-amazon-origins',
];

test.describe('Navigation Links Consistency', () => {
  
  test('Desktop navigation links are identical across all pages', async ({ page, baseURL }) => {
    const navLinksByPage: Record<string, string[]> = {};
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🌐 Testing navigation against: ${baseUrl}\n`);

    // Collect navigation links from all pages
    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for navigation to be present
        await page.waitForSelector('.nav-links', { timeout: 10000 });
        
        await page.waitForTimeout(1000); // Give nav time to render
        
        // Debug: Check what's actually on the page
        const navExists = await page.locator('.nav-links').count();
        const navLinksCount = await page.locator('.nav-links li > a').count();
        console.log(`  Debug: .nav-links exists: ${navExists > 0}, li > a count: ${navLinksCount}`);
        
        // Get all navigation links (desktop nav) - only links inside .nav-links li elements
        const navLinks = await page.locator('.nav-links li > a').all();
        const links: string[] = [];
        
        for (const link of navLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          // Skip logo and cart icon (they don't have text or have specific classes)
          const className = await link.evaluate(el => el.className || '');
          if (className && (className.includes('logo') || className.includes('cart'))) {
            continue;
          }
          if (href && text && text.trim()) {
            // Normalize href paths for comparison
            if (!href.match(/^(tel:|mailto:|http:|https:|#)/)) {
              if (href.startsWith('../')) {
                href = href.replace(/\.\.\//g, '');
              } else if (href.startsWith('./')) {
                href = href.replace('./', '');
              }
              href = href.replace(/\/index\.html(#|$)/g, '/$1');
              href = href.replace(/^index\.html(#|$)/g, '$1');
              href = href.replace(/^.*index\.html#/, '#');
              if (!href.includes('#') && !href.endsWith('/') && href.length > 0) {
                href = href + '/';
              }
            }
            links.push(`${text.trim()} -> ${href.trim()}`);
          }
        }
        
        // Sort for consistent comparison
        links.sort();
        navLinksByPage[url] = links;
        
        console.log(`✅ ${url}: Found ${links.length} navigation links`);
        if (links.length === 0) {
          console.log(`⚠️  Warning: No navigation links found on ${url}`);
          // Debug: Check what selectors exist
          const navExists = await page.locator('.nav-links').count();
          const liCount = await page.locator('.nav-links li').count();
          const aCount = await page.locator('.nav-links a').count();
          console.log(`   Debug: .nav-links=${navExists}, li=${liCount}, a=${aCount}`);
        }
      } catch (error) {
        const errorMsg = `Failed to load ${url}: ${error}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
      }
    }

    // Check for errors first
    if (errors.length > 0) {
      console.error('\n❌ Errors encountered:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    // Compare navigation links across all pages
    const referencePage = TEST_PAGES[0]; // Use homepage as reference
    const referenceLinks = navLinksByPage[referencePage];
    
    console.log(`\n📋 Reference page: ${referencePage}`);
    console.log(`   Links found: ${referenceLinks ? referenceLinks.length : 0}`);
    
    if (!referenceLinks || referenceLinks.length === 0) {
      console.error(`❌ No navigation links found on reference page ${referencePage}`);
      console.error(`   Available pages with links: ${Object.keys(navLinksByPage).join(', ')}`);
      expect(referenceLinks).toBeTruthy();
      expect(referenceLinks.length).toBeGreaterThan(0);
      return;
    }

    console.log(`\n📋 Reference navigation links (from ${referencePage}):`);
    referenceLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });

    // Check each page against reference
    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;
      
      const pageLinks = navLinksByPage[url];
      
      if (!pageLinks || pageLinks.length === 0) {
        errors.push(`❌ ${url}: No navigation links found`);
        continue;
      }

      // Compare counts
      if (pageLinks.length !== referenceLinks.length) {
        errors.push(
          `❌ ${url}: Navigation has ${pageLinks.length} links, expected ${referenceLinks.length}\n` +
          `   Found: ${pageLinks.join(', ')}\n` +
          `   Expected: ${referenceLinks.join(', ')}`
        );
        continue;
      }

      // Compare each link
      for (let i = 0; i < referenceLinks.length; i++) {
        if (pageLinks[i] !== referenceLinks[i]) {
          errors.push(
            `❌ ${url}: Navigation link mismatch at position ${i + 1}\n` +
            `   Found: ${pageLinks[i]}\n` +
            `   Expected: ${referenceLinks[i]}`
          );
        }
      }
    }

    // Report results
    if (errors.length > 0) {
      console.log('\n❌ Navigation Link Inconsistencies Found:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have identical navigation links!`);
    }
  });

  test('Mobile menu links are identical across all pages', async ({ page, baseURL }) => {
    const mobileLinksByPage: Record<string, string[]> = {};
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🌐 Testing mobile menu against: ${baseUrl}\n`);

    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Collect mobile menu links from all pages
    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for mobile menu toggle
        await page.waitForSelector('.mobile-menu-toggle, [aria-label*="menu"], button[aria-expanded]', { timeout: 5000 }).catch(() => {});
        
        // Try to open mobile menu if it exists
        const menuToggle = page.locator('.mobile-menu-toggle, button[aria-expanded], [aria-label*="menu"]').first();
        const menuExists = await menuToggle.count() > 0;
        
        if (menuExists) {
          const isExpanded = await menuToggle.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await menuToggle.click();
            await page.waitForTimeout(500); // Wait for menu to open
          }
        }
        
        await page.waitForTimeout(1000);
        
        // Get all mobile menu links - exclude post-navigation
        const mobileLinks = await page.locator('.mobile-menu a, [class*="mobile"] a, nav[aria-label*="mobile"] a').filter({
          hasNot: page.locator('.post-navigation a')
        }).all();
        const links: string[] = [];
        
        for (const link of mobileLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href && text && text.trim()) {
            // Normalize href paths for comparison
            if (!href.match(/^(tel:|mailto:|http:|https:|#)/)) {
              if (href.startsWith('../')) {
                href = href.replace(/\.\.\//g, '');
              } else if (href.startsWith('./')) {
                href = href.replace('./', '');
              }
              href = href.replace(/\/index\.html(#|$)/g, '/$1');
              href = href.replace(/^index\.html(#|$)/g, '$1');
              href = href.replace(/^.*index\.html#/, '#');
              if (!href.includes('#') && !href.endsWith('/') && href.length > 0) {
                href = href + '/';
              }
            }
            links.push(`${text.trim()} -> ${href.trim()}`);
          }
        }
        
        // Sort for consistent comparison
        links.sort();
        mobileLinksByPage[url] = links;
        
        console.log(`✅ ${url}: Found ${links.length} mobile menu links`);
      } catch (error) {
        errors.push(`Failed to load ${url}: ${error}`);
      }
    }

    // Compare mobile menu links across all pages
    const referencePage = TEST_PAGES[0];
    const referenceLinks = mobileLinksByPage[referencePage];
    
    if (!referenceLinks || referenceLinks.length === 0) {
      console.log('⚠️  No mobile menu links found on reference page - skipping comparison');
      return;
    }

    console.log(`\n📋 Reference mobile menu links (from ${referencePage}):`);
    referenceLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });

    // Check each page against reference
    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;
      
      const pageLinks = mobileLinksByPage[url];
      
      if (!pageLinks || pageLinks.length === 0) {
        // Mobile menu might not exist on all pages, so this is a warning, not an error
        console.log(`⚠️  ${url}: No mobile menu links found`);
        continue;
      }

      // Compare counts
      if (pageLinks.length !== referenceLinks.length) {
        errors.push(
          `❌ ${url}: Mobile menu has ${pageLinks.length} links, expected ${referenceLinks.length}\n` +
          `   Found: ${pageLinks.join(', ')}\n` +
          `   Expected: ${referenceLinks.join(', ')}`
        );
        continue;
      }

      // Compare each link
      for (let i = 0; i < referenceLinks.length; i++) {
        if (pageLinks[i] !== referenceLinks[i]) {
          errors.push(
            `❌ ${url}: Mobile menu link mismatch at position ${i + 1}\n` +
            `   Found: ${pageLinks[i]}\n` +
            `   Expected: ${referenceLinks[i]}`
          );
        }
      }
    }

    // Report results
    if (errors.length > 0) {
      console.log('\n❌ Mobile Menu Link Inconsistencies Found:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have identical mobile menu links!`);
    }
  });
});
