import { test, expect } from '@playwright/test';

/**
 * Header and Footer Menu Consistency Tests
 * 
 * Ensures all pages have identical header navigation menu items and footer menu items.
 * This test verifies:
 * - Header navigation links are consistent across all pages
 * - Footer navigation links are consistent across all pages
 * - Menu structure and order are identical
 */

// Comprehensive list of all pages to test
const ALL_PAGES = [
  '/',
  '/category/retail-packs',
  '/category/wholesale-bulk',
  '/product-page/oscar-s-bahia-ceremonial-cacao',
  '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  '/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans',
  '/product-page/8-ounce-organic-cacao-nibs-from-brazil',
  '/farms/oscar-bahia',
  '/farms/paulo-la-do-sitio-para',
  '/farms/fazenda-bom-sucesso',
  '/shipments/agl4',
  '/shipments/agl8',
  '/partners',
  '/blog',
  '/post/the-joy-of-cacao-circles-connections-and-community',
  '/post/the-heart-of-brazilian-cacao-bahia-and-amazon-origins',
];

// Expected header menu items (normalized - text only, order matters)
const EXPECTED_HEADER_MENU_ITEMS = [
  'Home',
  'Products',
  'Cacao Journeys',
  'Blog',
  'Contact',
];

// Expected footer menu items (normalized - text only, order matters)
const EXPECTED_FOOTER_MENU_ITEMS = [
  'Home',
  'Mission',
  'Products',
  'Farms',
  'Shipments',
  'Blog',
  'Gatherings',
  'Partners',
  'Order History',
  'Contact',
];

/**
 * Normalize href for comparison (handles relative paths, index.html, etc.)
 */
