import { test, expect } from '@playwright/test';

/**
 * Mobile Cart Functionality Tests
 * 
 * Ensures cart works correctly in mobile view:
 * - Cart icon is visible and accessible
 * - Cart sidebar opens and closes properly
 * - Adding items to cart works
 * - Cart operations (increase/decrease/remove) work
 * - Cart badge updates correctly
 * - Checkout button is functional
 */

const MOBILE_VIEWPORT = { width: 375, height: 667 };

const TEST_PAGES = [
  '/',
  '/product-page/oscar-s-bahia-ceremonial-cacao',
  '/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
  '/category/retail-packs',
];

test.describe('Mobile Cart Functionality', () => {
  
  test.beforeEach(async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    // Set mobile viewport
    await page.setViewportSize(MOBILE_VIEWPORT);
    // Clear cart before each test
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      if (window.Cart) {
        window.Cart.clear();
      }
    });
  });

  test('Cart icon is visible and accessible in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart icon visibility in mobile view: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Open mobile menu if needed to see cart icon
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await mobileMenuToggle.click();
            await page.waitForTimeout(500);
          }
        }

        // Wait for cart icon
        await page.waitForSelector('#cart-icon', { timeout: 5000 });

        const cartIcon = page.locator('#cart-icon');
        const isVisible = await cartIcon.isVisible();
        const isEnabled = await cartIcon.isEnabled();

        if (!isVisible) {
          errors.push(`❌ ${url}: Cart icon is not visible in mobile view`);
        }
        if (!isEnabled) {
          errors.push(`❌ ${url}: Cart icon is not enabled/clickable`);
        }

        // Check cart icon is in mobile menu
        const cartIconInMobileMenu = await cartIcon.evaluate((el) => {
          const mobileMenu = el.closest('.nav-links.mobile-menu, .mobile-menu');
          return mobileMenu !== null;
        });

        if (!cartIconInMobileMenu) {
          errors.push(`❌ ${url}: Cart icon should be in mobile menu`);
        }

        // Check cart icon has proper styling for mobile
        const styles = await cartIcon.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            width: computed.width,
            height: computed.height,
            display: computed.display,
          };
        });

        // Cart icon should be visible and properly sized
        if (styles.display === 'none') {
          errors.push(`❌ ${url}: Cart icon has display: none`);
        }

        console.log(`✅ ${url}: Cart icon is visible and accessible`);
      } catch (error) {
        errors.push(`Failed to check cart icon on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart icon visibility issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart sidebar opens and closes correctly in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart sidebar open/close in mobile view: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Open mobile menu if needed
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
          if (isExpanded !== 'true') {
            await mobileMenuToggle.click();
            await page.waitForTimeout(500);
          }
        }

        // Wait for cart icon
        await page.waitForSelector('#cart-icon', { timeout: 5000 });
        const cartIcon = page.locator('#cart-icon');

        // Check sidebar is initially closed
        const sidebar = page.locator('#cart-sidebar');
        const initialVisible = await sidebar.isVisible();
        if (initialVisible) {
          errors.push(`❌ ${url}: Cart sidebar should be closed initially`);
        }

        // Click cart icon to open sidebar
        await cartIcon.click();
        await page.waitForTimeout(500);

        // Check sidebar is now visible
        const afterOpenVisible = await sidebar.isVisible();
        const sidebarHasActiveClass = await sidebar.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (!afterOpenVisible && !sidebarHasActiveClass) {
          errors.push(`❌ ${url}: Cart sidebar should open when cart icon is clicked`);
        }

        // Check body overflow is hidden (prevents scrolling when sidebar is open)
        const bodyOverflow = await page.evaluate(() => {
          return window.getComputedStyle(document.body).overflow;
        });
        if (bodyOverflow !== 'hidden') {
          console.log(`⚠️  ${url}: Body overflow is not hidden (may be intentional)`);
        }

        // Check overlay is visible
        const overlay = page.locator('#cart-overlay');
        const overlayVisible = await overlay.isVisible();
        const overlayHasActiveClass = await overlay.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (!overlayVisible && !overlayHasActiveClass) {
          errors.push(`❌ ${url}: Cart overlay should be visible when sidebar is open`);
        }

        // Close sidebar using close button
        const closeButton = page.locator('#cart-close');
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);

          const afterCloseVisible = await sidebar.isVisible();
          const sidebarStillActive = await sidebar.evaluate((el) => {
            return el.classList.contains('active');
          });

          if (afterCloseVisible || sidebarStillActive) {
            errors.push(`❌ ${url}: Cart sidebar should close when close button is clicked`);
          }

          // Check body overflow is restored
          const bodyOverflowAfterClose = await page.evaluate(() => {
            return window.getComputedStyle(document.body).overflow;
          });
          if (bodyOverflowAfterClose === 'hidden') {
            errors.push(`❌ ${url}: Body overflow should be restored after closing sidebar`);
          }
        } else {
          errors.push(`❌ ${url}: Cart close button not found`);
        }

        console.log(`✅ ${url}: Cart sidebar opens and closes correctly`);
      } catch (error) {
        errors.push(`Failed to test cart sidebar on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart sidebar functionality issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart sidebar has correct mobile viewport height', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart sidebar viewport height in mobile: ${baseUrl}\n`);

    const testUrl = `${baseUrl}/`;
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Open mobile menu
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    // Open cart sidebar
    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(500);

    const sidebar = page.locator('#cart-sidebar');
    const sidebarHeight = await sidebar.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        height: computed.height,
        maxHeight: computed.maxHeight,
        actualHeight: el.offsetHeight,
      };
    });

    const viewportHeight = MOBILE_VIEWPORT.height;
    const actualHeight = await sidebar.evaluate((el) => el.offsetHeight);

    // Sidebar should use full viewport height or close to it
    // Allow some tolerance (within 50px of viewport height)
    if (Math.abs(actualHeight - viewportHeight) > 50) {
      errors.push(
        `❌ Cart sidebar height (${actualHeight}px) should be close to viewport height (${viewportHeight}px)`
      );
    }

    console.log(`✅ Cart sidebar height: ${actualHeight}px (viewport: ${viewportHeight}px)`);

    if (errors.length > 0) {
      console.error('\n❌ Cart sidebar viewport height issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Adding items to cart works in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing add to cart functionality in mobile view: ${baseUrl}\n`);

    // Test on a product page
    const productUrl = `${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Wait for page to fully load

    // Find add to cart button
    const addToCartButton = page.locator('.add-to-cart-btn').first();
    const buttonExists = await addToCartButton.count() > 0;

    if (!buttonExists) {
      errors.push('❌ Add to cart button not found on product page');
      expect(errors.length).toBe(0);
      return;
    }

    // Check button is visible and enabled
    const isVisible = await addToCartButton.isVisible();
    const isEnabled = await addToCartButton.isEnabled();

    if (!isVisible) {
      errors.push('❌ Add to cart button is not visible');
    }
    if (!isEnabled) {
      errors.push('❌ Add to cart button is not enabled');
    }

    // Get initial cart count
    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    const initialBadgeText = await page.locator('#cart-badge').textContent();
    const initialCount = parseInt(initialBadgeText || '0', 10);

    // Click add to cart button
    await addToCartButton.click();
    await page.waitForTimeout(2000); // Wait for cart to update

    // Check cart badge updated
    const newBadgeText = await page.locator('#cart-badge').textContent();
    const newCount = parseInt(newBadgeText || '0', 10);

    if (newCount <= initialCount) {
      errors.push(`❌ Cart badge did not update (was ${initialCount}, now ${newCount})`);
    }

    // Check cart has item
    const cartItemCount = await page.evaluate(() => {
      if (window.Cart) {
        return window.Cart.getItemCount();
      }
      return 0;
    });

    if (cartItemCount <= 0) {
      errors.push(`❌ Cart should have items after adding (count: ${cartItemCount})`);
    }

    // Open cart sidebar and verify item is displayed
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded !== 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(500);
      }
    }

    await page.locator('#cart-icon').click();
    await page.waitForTimeout(500);

    const cartItems = page.locator('.cart-item');
    const itemCount = await cartItems.count();

    if (itemCount === 0) {
      errors.push('❌ Cart sidebar should show items after adding to cart');
    }

    // Check cart is not empty message is gone
    const emptyMessage = page.locator('.cart-empty');
    const emptyMessageVisible = await emptyMessage.isVisible();
    if (emptyMessageVisible) {
      errors.push('❌ Cart empty message should not be visible when cart has items');
    }

    console.log(`✅ Added item to cart successfully (cart count: ${cartItemCount})`);

    if (errors.length > 0) {
      console.error('\n❌ Add to cart functionality issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart operations (increase/decrease/remove) work in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart operations in mobile view: ${baseUrl}\n`);

    // First, add an item to cart
    const productUrl = `${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
    }

    // Open mobile menu and cart sidebar
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);

    // Test increase quantity
    const increaseButton = page.locator('.cart-item-increase').first();
    if (await increaseButton.count() > 0) {
      const initialQuantity = await page.locator('.cart-item-quantity').first().textContent();
      const initialQty = parseInt(initialQuantity || '1', 10);

      await increaseButton.click();
      await page.waitForTimeout(1000);

      const newQuantity = await page.locator('.cart-item-quantity').first().textContent();
      const newQty = parseInt(newQuantity || '1', 10);

      if (newQty <= initialQty) {
        errors.push(`❌ Increase button did not work (was ${initialQty}, now ${newQty})`);
      } else {
        console.log(`✅ Increase button works (${initialQty} → ${newQty})`);
      }
    } else {
      errors.push('❌ Increase button not found in cart');
    }

    // Test decrease quantity
    const decreaseButton = page.locator('.cart-item-decrease').first();
    if (await decreaseButton.count() > 0) {
      const beforeDecreaseQty = await page.locator('.cart-item-quantity').first().textContent();
      const beforeQty = parseInt(beforeDecreaseQty || '1', 10);

      await decreaseButton.click();
      await page.waitForTimeout(1000);

      const afterDecreaseQty = await page.locator('.cart-item-quantity').first().textContent();
      const afterQty = parseInt(afterDecreaseQty || '1', 10);

      if (afterQty >= beforeQty) {
        errors.push(`❌ Decrease button did not work (was ${beforeQty}, now ${afterQty})`);
      } else {
        console.log(`✅ Decrease button works (${beforeQty} → ${afterQty})`);
      }
    } else {
      errors.push('❌ Decrease button not found in cart');
    }

    // Test remove item
    const removeButton = page.locator('.cart-item-remove').first();
    if (await removeButton.count() > 0) {
      await removeButton.click();
      await page.waitForTimeout(1000);

      // Check cart is now empty
      const emptyMessage = page.locator('.cart-empty');
      const emptyMessageVisible = await emptyMessage.isVisible();

      if (!emptyMessageVisible) {
        errors.push('❌ Remove button did not remove item from cart');
      } else {
        console.log('✅ Remove button works');
      }

      // Check cart badge is updated
      const badgeText = await page.locator('#cart-badge').textContent();
      const badgeCount = parseInt(badgeText || '0', 10);
      if (badgeCount !== 0) {
        errors.push(`❌ Cart badge should be 0 after removing item (got ${badgeCount})`);
      }
    } else {
      errors.push('❌ Remove button not found in cart');
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart operations issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart badge updates correctly in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart badge updates in mobile view: ${baseUrl}\n`);

    // Clear cart first
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      if (window.Cart) {
        window.Cart.clear();
      }
    });
    await page.waitForTimeout(500);

    // Open mobile menu
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    const cartBadge = page.locator('#cart-badge');

    // Check initial badge (should be 0 or hidden)
    const initialBadgeDisplay = await cartBadge.evaluate((el) => {
      return window.getComputedStyle(el).display;
    });
    const initialBadgeText = await cartBadge.textContent();
    const initialCount = parseInt(initialBadgeText || '0', 10);

    if (initialCount !== 0) {
      errors.push(`❌ Initial cart badge should be 0 (got ${initialCount})`);
    }

    // Add item to cart
    const productUrl = `${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);

      // Check badge updated
      const newBadgeText = await cartBadge.textContent();
      const newCount = parseInt(newBadgeText || '0', 10);

      if (newCount !== 1) {
        errors.push(`❌ Cart badge should be 1 after adding item (got ${newCount})`);
      }

      const newBadgeDisplay = await cartBadge.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });

      if (newBadgeDisplay === 'none') {
        errors.push('❌ Cart badge should be visible when count > 0');
      }

      console.log(`✅ Cart badge updated correctly (0 → ${newCount})`);
    } else {
      errors.push('❌ Add to cart button not found');
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart badge update issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Checkout button is functional in mobile cart sidebar', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing checkout button in mobile view: ${baseUrl}\n`);

    // Add item to cart first
    const productUrl = `${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    const addToCartButton = page.locator('.add-to-cart-btn').first();
    if (await addToCartButton.count() > 0) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
    }

    // Open mobile menu and cart sidebar
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(1000);

    // Check checkout button exists and is visible
    const checkoutButton = page.locator('#cart-checkout-btn');
    const buttonExists = await checkoutButton.count() > 0;
    const buttonVisible = buttonExists ? await checkoutButton.isVisible() : false;

    if (!buttonExists) {
      errors.push('❌ Checkout button not found in cart sidebar');
    } else if (!buttonVisible) {
      errors.push('❌ Checkout button is not visible');
    } else {
      // Check button is enabled
      const isEnabled = await checkoutButton.isEnabled();
      if (!isEnabled) {
        errors.push('❌ Checkout button is not enabled');
      }

      // Check button has correct href
      const href = await checkoutButton.getAttribute('href');
      if (!href || !href.includes('checkout')) {
        errors.push(`❌ Checkout button href is incorrect: ${href}`);
      }

      console.log(`✅ Checkout button is functional (href: ${href})`);
    }

    // Test that checkout button is hidden when cart is empty
    const removeButton = page.locator('.cart-item-remove').first();
    if (await removeButton.count() > 0) {
      await removeButton.click();
      await page.waitForTimeout(1000);

      const checkoutButtonAfterEmpty = page.locator('#cart-checkout-btn');
      const checkoutDisplay = await checkoutButtonAfterEmpty.evaluate((el) => {
        return window.getComputedStyle(el).display;
      });

      if (checkoutDisplay !== 'none') {
        console.log(`⚠️  Checkout button display: ${checkoutDisplay} (may be intentional)`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Checkout button issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart overlay closes sidebar when clicked in mobile view', async ({ page, baseURL }) => {
    const baseUrl = baseURL || 'http://localhost:8000';
    const errors: string[] = [];

    console.log(`\n🛒 Testing cart overlay functionality in mobile view: ${baseUrl}\n`);

    const testUrl = `${baseUrl}/`;
    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Open mobile menu
    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      await mobileMenuToggle.click();
      await page.waitForTimeout(500);
    }

    // Open cart sidebar
    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click();
    await page.waitForTimeout(500);

    const sidebar = page.locator('#cart-sidebar');
    const overlay = page.locator('#cart-overlay');

    // Verify sidebar is open
    const sidebarActive = await sidebar.evaluate((el) => {
      return el.classList.contains('active');
    });

    if (!sidebarActive) {
      errors.push('❌ Cart sidebar should be open before testing overlay');
    }

    // Click overlay to close sidebar
    if (await overlay.count() > 0) {
      // Click in the center of the overlay
      const overlayBox = await overlay.boundingBox();
      if (overlayBox) {
        await overlay.click({ position: { x: overlayBox.width / 2, y: overlayBox.height / 2 } });
        await page.waitForTimeout(500);

        const sidebarStillActive = await sidebar.evaluate((el) => {
          return el.classList.contains('active');
        });

        if (sidebarStillActive) {
          errors.push('❌ Cart sidebar should close when overlay is clicked');
        } else {
          console.log('✅ Overlay closes cart sidebar correctly');
        }
      } else {
        errors.push('❌ Could not get overlay bounding box');
      }
    } else {
      errors.push('❌ Cart overlay not found');
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart overlay functionality issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });
});
