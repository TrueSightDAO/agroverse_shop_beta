import { test, expect } from '@playwright/test';

/**
 * Cart Functionality Tests
 * 
 * Comprehensive tests for cart operations:
 * - Add new item to cart (from landing page and product detail page)
 * - Remove existing item from cart
 * - Increase quantity of existing item
 * - Decrease quantity of existing item
 * - Remove item entirely from cart
 * 
 * Tests target products with high inventory to avoid failures due to stock changes.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:8000';

// Products that typically have high inventory - use these for testing
const HIGH_INVENTORY_PRODUCTS = [
  {
    id: 'oscar-s-bahia-ceremonial-cacao',
    name: "Oscar's Bahia Ceremonial Cacao",
    url: '/product-page/oscar-s-bahia-ceremonial-cacao',
  },
  {
    id: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
    name: "Ceremonial Cacao - Paulo's La do Sitio Farm",
    url: '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  },
];

test.describe('Cart Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear cart before each test
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      if (window.Cart) {
        window.Cart.clear();
      }
    });
    await page.waitForTimeout(500);
  });

  test('Add new item to cart from landing page', async ({ page }) => {
    console.log(`\n🛒 Testing: Add item to cart from landing page\n`);

    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find first add to cart button on landing page
    const addToCartButtons = page.locator('.add-to-cart-btn');
    const buttonCount = await addToCartButtons.count();

    if (buttonCount === 0) {
      throw new Error('No add to cart buttons found on landing page');
    }

    // Get product info before adding
    const firstButton = addToCartButtons.first();
    const productId = await firstButton.getAttribute('data-product-id');
    const productName = await firstButton.getAttribute('data-product-name') || 'Unknown Product';

    console.log(`   Adding product: ${productName} (${productId})`);

    // Get initial cart count
    const initialCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });

    // Click add to cart
    await firstButton.click();
    await page.waitForTimeout(2000);

    // Verify cart count increased
    const newCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });

    expect(newCount).toBe(initialCount + 1);
    console.log(`   ✅ Cart count: ${initialCount} → ${newCount}`);

    // Verify item is in cart
    const cart = await page.evaluate(() => {
      return window.Cart ? window.Cart.getCart() : { items: [] };
    });

    const itemInCart = cart.items.find((item: any) => item.productId === productId);
    expect(itemInCart).toBeTruthy();
    expect(itemInCart?.quantity).toBe(1);
    console.log(`   ✅ Item added to cart successfully`);
  });

  test('Add new item to cart from product detail page', async ({ page }) => {
    console.log(`\n🛒 Testing: Add item to cart from product detail page\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Find add to cart button
    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const buttonExists = await addToCartButton.count() > 0;

    if (!buttonExists) {
      throw new Error(`Add to cart button not found on ${product.url}`);
    }

    const productId = await addToCartButton.getAttribute('data-product-id');
    console.log(`   Adding product: ${product.name} (${productId})`);

    // Get initial cart count
    const initialCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });

    // Click add to cart
    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Verify cart count increased
    const newCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });

    expect(newCount).toBe(initialCount + 1);
    console.log(`   ✅ Cart count: ${initialCount} → ${newCount}`);

    // Verify item is in cart
    const cart = await page.evaluate(() => {
      return window.Cart ? window.Cart.getCart() : { items: [] };
    });

    const itemInCart = cart.items.find((item: any) => item.productId === productId);
    expect(itemInCart).toBeTruthy();
    expect(itemInCart?.quantity).toBe(1);
    console.log(`   ✅ Item added to cart successfully`);
  });

  test('Increase quantity of existing item in cart', async ({ page }) => {
    console.log(`\n🛒 Testing: Increase quantity of existing item\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    
    // First, add item to cart
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const productId = await addToCartButton.getAttribute('data-product-id');

    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Open cart sidebar
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);

    // Get initial quantity
    const initialQuantity = await page.evaluate(() => {
      const cart = window.Cart ? window.Cart.getCart() : { items: [] };
      const item = cart.items[0];
      return item ? item.quantity : 0;
    });

    expect(initialQuantity).toBe(1);
    console.log(`   Initial quantity: ${initialQuantity}`);

    // Click increase button
    const increaseButton = page.locator('.cart-item-increase').first();
    const increaseExists = await increaseButton.count() > 0;

    if (!increaseExists) {
      throw new Error('Increase button not found in cart');
    }

    await increaseButton.click();
    await page.waitForTimeout(2000);

    // Verify quantity increased
    const newQuantity = await page.evaluate(() => {
      const cart = window.Cart ? window.Cart.getCart() : { items: [] };
      const item = cart.items[0];
      return item ? item.quantity : 0;
    });

    expect(newQuantity).toBe(initialQuantity + 1);
    console.log(`   ✅ Quantity increased: ${initialQuantity} → ${newQuantity}`);

    // Verify UI updated
    const quantityDisplay = page.locator('.cart-item-quantity').first();
    const displayedQuantity = await quantityDisplay.textContent();
    expect(parseInt(displayedQuantity || '0', 10)).toBe(newQuantity);
    console.log(`   ✅ UI updated correctly`);
  });

  test('Decrease quantity of existing item in cart', async ({ page }) => {
    console.log(`\n🛒 Testing: Decrease quantity of existing item\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    
    // First, add 2 items to cart
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const productId = await addToCartButton.getAttribute('data-product-id');

    // Add item twice
    await addToCartButton.click();
    await page.waitForTimeout(1000);
    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Open cart sidebar
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);

    // Verify we have 2 items
    const initialQuantity = await page.evaluate(() => {
      const cart = window.Cart ? window.Cart.getCart() : { items: [] };
      const item = cart.items[0];
      return item ? item.quantity : 0;
    });

    expect(initialQuantity).toBeGreaterThanOrEqual(2);
    console.log(`   Initial quantity: ${initialQuantity}`);

    // Click decrease button
    const decreaseButton = page.locator('.cart-item-decrease').first();
    await decreaseButton.click();
    await page.waitForTimeout(2000);

    // Verify quantity decreased
    const newQuantity = await page.evaluate(() => {
      const cart = window.Cart ? window.Cart.getCart() : { items: [] };
      const item = cart.items[0];
      return item ? item.quantity : 0;
    });

    expect(newQuantity).toBe(initialQuantity - 1);
    console.log(`   ✅ Quantity decreased: ${initialQuantity} → ${newQuantity}`);

    // Verify UI updated
    const quantityDisplay = page.locator('.cart-item-quantity').first();
    const displayedQuantity = await quantityDisplay.textContent();
    expect(parseInt(displayedQuantity || '0', 10)).toBe(newQuantity);
    console.log(`   ✅ UI updated correctly`);
  });

  test('Remove item entirely from cart', async ({ page }) => {
    console.log(`\n🛒 Testing: Remove item entirely from cart\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    
    // First, add item to cart
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const productId = await addToCartButton.getAttribute('data-product-id');

    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Verify item is in cart
    const initialCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });
    expect(initialCount).toBeGreaterThan(0);
    console.log(`   Initial cart count: ${initialCount}`);

    // Open cart sidebar
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);

    // Click remove button
    const removeButton = page.locator('.cart-item-remove').first();
    const removeExists = await removeButton.count() > 0;

    if (!removeExists) {
      throw new Error('Remove button not found in cart');
    }

    await removeButton.click();
    await page.waitForTimeout(2000);

    // Verify item removed from cart
    const newCount = await page.evaluate(() => {
      return window.Cart ? window.Cart.getItemCount() : 0;
    });

    expect(newCount).toBe(initialCount - 1);
    console.log(`   ✅ Cart count: ${initialCount} → ${newCount}`);

    // Verify cart is empty or item is gone
    const cart = await page.evaluate(() => {
      return window.Cart ? window.Cart.getCart() : { items: [] };
    });

    const itemStillInCart = cart.items.find((item: any) => item.productId === productId);
    expect(itemStillInCart).toBeFalsy();
    console.log(`   ✅ Item removed from cart`);

    // Verify empty message appears if cart is empty
    if (newCount === 0) {
      const emptyMessage = page.locator('.cart-empty');
      const emptyVisible = await emptyMessage.isVisible();
      expect(emptyVisible).toBe(true);
      console.log(`   ✅ Empty cart message displayed`);
    }
  });

  test('Add multiple different items to cart', async ({ page }) => {
    console.log(`\n🛒 Testing: Add multiple different items to cart\n`);

    const products = HIGH_INVENTORY_PRODUCTS.slice(0, 2);
    const addedProducts: string[] = [];

    // Add each product
    for (const product of products) {
      await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      const addToCartButton = page.locator('.add-to-cart-btn').first();
      const buttonExists = await addToCartButton.count() > 0;

      if (buttonExists) {
        const productId = await addToCartButton.getAttribute('data-product-id');
        await addToCartButton.click();
        await page.waitForTimeout(2000);
        addedProducts.push(productId || '');
        console.log(`   Added: ${product.name}`);
      }
    }

    // Verify all items are in cart
    const cart = await page.evaluate(() => {
      return window.Cart ? window.Cart.getCart() : { items: [] };
    });

    expect(cart.items.length).toBe(addedProducts.length);
    console.log(`   ✅ Cart contains ${cart.items.length} different items`);

    // Verify each product is in cart
    for (const productId of addedProducts) {
      const itemInCart = cart.items.find((item: any) => item.productId === productId);
      expect(itemInCart).toBeTruthy();
      expect(itemInCart?.quantity).toBe(1);
    }
    console.log(`   ✅ All items verified in cart`);
  });

  test('Cart operations work from different pages', async ({ page }) => {
    console.log(`\n🛒 Testing: Cart operations from different pages\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    
    // Add item from product page
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const productId = await addToCartButton.getAttribute('data-product-id');

    await addToCartButton.click();
    await page.waitForTimeout(2000);

    // Test cart operations from different pages
    const testPages = [
      '/',
      '/blog',
      '/post/the-joy-of-cacao-circles-connections-and-community',
    ];

    for (const testPage of testPages) {
      console.log(`   Testing on: ${testPage}`);
      
      await page.goto(`${BASE_URL}${testPage}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

      // Verify item is visible in cart
      const cartItems = page.locator('.cart-item');
      const itemCount = await cartItems.count();
      expect(itemCount).toBeGreaterThan(0);

      // Verify item image is visible
      const cartItemImage = cartItems.first().locator('.cart-item-image');
      const imageSrc = await cartItemImage.getAttribute('src');
      const isVisible = await cartItemImage.isVisible();
      
      expect(imageSrc).toBeTruthy();
      expect(isVisible).toBe(true);
      console.log(`     ✅ Cart item visible with image on ${testPage}`);

      // Close cart
      const closeButton = page.locator('#cart-close');
      if (await closeButton.count() > 0) {
        await closeButton.click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('Cart badge updates correctly with all operations', async ({ page }) => {
    console.log(`\n🛒 Testing: Cart badge updates\n`);

    const product = HIGH_INVENTORY_PRODUCTS[0];
    
    await page.goto(`${BASE_URL}${product.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Open mobile menu to see badge
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    const cartBadge = page.locator('#cart-badge');

    // Initial badge should be 0 or hidden
    const initialBadgeText = await cartBadge.textContent();
    const initialBadge = parseInt(initialBadgeText || '0', 10);
    console.log(`   Initial badge: ${initialBadge}`);

    // Add item
    const addToCartButton = page.locator('.add-to-cart-btn').first();
    await addToCartButton.click();
    await page.waitForTimeout(2000);

    const badgeAfterAdd = parseInt(await cartBadge.textContent() || '0', 10);
    expect(badgeAfterAdd).toBe(initialBadge + 1);
    console.log(`   ✅ Badge after add: ${badgeAfterAdd}`);

    // Increase quantity
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);
    await page.locator('.cart-item-increase').first().click();
    await page.waitForTimeout(2000);

    const badgeAfterIncrease = parseInt(await cartBadge.textContent() || '0', 10);
    expect(badgeAfterIncrease).toBe(badgeAfterAdd + 1);
    console.log(`   ✅ Badge after increase: ${badgeAfterIncrease}`);

    // Decrease quantity
    await page.locator('.cart-item-decrease').first().click();
    await page.waitForTimeout(2000);

    const badgeAfterDecrease = parseInt(await cartBadge.textContent() || '0', 10);
    expect(badgeAfterDecrease).toBe(badgeAfterIncrease - 1);
    console.log(`   ✅ Badge after decrease: ${badgeAfterDecrease}`);

    // Remove item
    await page.locator('.cart-item-remove').first().click();
    await page.waitForTimeout(2000);

    const badgeAfterRemove = parseInt(await cartBadge.textContent() || '0', 10);
    expect(badgeAfterRemove).toBe(0);
    console.log(`   ✅ Badge after remove: ${badgeAfterRemove}`);
  });
});
