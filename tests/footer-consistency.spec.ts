import { test, expect } from '@playwright/test';

/**
 * Footer Links Consistency Test for Agroverse.shop
 * 
 * Ensures footer links are identical across all pages
 */

// BASE_URL will be set from Playwright config (baseURL)
// Use test.info().project.use.baseURL or page.url() to get the base URL

// Pages to test - comprehensive list
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

test.describe('Footer Links Consistency', () => {
  
  test('Footer links are identical across all pages', async ({ page, baseURL }) => {
    const footerLinksByPage: Record<string, string[]> = {};
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🌐 Testing against: ${baseUrl}\n`);

    // Collect footer links from all pages
    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for footer to be present
        await page.waitForSelector('footer', { timeout: 10000 });
        
        // Scroll to footer to ensure it's loaded
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        
        await page.waitForTimeout(2000); // Give footer time to render
        
        // Get all footer links
        const footerLinks = await page.locator('footer a').all();
        const links: string[] = [];
        
        for (const link of footerLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href && text) {
            // Normalize href paths for comparison
            // Skip normalization for special protocols (tel:, mailto:, http:, https:)
            if (!href.match(/^(tel:|mailto:|http:|https:)/)) {
              // Convert relative paths to normalized form
              if (href.startsWith('../')) {
                // Remove ../ prefixes (subpages use ../../ to go to root)
                href = href.replace(/\.\.\//g, '');
              } else if (href.startsWith('./')) {
                href = href.replace('./', '');
              }
              // Normalize index.html references - convert to directory path
              // But preserve directory name if it's just index.html
              if (href === 'index.html') {
                // For same-page links like "index.html", use current directory name
                // Extract directory from URL path
                const urlPath = url.split('/').filter(p => p);
                if (urlPath.length > 0) {
                  href = urlPath[urlPath.length - 1] + '/';
                } else {
                  href = '/';
                }
              } else {
                href = href.replace(/\/index\.html(#|$)/g, '/$1');
                href = href.replace(/^index\.html(#|$)/g, '$1');
              }
              // Normalize anchor links - if it's ../../index.html#anchor, convert to #anchor
              href = href.replace(/^.*index\.html#/, '#');
              // Normalize trailing slashes for directory paths (but not for anchors)
              if (!href.includes('#') && !href.endsWith('/') && href.length > 0) {
                // Add trailing slash for directory paths
                href = href + '/';
              }
            }
            links.push(`${text.trim()} -> ${href.trim()}`);
          }
        }
        
        // Sort for consistent comparison
        links.sort();
        footerLinksByPage[url] = links;
        
        console.log(`✅ ${url}: Found ${links.length} footer links`);
      } catch (error) {
        errors.push(`Failed to load ${url}: ${error}`);
      }
    }

    // Compare footer links across all pages
    const referencePage = TEST_PAGES[0]; // Use homepage as reference
    const referenceLinks = footerLinksByPage[referencePage];
    
    if (!referenceLinks || referenceLinks.length === 0) {
      expect(referenceLinks).toBeTruthy();
      expect(referenceLinks.length).toBeGreaterThan(0);
      return;
    }

    console.log(`\n📋 Reference footer links (from ${referencePage}):`);
    referenceLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link}`);
    });

    // Check each page against reference
    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;
      
      const pageLinks = footerLinksByPage[url];
      
      if (!pageLinks || pageLinks.length === 0) {
        errors.push(`❌ ${url}: No footer links found`);
        continue;
      }

      // Compare counts
      if (pageLinks.length !== referenceLinks.length) {
        errors.push(
          `❌ ${url}: Footer has ${pageLinks.length} links, expected ${referenceLinks.length}\n` +
          `   Found: ${pageLinks.join(', ')}\n` +
          `   Expected: ${referenceLinks.join(', ')}`
        );
        continue;
      }

      // Compare each link
      for (let i = 0; i < referenceLinks.length; i++) {
        if (pageLinks[i] !== referenceLinks[i]) {
          errors.push(
            `❌ ${url}: Footer link mismatch at position ${i + 1}\n` +
            `   Found: ${pageLinks[i]}\n` +
            `   Expected: ${referenceLinks[i]}`
          );
        }
      }
    }

    // Report results
    if (errors.length > 0) {
      console.log('\n❌ Footer Link Inconsistencies Found:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All ${TEST_PAGES.length} pages have identical footer links!`);
    }
  });

  test('Footer structure is consistent', async ({ page, baseURL }) => {
    const footerStructures: Record<string, any> = {};
    const baseUrl = baseURL || 'http://localhost:8000';

    for (const url of TEST_PAGES.slice(0, 5)) { // Test first 5 pages for structure
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await page.waitForTimeout(1000);

      // Get footer structure
      const footer = page.locator('footer').first();
      const structure = {
        hasHeading: await footer.locator('h3, h2, h1').count() > 0,
        headingText: await footer.locator('h3, h2, h1').first().textContent().catch(() => null),
        hasLinks: await footer.locator('a').count(),
        hasFooterContent: await footer.locator('.footer-content, footer > div').count() > 0,
        hasFooterLinks: await footer.locator('.footer-links, footer ul, footer nav').count() > 0
      };

      footerStructures[url] = structure;
    }

    // Compare structures
    const reference = footerStructures[TEST_PAGES[0]];
    const inconsistencies: string[] = [];

    for (const [url, structure] of Object.entries(footerStructures)) {
      if (url === TEST_PAGES[0]) continue;

      if (structure.hasHeading !== reference.hasHeading) {
        inconsistencies.push(`${url}: Footer heading presence differs`);
      }
      if (structure.hasLinks !== reference.hasLinks) {
        inconsistencies.push(`${url}: Footer has ${structure.hasLinks} links, expected ${reference.hasLinks}`);
      }
    }

    if (inconsistencies.length > 0) {
      console.log('Footer structure inconsistencies:');
      inconsistencies.forEach(issue => console.log(`  - ${issue}`));
      expect(inconsistencies.length).toBe(0);
    }
  });

  test('Footer links are valid (no 404s)', async ({ page, baseURL }) => {
    const brokenLinks: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    page.on('response', (response) => {
      if (response.status() === 404) {
        brokenLinks.push(response.url());
      }
    });

    // Test footer links from homepage
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await page.waitForTimeout(1000);

    const footerLinks = await page.locator('footer a').all();
    
    for (const link of footerLinks) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') || href.includes('agroverse.shop')) {
        try {
          // Click and check response
          await link.click({ timeout: 5000 });
          await page.waitForTimeout(1000);
          await page.goBack();
          await page.waitForTimeout(1000);
        } catch (error) {
          // Link might be external or have issues
          console.log(`⚠️  Could not verify link: ${href}`);
        }
      }
    }

    if (brokenLinks.length > 0) {
      console.log('Broken footer links found:');
      brokenLinks.forEach(link => console.log(`  - ${link}`));
      expect(brokenLinks.length).toBe(0);
    }
  });
});