function normalizeHref(href: string, basePath: string = ''): string {
  if (!href) return '';
  
  // Keep absolute URLs and special protocols as-is
  if (href.match(/^(tel:|mailto:|http:|https:|#)/)) {
    return href;
  }
  
  // Remove relative path prefixes
  let normalized = href.replace(/^\.\.\//g, '');
  normalized = normalized.replace(/^\.\//g, '');
  
  // Normalize index.html references
  normalized = normalized.replace(/\/index\.html(#|$)/g, '/$1');
  normalized = normalized.replace(/^index\.html(#|$)/g, '$1');
  normalized = normalized.replace(/^.*index\.html#/, '#');
  
  // Remove trailing slashes for comparison (except root)
  if (normalized !== '/' && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }
  
  return normalized;
}

/**
 * Extract menu items from navigation
 */
async function extractMenuItems(page: any, selector: string): Promise<Array<{text: string, href: string}>> {
  const menuItems: Array<{text: string, href: string}> = [];
  
  // Get all links in the navigation
  const links = await page.locator(`${selector} a`).all();
  
  for (const link of links) {
    // Get direct text content only (not nested elements)
    const text = await link.evaluate((el: HTMLElement) => {
      // Get only direct text nodes, not from child elements
      let directText = '';
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          directText += node.textContent || '';
        }
      }
      return directText.trim();
    });
    
    // Fallback to full textContent if no direct text
    const fullText = await link.textContent() || '';
    const finalText = text || fullText.trim();
    
    const href = await link.getAttribute('href') || '';
    const className = await link.evaluate((el: HTMLElement) => el.className || '');
    const id = await link.getAttribute('id') || '';
    
    // Skip logo, cart icon, and other non-menu items
    if (className.includes('logo') || 
        className.includes('cart') || 
        id === 'cart-icon' ||
        !finalText || 
        finalText.length === 0 ||
        finalText.match(/^\s*$/)) {
      continue;
    }
    
    const normalizedHref = normalizeHref(href);
    menuItems.push({
      text: finalText,
      href: normalizedHref,
    });
  }
  
  return menuItems;
}

test.describe('Header and Footer Menu Consistency', () => {
  
  test('Header navigation menu items are consistent across all pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];
    const menuItemsByPage: Record<string, Array<{text: string, href: string}>> = {};

    console.log(`\n📋 Testing header navigation consistency: ${baseUrl}\n`);

    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000); // Wait for navigation to render
        
        // Wait for navigation to be present
        await page.waitForSelector('nav, header nav, .nav-links', { timeout: 10000 }).catch(() => {});
        
        // Extract header menu items
        // On desktop viewport, we need to check for VISIBLE navigation links
        // Some pages only have mobile-menu which might be hidden on desktop
        let menuItems: Array<{text: string, href: string}> = [];
        
        // First try to find desktop nav-links (without mobile-menu class) that are visible
        const desktopNavLinks = page.locator('nav .nav-links:not(.mobile-menu) li > a');
        const desktopCount = await desktopNavLinks.count();
        
        if (desktopCount > 0) {
          // Check if any are visible
          let visibleCount = 0;
          const links = await desktopNavLinks.all();
          for (const link of links) {
            const isVisible = await link.isVisible();
            if (!isVisible) continue;
            
            visibleCount++;
            const text = await link.textContent();
            const href = await link.getAttribute('href') || '';
            const className = await link.evaluate((el: HTMLElement) => el.className || '');
            const id = await link.getAttribute('id') || '';
            
            // Skip logo, cart icon, and empty text
            if (className.includes('logo') || 
                className.includes('cart') || 
                id === 'cart-icon' ||
                !text || 
                !text.trim() ||
                text.trim().length === 0) {
              continue;
            }
            
            const normalizedHref = normalizeHref(href);
            menuItems.push({ text: text.trim(), href: normalizedHref });
          }
          
          // If desktop nav exists but nothing is visible, that's a problem
          if (desktopCount > 0 && visibleCount === 0) {
            console.log(`⚠️  ${url}: Desktop nav-links exist but none are visible`);
          }
        }
        
        // If no visible desktop nav, check mobile-menu visibility
        // On desktop, mobile-menu should still be visible if it's the only nav
        if (menuItems.length === 0) {
          const mobileNavLinks = page.locator('nav .nav-links li > a, nav ul.nav-links li > a');
          const links = await mobileNavLinks.all();
          
          for (const link of links) {
            // Check if link is visible on desktop (mobile-menu might be hidden)
            const isVisible = await link.isVisible();
            if (!isVisible) {
              // If mobile-menu links are hidden on desktop, that's a problem
              console.log(`⚠️  ${url}: Navigation links exist but are not visible on desktop`);
              continue;
            }
            
            const text = await link.textContent();
            const href = await link.getAttribute('href') || '';
            const className = await link.evaluate((el: HTMLElement) => el.className || '');
            const id = await link.getAttribute('id') || '';
            
            // Skip logo, cart icon, and empty text
            if (className.includes('logo') || 
                className.includes('cart') || 
                id === 'cart-icon' ||
                !text || 
                !text.trim() ||
                text.trim().length === 0) {
              continue;
            }
            
            const normalizedHref = normalizeHref(href);
            menuItems.push({ text: text.trim(), href: normalizedHref });
          }
        }
        
        // Filter out duplicates and normalize
        const uniqueItems = menuItems.filter((item, index, self) => 
          index === self.findIndex(t => t.text === item.text)
        );
        
        menuItemsByPage[url] = uniqueItems;
        
        console.log(`✅ ${url}: Found ${uniqueItems.length} header menu items`);
        if (uniqueItems.length > 0) {
          uniqueItems.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.text} -> ${item.href}`);
          });
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    // Use homepage as reference
    const referencePage = '/';
    const referenceItems = menuItemsByPage[referencePage];
    
    if (!referenceItems || referenceItems.length === 0) {
      console.error(`❌ No header menu items found on reference page ${referencePage}`);
      expect(referenceItems).toBeTruthy();
      return;
    }

    console.log(`\n📋 Reference header menu (from ${referencePage}):`);
    referenceItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.text}`);
    });

    // Compare all pages against reference
    for (const url of ALL_PAGES) {
      if (url === referencePage) continue;
      
      const pageItems = menuItemsByPage[url];
      
      if (!pageItems || pageItems.length === 0) {
        errors.push(`❌ ${url}: No header menu items found`);
        continue;
      }

      // Compare menu item texts (order matters)
      const referenceTexts = referenceItems.map(item => item.text);
      const pageTexts = pageItems.map(item => item.text);

      if (pageTexts.length !== referenceTexts.length) {
        errors.push(
          `❌ ${url}: Header menu has ${pageTexts.length} items, expected ${referenceTexts.length}\n` +
          `   Found: ${pageTexts.join(', ')}\n` +
          `   Expected: ${referenceTexts.join(', ')}`
        );
        continue;
      }

      // Check each menu item matches
      for (let i = 0; i < referenceTexts.length; i++) {
        if (pageTexts[i] !== referenceTexts[i]) {
          errors.push(
            `❌ ${url}: Header menu item mismatch at position ${i + 1}\n` +
            `   Found: "${pageTexts[i]}"\n` +
            `   Expected: "${referenceTexts[i]}"`
          );
        }
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Header menu inconsistencies:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Footer navigation menu items are consistent across all pages', async ({ page, baseURL }) => {
    test.setTimeout(120000);
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];
    const menuItemsByPage: Record<string, Array<{text: string, href: string}>> = {};

    console.log(`\n📋 Testing footer navigation consistency: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(2000);
        
        // Scroll to footer
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });
        await page.waitForTimeout(1500);
        
        // Wait for footer
        await page.waitForSelector('footer', { timeout: 10000 }).catch(() => {});
        
        // Extract footer menu items
        const menuItems = await extractMenuItems(page, 'footer');
        
        // Filter out phone/email links and normalize
        const navigationItems = menuItems.filter(item => 
          !item.href.startsWith('tel:') && 
          !item.href.startsWith('mailto:') &&
          item.text.trim().length > 0
        );
        
        menuItemsByPage[url] = navigationItems;
        
        console.log(`✅ ${url}: Found ${navigationItems.length} footer menu items`);
        if (navigationItems.length > 0) {
          navigationItems.forEach((item, i) => {
            console.log(`   ${i + 1}. ${item.text} -> ${item.href}`);
          });
        }
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    // Use homepage as reference
    const referencePage = '/';
    const referenceItems = menuItemsByPage[referencePage];
    
    if (!referenceItems || referenceItems.length === 0) {
      console.error(`❌ No footer menu items found on reference page ${referencePage}`);
      expect(referenceItems).toBeTruthy();
      return;
    }

    console.log(`\n📋 Reference footer menu (from ${referencePage}):`);
    referenceItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.text}`);
    });

    // Compare all pages against reference
    for (const url of ALL_PAGES) {
      if (url === referencePage) continue;
      
      const pageItems = menuItemsByPage[url];
      
      if (!pageItems || pageItems.length === 0) {
        errors.push(`❌ ${url}: No footer menu items found`);
        continue;
      }

      // Compare menu item texts (order matters)
      const referenceTexts = referenceItems.map(item => item.text);
      const pageTexts = pageItems.map(item => item.text);

      if (pageTexts.length !== referenceTexts.length) {
        errors.push(
          `❌ ${url}: Footer menu has ${pageTexts.length} items, expected ${referenceTexts.length}\n` +
          `   Found: ${pageTexts.join(', ')}\n` +
          `   Expected: ${referenceTexts.join(', ')}`
        );
        continue;
      }

      // Check each menu item matches
      for (let i = 0; i < referenceTexts.length; i++) {
        if (pageTexts[i] !== referenceTexts[i]) {
          errors.push(
            `❌ ${url}: Footer menu item mismatch at position ${i + 1}\n` +
            `   Found: "${pageTexts[i]}"\n` +
            `   Expected: "${referenceTexts[i]}"`
          );
        }
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Footer menu inconsistencies:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Navigation structure is consistent (nav-links class present)', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n📋 Testing navigation structure consistency: ${baseUrl}\n`);

    for (const url of ALL_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Check for nav element
        const navExists = await page.locator('nav, header nav').count() > 0;
        if (!navExists) {
          errors.push(`❌ ${url}: No <nav> element found`);
          continue;
        }
        
        // Check for nav-links class
        const navLinksExists = await page.locator('.nav-links, nav .nav-links, nav ul.nav-links').count() > 0;
        if (!navLinksExists) {
          errors.push(`❌ ${url}: No .nav-links element found in navigation`);
        }
        
        // Check for logo
        const logoExists = await page.locator('.logo, header .logo, nav .logo').count() > 0;
        if (!logoExists) {
          errors.push(`❌ ${url}: No logo found in header`);
        }
        
        console.log(`✅ ${url}: Navigation structure is correct`);
      } catch (error) {
        errors.push(`Failed to check ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Navigation structure issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });
});
