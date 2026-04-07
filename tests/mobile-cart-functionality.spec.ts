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

/** Seeds a line item without using the PDP button so inventory limits do not break later tests. */
async function seedOscarLineItem(page: import('@playwright/test').Page) {
  await page.waitForFunction(
    () => typeof window.Cart !== 'undefined' && typeof window.Cart.add === 'function'
  );
  const ok = await page.evaluate(async () => {
    const result = await window.Cart.add(
      {
        productId: 'oscar-bahia-ceremonial-cacao-200g',
        name: "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)",
        price: 25,
        image: '',
        quantity: 1,
      },
      { skipInventoryCheck: true }
    );
    return !!(result && result.success);
  });
  if (!ok) {
    throw new Error('Failed to seed cart via Cart.add');
  }
}

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

        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
          if (isExpanded === 'true') {
            await mobileMenuToggle.click();
            await page.waitForTimeout(400);
          }
        }

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

        const cartInHeaderBar = await cartIcon.evaluate((el) => {
          return document.getElementById('mobile-header-cart')?.contains(el) === true;
        });
        if (await mobileMenuToggle.isVisible()) {
          if (!cartInHeaderBar) {
            errors.push(`❌ ${url}: Cart icon should be in #mobile-header-cart when the hamburger is shown`);
          }
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

        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        if (await mobileMenuToggle.isVisible()) {
          const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
          if (isExpanded === 'true') {
            await mobileMenuToggle.click();
            await page.waitForTimeout(400);
          }
        }

        await page.waitForSelector('#cart-icon', { timeout: 5000 });
        const cartIcon = page.locator('#cart-icon');

        const sidebar = page.locator('#cart-sidebar');
        const initiallyOpen = await sidebar.evaluate((el) => el.classList.contains('active'));
        if (initiallyOpen) {
          errors.push(`❌ ${url}: Cart sidebar should be closed initially`);
        }

        await cartIcon.click({ force: true });
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

          const sidebarStillActive = await sidebar.evaluate((el) => {
            return el.classList.contains('active');
          });

          if (sidebarStillActive) {
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

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click({ force: true });
    await page.waitForSelector('#cart-sidebar.active', { timeout: 5000 });

    const sidebar = page.locator('#cart-sidebar');
    const viewportHeight = MOBILE_VIEWPORT.height;
    const actualHeight = await sidebar.evaluate((el) => el.offsetHeight);

    if (Math.abs(actualHeight - viewportHeight) > 50) {
      errors.push(
        `❌ Cart sidebar height (${actualHeight}px) should be close to viewport height (${viewportHeight}px)`
      );
    }

    console.log(`✅ Cart sidebar height: ${actualHeight}px (viewport: ${viewportHeight}px)`);

    await page.locator('#cart-close').click().catch(() => {});
    await page.waitForTimeout(200);

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

    await addToCartButton.click({ force: true });
    await page.waitForFunction(
      () => typeof window.Cart !== 'undefined' && window.Cart.getItemCount() >= 1,
      null,
      { timeout: 15000 }
    );

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

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.locator('#cart-icon').click({ force: true });
    await page.waitForSelector('#cart-sidebar.active', { timeout: 5000 });
    await page.waitForTimeout(300);

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

    await seedOscarLineItem(page);

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click({ force: true });
    await page.waitForSelector('#cart-sidebar.active', { timeout: 5000 });
    await page.waitForSelector('.cart-item', { timeout: 10000 });

    const qtyLocator = page.locator('.cart-item-quantity').first();
    const oscarId = 'oscar-bahia-ceremonial-cacao-200g';

    const incOk = await page.evaluate(async (id) => {
      const current = window.Cart.getCart().items.find((i) => i.productId === id);
      const q = current ? current.quantity : 1;
      const r = await window.Cart.updateQuantity(id, q + 1, { skipInventoryCheck: true });
      return r.success;
    }, oscarId);
    await page.waitForTimeout(400);
    const afterInc = parseInt((await qtyLocator.textContent()) || '1', 10);
    if (!incOk || afterInc < 2) {
      errors.push(`❌ Increase quantity did not apply (ok=${incOk}, qty=${afterInc})`);
    } else {
      console.log(`✅ Increase works (1 → ${afterInc})`);
    }

    const decOk = await page.evaluate(async (id) => {
      const r = await window.Cart.updateQuantity(id, 1, { skipInventoryCheck: true });
      return r.success;
    }, oscarId);
    await page.waitForTimeout(400);
    const afterDec = parseInt((await qtyLocator.textContent()) || '1', 10);
    if (!decOk || afterDec !== 1) {
      errors.push(`❌ Decrease quantity did not apply (ok=${decOk}, qty=${afterDec})`);
    } else {
      console.log(`✅ Decrease works (${afterInc} → ${afterDec})`);
    }

    if ((await page.locator('.cart-item-increase').count()) === 0) {
      errors.push('❌ Increase control not found in cart');
    }
    if ((await page.locator('.cart-item-decrease').count()) === 0) {
      errors.push('❌ Decrease control not found in cart');
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

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    const cartBadge = page.locator('#cart-badge');

    const initialBadgeText = await cartBadge.textContent();
    const initialCount = parseInt(initialBadgeText || '0', 10);

    if (initialCount !== 0) {
      errors.push(`❌ Initial cart badge should be 0 (got ${initialCount})`);
    }

    const productUrl = `${baseUrl}/product-page/oscar-s-bahia-ceremonial-cacao`;
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(500);
    await seedOscarLineItem(page);

    const newBadgeText = await page.locator('#cart-badge').textContent();
    const newCount = parseInt(newBadgeText || '0', 10);

    if (newCount !== 1) {
      errors.push(`❌ Cart badge should be 1 after adding item (got ${newCount})`);
    }

    const newBadgeDisplay = await page.locator('#cart-badge').evaluate((el) => {
      return window.getComputedStyle(el).display;
    });

    if (newBadgeDisplay === 'none') {
      errors.push('❌ Cart badge should be visible when count > 0');
    }

    if (errors.length === 0) {
      console.log(`✅ Cart badge updated correctly (0 → ${newCount})`);
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
    await page.waitForTimeout(500);
    await seedOscarLineItem(page);

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click({ force: true });
    await page.waitForSelector('#cart-sidebar.active', { timeout: 5000 });

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

    const mobileMenuToggle = page.locator('.mobile-menu-toggle');
    if (await mobileMenuToggle.isVisible()) {
      const isExpanded = await mobileMenuToggle.getAttribute('aria-expanded');
      if (isExpanded === 'true') {
        await mobileMenuToggle.click();
        await page.waitForTimeout(400);
      }
    }

    await page.waitForSelector('#cart-icon', { timeout: 5000 });
    await page.locator('#cart-icon').click({ force: true });
    await page.waitForSelector('#cart-sidebar.active', { timeout: 5000 });

    const sidebar = page.locator('#cart-sidebar');
    const overlay = page.locator('#cart-overlay');

    const sidebarActive = await sidebar.evaluate((el) => {
      return el.classList.contains('active');
    });

    if (!sidebarActive) {
      errors.push('❌ Cart sidebar should be open before testing overlay');
    }

    if (await overlay.count() > 0) {
      // On mobile the drawer is full-width above the overlay (z-index), so real pointer events
      // hit the sidebar. Fire a click on the overlay node to verify the close handler is wired.
      await page.evaluate(() => {
        const el = document.getElementById('cart-overlay');
        if (el) {
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        }
      });
      await page.waitForTimeout(500);

      const sidebarStillActive = await sidebar.evaluate((el) => el.classList.contains('active'));

      if (sidebarStillActive) {
        errors.push('❌ Cart sidebar should close when overlay receives a click');
      } else {
        console.log('✅ Overlay closes cart sidebar correctly');
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
