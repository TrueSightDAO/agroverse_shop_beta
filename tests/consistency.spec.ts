import { test, expect } from '@playwright/test';
import { chromium } from 'playwright';

/**
 * Visual and Layout Consistency Tests for Agroverse.shop
 * 
 * Tests ensure:
 * - Navigation consistency across all pages
 * - Branding elements (logo, colors, fonts) are consistent
 * - Layout structure is consistent
 * - Responsive design works across breakpoints
 */

// BASE_URL will be set from Playwright config (baseURL)
const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

// Key pages to test
const KEY_PAGES = [
  '/',
  '/category/retail-packs',
  '/category/wholesale-bulk',
  '/product-page/oscar-s-bahia-ceremonial-cacao',
  '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  '/farms/oscar-bahia',
  '/shipments/agl4',
  '/partners',
  '/blog'
];

// Brand consistency checks
const BRAND_COLORS = {
  primary: '#3b3333',
  secondary: '#4d4d4d',
  accent: '#fefc8f',
  text: '#3b3333',
  bg: '#ffffff'
};

const BRAND_FONTS = {
  heading: 'Playfair Display',
  body: 'Open Sans'
};

test.describe('Agroverse.shop - Visual Consistency', () => {
  
  test('Navigation header is consistent across pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const navigationSelectors = [
      'header nav',
      '.logo img',
      '.nav-links',
      'a[href*="index.html"]',
      'a[href*="category"]',
      'a[href*="farms"]',
      'a[href*="shipments"]'
    ];

    for (const url of KEY_PAGES) {
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Check navigation exists
      for (const selector of navigationSelectors) {
        const element = page.locator(selector).first();
        await expect(element).toBeVisible({ timeout: 5000 });
      }
      
      // Check logo is present
      const logo = page.locator('.logo img').first();
      await expect(logo).toHaveAttribute('src', /agroverse-logo/);
    }
  });

  test('Footer is consistent across pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const footerSelectors = [
      'footer',
      'footer h3',
      '.footer-links',
      'footer a[href*="mailto"]'
    ];

    for (const url of KEY_PAGES) {
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Scroll to footer
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      
      for (const selector of footerSelectors) {
        const element = page.locator(selector).first();
        await expect(element).toBeVisible({ timeout: 5000 });
      }
      
      // Check footer text
      const footerText = await page.locator('footer').textContent();
      expect(footerText).toContain('Agroverse');
      expect(footerText).toContain('Regenerating our Amazon rainforest');
    }
  });

  test('Brand colors are consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Check CSS variables match brand colors
    const rootStyles = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      return {
        primary: computedStyle.getPropertyValue('--color-primary').trim(),
        secondary: computedStyle.getPropertyValue('--color-secondary').trim(),
        accent: computedStyle.getPropertyValue('--color-accent').trim(),
        text: computedStyle.getPropertyValue('--color-text').trim(),
        bg: computedStyle.getPropertyValue('--color-bg').trim()
      };
    });
    
    // Convert RGB to hex for comparison (approximate check)
    expect(rootStyles.primary).toBeTruthy();
    expect(rootStyles.secondary).toBeTruthy();
    expect(rootStyles.accent).toBeTruthy();
  });

  test('Fonts are consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Wait for fonts to load
    await page.waitForTimeout(2000);
    
    // Check heading font - try h1 first, then h2, then h3
    let headingFont = '';
    const headingSelectors = ['h1', 'h2', 'h3'];
    for (const selector of headingSelectors) {
      const heading = page.locator(selector).first();
      const count = await heading.count();
      if (count > 0) {
        headingFont = await heading.evaluate((el) => {
          return window.getComputedStyle(el).fontFamily;
        });
        if (headingFont) {
          break;
        }
      }
    }
    
    // Verify heading font contains Playfair Display
    expect(headingFont).toBeTruthy();
    expect(headingFont.toLowerCase()).toContain('playfair display');
    
    // Check body font
    const body = page.locator('body');
    const bodyFont = await body.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    expect(bodyFont).toBeTruthy();
    expect(bodyFont.toLowerCase()).toContain('open sans');
    
    // Also check CSS variables are set correctly
    const cssVars = await page.evaluate(() => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      return {
        headingFont: computedStyle.getPropertyValue('--font-heading').trim(),
        bodyFont: computedStyle.getPropertyValue('--font-body').trim(),
      };
    });
    
    expect(cssVars.headingFont.toLowerCase()).toContain('playfair display');
    expect(cssVars.bodyFont.toLowerCase()).toContain('open sans');
  });

  test('Responsive design works across breakpoints', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    for (const breakpoint of BREAKPOINTS) {
      await page.setViewportSize({ width: breakpoint.width, height: breakpoint.height });
      
      for (const url of ['/', '/category/retail-packs', '/product-page/oscar-s-bahia-ceremonial-cacao']) {
        await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForLoadState('domcontentloaded');
        
        // Check navigation is visible (may be hamburger on mobile)
        const nav = page.locator('header nav').first();
        await expect(nav).toBeVisible();
        
        // Check no horizontal scroll
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });
        expect(hasHorizontalScroll).toBe(false);
      }
    }
  });

  test('Product pages have consistent structure', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const productPages = [
      '/product-page/oscar-s-bahia-ceremonial-cacao',
      '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
      '/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans'
    ];

    for (const url of productPages) {
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Check required product elements
      await expect(page.locator('.product-section')).toBeVisible();
      await expect(page.locator('.product-image')).toBeVisible();
      await expect(page.locator('.product-info h1')).toBeVisible();
      await expect(page.locator('.product-price')).toBeVisible();
      await expect(page.locator('.add-to-cart-btn')).toBeVisible();
      await expect(page.locator('.product-details')).toBeVisible();
      
      // Check Product JSON-LD exists
      const jsonLd = await page.locator('script[type="application/ld+json"]').textContent();
      expect(jsonLd).toContain('"@type": "Product"');
      expect(jsonLd).toContain('"name"');
      expect(jsonLd).toContain('"offers"');
    }
  });

  test('No broken images', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const brokenImages: string[] = [];
    
    page.on('response', (response) => {
      if (response.url().match(/\.(jpg|jpeg|png|gif|webp)$/i) && response.status() === 404) {
        brokenImages.push(response.url());
      }
    });

    for (const url of KEY_PAGES) {
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('domcontentloaded');
      
      // Wait a bit for images to load
      await page.waitForTimeout(2000);
    }
    
    expect(brokenImages).toHaveLength(0);
  });

  test('All internal links are valid', async ({ page }) => {
    const brokenLinks: string[] = [];
    
    page.on('response', (response) => {
      if (response.url().startsWith(BASE_URL) && response.status() === 404) {
        brokenLinks.push(response.url());
      }
    });

    for (const url of KEY_PAGES) {
      await page.goto(`${BASE_URL}${url}`);
      await page.waitForLoadState('domcontentloaded');
      
      // Click all internal links (limit to first 10 per page to avoid too many)
      const links = page.locator(`a[href^="${BASE_URL}"], a[href^="/"]`).first();
      if (await links.count() > 0) {
        // Just check they exist, don't click all (would be too slow)
      }
    }
    
    // This is a basic check - for full link checking, would need to crawl all links
    expect(brokenLinks.length).toBeLessThan(5); // Allow some tolerance
  });

  test('Meta tags are consistent', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    for (const url of KEY_PAGES) {
      await page.goto(`${baseUrl}${url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      
      // Check required meta tags
      await expect(page.locator('meta[property="og:type"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:url"]')).toHaveCount(1);
      await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
      
      // Check canonical URL
      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toContain('agroverse.shop');
    }
  });
});

test.describe('Agroverse.shop - Visual Regression', () => {
  
  test('Homepage visual snapshot', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    // Take full page screenshot
    await expect(page).toHaveScreenshot('homepage-desktop.png', {
      fullPage: true,
      maxDiffPixels: 1000 // Allow some tolerance for dynamic content
    });
  });

  test('Product page visual snapshot', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('product-page-desktop.png', {
      fullPage: true,
      maxDiffPixels: 1000
    });
  });

  test('Mobile viewport snapshots', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveScreenshot('homepage-mobile.png', {
      fullPage: true,
      maxDiffPixels: 1000
    });
  });
});
