import { test, expect } from '@playwright/test';

/**
 * Cart Image Visibility Tests
 * 
 * Ensures cart item images are visible across all pages after adding products.
 * This test verifies that:
 * - Images load correctly regardless of which page the cart is opened on
 * - Image URLs are properly resolved (absolute vs relative)
 * - Images don't break when navigating between different page types
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
  '/blog',
  '/post/the-joy-of-cacao-circles-connections-and-community',
  '/post/the-heart-of-brazilian-cacao-bahia-and-amazon-origins',
];

test.describe('Cart Image Visibility', () => {
  
  test.beforeEach(async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    // Clear cart before each test
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      if (window.Cart) {
        window.Cart.clear();
      }
    });
    await page.waitForTimeout(500);
  });

  test('Cart images are visible after adding product from homepage', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart image visibility after adding from homepage: ${baseUrl}\n`);

    // Step 1: Add product from homepage
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    if (await addToCartButton.count() === 0) {
      throw new Error('Add to cart button not found on homepage');
    }

    // Get product image URL before adding to cart
    const productImage = page.locator('.product-image img, .item-card-image').first();
    let productImageSrc = '';
    if (await productImage.count() > 0) {
      productImageSrc = await productImage.getAttribute('src') || '';
    }

    // Add to cart
    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Verify item was added
    const cartCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });
    expect(cartCount).toBeGreaterThan(0);

    // Step 2: Test cart image visibility on all pages
    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Testing cart image on: ${url}`);

        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        // Open mobile menu if needed
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await mobileMenuToggle.click();
            await page.waitForTimeout(500);
          }
        }

        // Open cart sidebar
        await page.waitForSelector('#cart-icon', { timeout: 5000 });
        await page.locator('#cart-icon').click();
        await page.waitForTimeout(1000);

        // Check cart items exist
        const cartItems = page.locator('.cart-item');
        const itemCount = await cartItems.count();

        if (itemCount === 0) {
          errors.push(`❌ ${url}: No cart items found in sidebar`);
          continue;
        }

        // Check each cart item has a visible image
        for (let i = 0; i < itemCount; i++) {
          const cartItem = cartItems.nth(i);
          const cartItemImage = cartItem.locator('.cart-item-image');
          const imageExists = await cartItemImage.count();

          if (imageExists === 0) {
            errors.push(`❌ ${url}: Cart item ${i + 1} missing image element`);
            continue;
          }

          // Check image src attribute exists
          const imageSrc = await cartItemImage.getAttribute('src');
          if (!imageSrc) {
            errors.push(`❌ ${url}: Cart item ${i + 1} image has no src attribute`);
            continue;
          }

          // Check if image is visible (not hidden by CSS)
          const isVisible = await cartItemImage.isVisible();
          if (!isVisible) {
            errors.push(`❌ ${url}: Cart item ${i + 1} image is not visible (hidden by CSS)`);
            continue;
          }

          // Check if image loaded successfully (not broken)
          const imageNaturalWidth = await cartItemImage.evaluate((img: HTMLImageElement) => {
            return img.naturalWidth;
          });

          if (imageNaturalWidth === 0) {
            errors.push(`❌ ${url}: Cart item ${i + 1} image failed to load (naturalWidth=0, src="${imageSrc}")`);
            continue;
          }

          // Check if image URL is absolute (should be for cross-page compatibility)
          const isAbsolute = imageSrc.startsWith('http://') || imageSrc.startsWith('https://') || imageSrc.startsWith('//');
          if (!isAbsolute && !imageSrc.startsWith('/')) {
            console.log(`⚠️  ${url}: Cart item ${i + 1} image uses relative path: ${imageSrc}`);
          }

          console.log(`✅ ${url}: Cart item ${i + 1} image visible (${imageSrc.substring(0, 50)}...)`);
        }

        // Close cart sidebar
        const closeButton = page.locator('#cart-close');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      } catch (error) {
        errors.push(`Failed to test cart image on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart image visibility issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart images are visible when adding products from different pages', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart images when adding from different pages: ${baseUrl}\n`);

    // Add products from different product pages
    const productPages = [
      '/product-page/oscar-s-bahia-ceremonial-cacao',
      '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
    ];

    for (const productUrl of productPages) {
      try {
        const fullUrl = `${baseUrl}${productUrl}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const addToCartButton = page.locator('.add-to-cart-btn').first();
        if (await addToCartButton.count() > 0) {
          await addToCartButton.click();
          await page.waitForTimeout(2000);
          console.log(`✅ Added product from ${productUrl}`);
        }
      } catch (error) {
        errors.push(`Failed to add product from ${productUrl}: ${error}`);
      }
    }

    // Verify we have items in cart
    const cartCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });
    expect(cartCount).toBeGreaterThan(0);

    // Test cart images on various pages
    const testPages = [
      '/',
      '/blog',
      '/post/the-joy-of-cacao-circles-connections-and-community',
      '/farms/oscar-bahia',
    ];

    for (const url of testPages) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Testing cart images on: ${url}`);

        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        // Open mobile menu if needed
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          await mobileMenuToggle.click();
          await page.waitForTimeout(500);
        }

        // Open cart
        await page.waitForSelector('#cart-icon', { timeout: 5000 });
        await page.locator('#cart-icon').click();
        await page.waitForTimeout(1000);

        // Check all cart item images
        const cartItems = page.locator('.cart-item');
        const itemCount = await cartItems.count();

        for (let i = 0; i < itemCount; i++) {
          const cartItem = cartItems.nth(i);
          const cartItemImage = cartItem.locator('.cart-item-image');
          
          const imageSrc = await cartItemImage.getAttribute('src');
          const isVisible = await cartItemImage.isVisible();
          const naturalWidth = await cartItemImage.evaluate((img: HTMLImageElement) => img.naturalWidth);

          if (!imageSrc) {
            errors.push(`❌ ${url}: Cart item ${i + 1} has no image src`);
          } else if (!isVisible) {
            errors.push(`❌ ${url}: Cart item ${i + 1} image not visible`);
          } else if (naturalWidth === 0) {
            errors.push(`❌ ${url}: Cart item ${i + 1} image failed to load (src="${imageSrc}")`);
          } else {
            console.log(`✅ ${url}: Cart item ${i + 1} image OK`);
          }
        }

        // Close cart
        const closeButton = page.locator('#cart-close');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      } catch (error) {
        errors.push(`Failed to test ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart image visibility issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart images use absolute URLs for cross-page compatibility', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart image URL format: ${baseUrl}\n`);

    // Add product from homepage
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
    }

    // Check cart on different page types
    const testPages = [
      '/',
      '/blog',
      '/post/the-joy-of-cacao-circles-connections-and-community',
    ];

    for (const url of testPages) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1500);

        // Open cart
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          await mobileMenuToggle.click();
          await page.waitForTimeout(500);
        }

        await page.waitForSelector('#cart-icon', { timeout: 5000 });
        await page.locator('#cart-icon').click();
        await page.waitForTimeout(1000);

        const cartItems = page.locator('.cart-item');
        const itemCount = await cartItems.count();

        for (let i = 0; i < itemCount; i++) {
          const cartItem = cartItems.nth(i);
          const cartItemImage = cartItem.locator('.cart-item-image');
          const imageSrc = await cartItemImage.getAttribute('src');

          if (imageSrc) {
            // Image URL should be absolute (starts with http://, https://, //, or /)
            const isAbsolute = imageSrc.startsWith('http://') || 
                              imageSrc.startsWith('https://') || 
                              imageSrc.startsWith('//') ||
                              imageSrc.startsWith('/');

            if (!isAbsolute) {
              errors.push(`❌ ${url}: Cart item ${i + 1} uses relative URL "${imageSrc}" which may break on different pages`);
            } else {
              console.log(`✅ ${url}: Cart item ${i + 1} uses absolute URL`);
            }
          }
        }

        // Close cart
        const closeButton = page.locator('#cart-close');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(300);
        }
      } catch (error) {
        errors.push(`Failed to check URLs on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart image URL format issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });
});
