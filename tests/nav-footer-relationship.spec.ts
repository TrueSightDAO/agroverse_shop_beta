import { test, expect } from '@playwright/test';

/**
 * Navigation-Footer Relationship Tests
 * 
 * Ensures proper relationship between navigation menu and footer links
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

test.describe('Navigation-Footer Relationship', () => {
  
  test('All navigation links exist in footer', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🌐 Testing navigation-footer relationship: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await page.waitForTimeout(1000);

        // Get navigation links
        const navLinks = await page.locator('header nav a, .nav-links a')
          .filter({ hasNot: page.locator('.post-navigation a') })
          .all();
        
        const navHrefs = new Set<string>();
        for (const link of navLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href && text && text.trim() && !href.match(/^(tel:|mailto:)/)) {
            // Normalize href
            if (href.startsWith('../')) href = href.replace(/\.\.\//g, '');
            if (href.startsWith('./')) href = href.replace('./', '');
            href = href.replace(/\/index\.html(#|$)/g, '/$1');
            href = href.replace(/^index\.html(#|$)/g, '$1');
            href = href.replace(/^.*index\.html#/, '#');
            if (!href.includes('#') && !href.endsWith('/') && href.length > 0) {
              href = href + '/';
            }
            navHrefs.add(href.trim());
          }
        }

        // Get footer links
        const footerLinks = await page.locator('footer a').all();
        const footerHrefs = new Set<string>();
        for (const link of footerLinks) {
          let href = await link.getAttribute('href');
          if (href && !href.match(/^(tel:|mailto:)/)) {
            // Normalize href
            if (href.startsWith('../')) href = href.replace(/\.\.\//g, '');
            if (href.startsWith('./')) href = href.replace('./', '');
            href = href.replace(/\/index\.html(#|$)/g, '/$1');
            href = href.replace(/^index\.html(#|$)/g, '$1');
            href = href.replace(/^.*index\.html#/, '#');
            if (!href.includes('#') && !href.endsWith('/') && href.length > 0) {
              href = href + '/';
            }
            footerHrefs.add(href.trim());
          }
        }

        // Check if all nav links exist in footer
        const missingInFooter: string[] = [];
        for (const navHref of navHrefs) {
          if (!footerHrefs.has(navHref)) {
            missingInFooter.push(navHref);
          }
        }

        if (missingInFooter.length > 0) {
          errors.push(`❌ ${url}: Navigation links not found in footer: ${missingInFooter.join(', ')}`);
        } else {
          console.log(`✅ ${url}: All navigation links exist in footer`);
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Navigation-Footer Relationship Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    } else {
      console.log(`\n✅ All navigation links exist in footer across all pages!`);
    }
  });

  test('Contact link is consistent between nav and footer', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    for (const url of TEST_PAGES) {
      try {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Get Contact link from navigation
        const navContactLinks = await page.locator('header nav a, .nav-links a')
          .filter({ hasText: /Contact/i })
          .all();
        
        // Get Contact link from footer
        const footerContactLinks = await page.locator('footer a')
          .filter({ hasText: /Contact/i })
          .all();

        if (navContactLinks.length === 0 || footerContactLinks.length === 0) {
          errors.push(`❌ ${url}: Contact link missing in nav or footer`);
          continue;
        }

        const navHref = await navContactLinks[0].getAttribute('href');
        const footerHref = await footerContactLinks[0].getAttribute('href');

        // Both should use same protocol (mailto: or anchor)
        const navProtocol = navHref?.match(/^(mailto:|#)/)?.[0];
        const footerProtocol = footerHref?.match(/^(mailto:|#)/)?.[0];

        if (navProtocol !== footerProtocol) {
          errors.push(
            `❌ ${url}: Contact link inconsistency\n` +
            `   Nav: ${navHref}\n` +
            `   Footer: ${footerHref}`
          );
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Contact Link Inconsistencies:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    }
  });

  test('Footer contains comprehensive site map', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const expectedFooterLinks = [
      'home',
      'mission',
      'products',
      'blog',
      'contact'
    ];

    const errors: string[] = [];

    for (const url of TEST_PAGES) {
      try {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const footerLinks = await page.locator('footer a').all();
        const footerTexts = new Set<string>();
        
        for (const link of footerLinks) {
          const text = await link.textContent();
          if (text) {
            footerTexts.add(text.trim().toLowerCase());
          }
        }

        // Check for essential footer links
        for (const expected of expectedFooterLinks) {
          const found = Array.from(footerTexts).some(text => 
            text.includes(expected) || text === expected
          );
          if (!found) {
            errors.push(`❌ ${url}: Missing essential footer link: ${expected}`);
          }
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Footer Site Map Issues:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    }
  });

  test('No duplicate links within navigation', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    for (const url of TEST_PAGES) {
      try {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const navLinks = await page.locator('header nav a, .nav-links a')
          .filter({ hasNot: page.locator('.post-navigation a') })
          .all();
        
        const seenHrefs = new Set<string>();
        const duplicates: string[] = [];

        for (const link of navLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href && text) {
            // Normalize
            if (href.startsWith('../')) href = href.replace(/\.\.\//g, '');
            if (href.startsWith('./')) href = href.replace('./', '');
            href = href.replace(/\/index\.html(#|$)/g, '/$1');
            const normalized = `${text.trim()} -> ${href.trim()}`;
            
            if (seenHrefs.has(normalized)) {
              duplicates.push(normalized);
            }
            seenHrefs.add(normalized);
          }
        }

        if (duplicates.length > 0) {
          errors.push(`❌ ${url}: Duplicate navigation links: ${duplicates.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Duplicate Navigation Links:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    }
  });

  test('No duplicate links within footer', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    for (const url of TEST_PAGES) {
      try {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        const footerLinks = await page.locator('footer a').all();
        const seenHrefs = new Set<string>();
        const duplicates: string[] = [];

        for (const link of footerLinks) {
          let href = await link.getAttribute('href');
          const text = await link.textContent();
          if (href && text) {
            // Normalize
            if (href.startsWith('../')) href = href.replace(/\.\.\//g, '');
            if (href.startsWith('./')) href = href.replace('./', '');
            href = href.replace(/\/index\.html(#|$)/g, '/$1');
            const normalized = `${text.trim()} -> ${href.trim()}`;
            
            if (seenHrefs.has(normalized)) {
              duplicates.push(normalized);
            }
            seenHrefs.add(normalized);
          }
        }

        if (duplicates.length > 0) {
          errors.push(`❌ ${url}: Duplicate footer links: ${duplicates.join(', ')}`);
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.log('\n❌ Duplicate Footer Links:');
      errors.forEach(error => console.log(`\n${error}`));
      expect(errors.length).toBe(0);
    }
  });
});
