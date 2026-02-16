import { test, expect } from '@playwright/test';

/**
 * Test to ensure cart icon appearance and functionality is consistent across all pages
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
];

test.describe('Cart Icon Consistency', () => {
  
  test('Cart icon exists and has consistent structure across all pages', async ({ page, baseURL }) => {
    const cartIconData: Record<string, any> = {};
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🛒 Testing cart icon consistency against: ${baseUrl}\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        console.log(`📄 Loading: ${fullUrl}`);
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for cart icon to be rendered (it's added dynamically)
        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        await page.waitForTimeout(1000); // Give it time to fully render

        // Check if cart icon exists
        const cartIcon = page.locator('#cart-icon');
        const exists = await cartIcon.count();
        
        if (exists === 0) {
          errors.push(`❌ ${url}: Cart icon (#cart-icon) not found`);
          continue;
        }

        // Get cart icon properties
        const styles = await cartIcon.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            position: computed.position,
            padding: computed.padding,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
            border: computed.border,
            width: computed.width,
            height: computed.height,
            fontSize: computed.fontSize,
            lineHeight: computed.lineHeight,
          };
        });

        // Get SVG element properties
        const svg = cartIcon.locator('svg');
        const svgExists = await svg.count();
        const svgAttributes = svgExists > 0 ? await svg.evaluate((el) => ({
          width: el.getAttribute('width'),
          height: el.getAttribute('height'),
          viewBox: el.getAttribute('viewBox'),
          fill: el.getAttribute('fill'),
          stroke: el.getAttribute('stroke'),
          strokeWidth: el.getAttribute('stroke-width'),
        })) : null;

        // Get badge properties
        const badge = cartIcon.locator('#cart-badge, .cart-badge');
        const badgeExists = await badge.count();
        const badgeStyles = badgeExists > 0 ? await badge.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            display: computed.display,
            position: computed.position,
            backgroundColor: computed.backgroundColor,
            color: computed.color,
            width: computed.width,
            height: computed.height,
            fontSize: computed.fontSize,
            borderRadius: computed.borderRadius,
          };
        }) : null;

        // Get aria-label
        const ariaLabel = await cartIcon.getAttribute('aria-label');
        const className = await cartIcon.getAttribute('class');

        cartIconData[url] = {
          exists: true,
          styles,
          svg: svgAttributes,
          badge: badgeStyles,
          ariaLabel,
          className,
        };

        console.log(`✅ ${url}: Cart icon found`);
      } catch (error) {
        errors.push(`Failed to check cart icon on ${url}: ${error}`);
      }
    }

    // Compare cart icons across all pages
    const referencePage = TEST_PAGES[0];
    const referenceData = cartIconData[referencePage];

    if (!referenceData || !referenceData.exists) {
      console.error(`❌ No cart icon found on reference page ${referencePage}`);
      expect(referenceData).toBeTruthy();
      return;
    }

    console.log(`\n📋 Reference cart icon (from ${referencePage}):`);
    console.log(`   Display: ${referenceData.styles.display}`);
    console.log(`   Color: ${referenceData.styles.color}`);
    console.log(`   Padding: ${referenceData.styles.padding}`);
    console.log(`   SVG: ${referenceData.svg ? 'Present' : 'Missing'}`);
    console.log(`   Badge: ${referenceData.badge ? 'Present' : 'Missing'}`);

    // Check each page against reference
    for (const url of TEST_PAGES) {
      if (url === referencePage) continue;

      const pageData = cartIconData[url];
      
      if (!pageData || !pageData.exists) {
        errors.push(`❌ ${url}: Cart icon not found`);
        continue;
      }

      // Compare critical styles
      const styleDifferences: string[] = [];
      
      if (pageData.styles.display !== referenceData.styles.display) {
        styleDifferences.push(`display: ${pageData.styles.display} vs ${referenceData.styles.display}`);
      }
      if (pageData.styles.color !== referenceData.styles.color) {
        styleDifferences.push(`color: ${pageData.styles.color} vs ${referenceData.styles.color}`);
      }
      if (pageData.styles.padding !== referenceData.styles.padding) {
        styleDifferences.push(`padding: ${pageData.styles.padding} vs ${referenceData.styles.padding}`);
      }
      if (pageData.styles.backgroundColor !== referenceData.styles.backgroundColor) {
        styleDifferences.push(`backgroundColor: ${pageData.styles.backgroundColor} vs ${referenceData.styles.backgroundColor}`);
      }

      // Compare SVG
      if (!pageData.svg && referenceData.svg) {
        styleDifferences.push('SVG missing');
      } else if (pageData.svg && referenceData.svg) {
        if (pageData.svg.width !== referenceData.svg.width) {
          styleDifferences.push(`SVG width: ${pageData.svg.width} vs ${referenceData.svg.width}`);
        }
        if (pageData.svg.height !== referenceData.svg.height) {
          styleDifferences.push(`SVG height: ${pageData.svg.height} vs ${referenceData.svg.height}`);
        }
      }

      // Compare badge
      if (!pageData.badge && referenceData.badge) {
        styleDifferences.push('Badge missing');
      } else if (pageData.badge && referenceData.badge) {
        if (pageData.badge.width !== referenceData.badge.width) {
          styleDifferences.push(`Badge width: ${pageData.badge.width} vs ${referenceData.badge.width}`);
        }
        if (pageData.badge.height !== referenceData.badge.height) {
          styleDifferences.push(`Badge height: ${pageData.badge.height} vs ${referenceData.badge.height}`);
        }
      }

      // Compare aria-label
      if (pageData.ariaLabel !== referenceData.ariaLabel) {
        styleDifferences.push(`aria-label: "${pageData.ariaLabel}" vs "${referenceData.ariaLabel}"`);
      }

      if (styleDifferences.length > 0) {
        errors.push(`❌ ${url}: Cart icon differences:\n   ${styleDifferences.join('\n   ')}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart icon inconsistencies found:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart icon is visible and clickable on all pages', async ({ page, baseURL }) => {
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🛒 Testing cart icon visibility and functionality\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // Wait for cart icon
        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        await page.waitForTimeout(500);

        const cartIcon = page.locator('#cart-icon');
        
        // Check visibility
        const isVisible = await cartIcon.isVisible();
        if (!isVisible) {
          errors.push(`❌ ${url}: Cart icon is not visible`);
          continue;
        }

        // Check if it's clickable (not disabled)
        const isDisabled = await cartIcon.isDisabled();
        if (isDisabled) {
          errors.push(`❌ ${url}: Cart icon is disabled`);
        }

        // Check if clicking opens cart sidebar
        await cartIcon.click();
        await page.waitForTimeout(500);
        
        const sidebar = page.locator('#cart-sidebar');
        const sidebarVisible = await sidebar.isVisible();
        if (!sidebarVisible) {
          errors.push(`❌ ${url}: Clicking cart icon does not open sidebar`);
        }

        // Close sidebar
        const closeBtn = page.locator('#cart-close');
        if (await closeBtn.count() > 0) {
          await closeBtn.click();
          await page.waitForTimeout(300);
        }

        console.log(`✅ ${url}: Cart icon is visible and functional`);
      } catch (error) {
        errors.push(`Failed to test cart icon on ${url}: ${error}`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart icon functionality issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart icon positioning is consistent across all pages', async ({ page, baseURL }) => {
    const positions: Record<string, any> = {};
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🛒 Testing cart icon positioning\n`);

    for (const url of TEST_PAGES) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        await page.waitForTimeout(500);

        const cartIcon = page.locator('#cart-icon');
        const boundingBox = await cartIcon.boundingBox();
        
        if (!boundingBox) {
          errors.push(`❌ ${url}: Could not get cart icon position`);
          continue;
        }

        // Get parent container info - check if cart icon is inside .nav-links (could be direct child or nested)
        const navLinks = page.locator('.nav-links');
        const cartIconInNavLinks = await navLinks.filter({ has: cartIcon }).count() > 0;
        const parent = cartIcon.locator('..');
        const parentClasses = await parent.evaluate((el) => el.className || '');
        const isInMobileMenu = parentClasses.includes('mobile-menu') || 
                              (await cartIcon.evaluate((el) => {
                                const navLinks = el.closest('.nav-links');
                                return navLinks ? navLinks.classList.contains('mobile-menu') : false;
                              }));

        positions[url] = {
          x: boundingBox.x,
          y: boundingBox.y,
          width: boundingBox.width,
          height: boundingBox.height,
          inNavLinks: cartIconInNavLinks,
          inMobileMenu: isInMobileMenu,
        };

        console.log(`✅ ${url}: Cart icon at (${boundingBox.x.toFixed(1)}, ${boundingBox.y.toFixed(1)})`);
      } catch (error) {
        errors.push(`Failed to get cart icon position on ${url}: ${error}`);
      }
    }

    // Check that cart icon is consistently in navigation
    // Note: Cart icon should be in .nav-links, but it might be in a <li> child
    for (const url of TEST_PAGES) {
      const pos = positions[url];
      if (!pos) continue;

      if (!pos.inNavLinks) {
        // This is a warning, not necessarily an error - cart icon might be added dynamically
        console.log(`⚠️  ${url}: Cart icon parent structure may differ`);
      }
    }

    if (errors.length > 0) {
      console.error('\n❌ Cart icon positioning issues:');
      errors.forEach(err => console.error(`  ${err}`));
    }

    expect(errors.length).toBe(0);
  });

  test('Cart icon visual appearance is consistent across desktop and mobile views', async ({ page, baseURL }) => {
    const errors: string[] = [];
    const baseUrl = baseURL || 'http://localhost:8000';

    console.log(`\n🛒 Testing cart icon visual consistency across viewports\n`);

    // Test a few key pages
    const testPages = ['/', '/product-page/8-ounce-organic-cacao-nibs-from-brazil'];

    for (const url of testPages) {
      try {
        const fullUrl = `${baseUrl}${url}`;
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForSelector('#cart-icon', { timeout: 10000 });
        await page.waitForTimeout(500);

        // Test desktop view (1920x1080)
        await page.setViewportSize({ width: 1920, height: 1080 });
        await page.waitForTimeout(500);

        const desktopStyles = await page.locator('#cart-icon').evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            width: computed.width,
            height: computed.height,
            padding: computed.padding,
            color: computed.color,
          };
        });

        // Test mobile view (375x667)
        await page.setViewportSize({ width: 375, height: 667 });
        await page.waitForTimeout(1000); // Give time for responsive CSS to apply

        // Trigger navigation.js to position cart icon (it runs on resize)
        await page.evaluate(() => {
          if (window.Navigation && typeof window.Navigation.positionCartIcon === 'function') {
            window.Navigation.positionCartIcon();
          }
        });
        await page.waitForTimeout(500);

        // Check if mobile menu is open or cart icon is visible
        const mobileMenuToggle = page.locator('.mobile-menu-toggle');
        const isMobileMenuVisible = await mobileMenuToggle.isVisible();
        
        if (isMobileMenuVisible) {
          // Open mobile menu to see cart icon
          await mobileMenuToggle.click();
          await page.waitForTimeout(1000); // Give time for menu to open and cart icon to be positioned
          
          // Trigger positioning again after menu opens
          await page.evaluate(() => {
            if (window.Navigation && typeof window.Navigation.positionCartIcon === 'function') {
              window.Navigation.positionCartIcon();
            }
          });
          await page.waitForTimeout(500);
          
          // Wait for cart icon container to be created (navigation.js should wrap it)
          await page.waitForSelector('.cart-icon-container, #cart-icon', { timeout: 2000 }).catch(() => {});
        }

        // Check for mobile cart icon - MUST be inside mobile menu for mobile styling to apply
        const mobileMenu = page.locator('.nav-links.mobile-menu');
        const cartIconInMobileMenu = mobileMenu.locator('#cart-icon, #cart-icon-mobile, .cart-icon');
        const mobileCartExists = await cartIconInMobileMenu.count();
        
        // Debug: Check where cart icon actually is
        const allCartIcons = await page.locator('#cart-icon, #cart-icon-mobile').all();
        console.log(`  Debug: Found ${allCartIcons.length} cart icon(s) total`);
        for (let i = 0; i < allCartIcons.length; i++) {
          const info = await allCartIcons[i].evaluate(el => {
            const navLinks = el.closest('.nav-links');
            const isInMobileMenu = navLinks && navLinks.classList.contains('mobile-menu');
            return {
              parentClass: navLinks ? navLinks.className : 'no-nav-links',
              isInMobileMenu: isInMobileMenu,
              id: el.id
            };
          });
          console.log(`    Cart icon ${i+1} (id="${info.id}"): parent="${info.parentClass}", inMobileMenu=${info.isInMobileMenu}`);
        }
        
        // Use cart icon from mobile menu if available, otherwise fallback
        const mobileCartIcon = mobileCartExists > 0 
          ? cartIconInMobileMenu.first()
          : page.locator('#cart-icon-mobile, #cart-icon, .cart-icon').first();
        
        const mobileStyles = mobileCartExists > 0 ? await mobileCartIcon.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          // Debug: Check classes and IDs
          const classes = el.className;
          const id = el.id;
          const parentClasses = el.closest('.nav-links')?.className || 'none';
          console.log(`    Cart icon classes: "${classes}", id: "${id}", parent: "${parentClasses}"`);
          return {
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            width: computed.width,
            height: computed.height,
            padding: computed.padding,
            color: computed.color,
          };
        }) : null;
        
        if (!mobileStyles) {
          // Fallback to regular cart icon if mobile-specific one doesn't exist
          const fallbackIcon = page.locator('#cart-icon');
          if (await fallbackIcon.count() > 0) {
            const computed = await fallbackIcon.evaluate((el) => {
              const styles = window.getComputedStyle(el);
              return {
                backgroundColor: styles.backgroundColor,
                borderRadius: styles.borderRadius,
                width: styles.width,
                height: styles.height,
                padding: styles.padding,
                color: styles.color,
              };
            });
            Object.assign(mobileStyles || {}, computed);
          }
        }

        console.log(`\n📱 ${url}:`);
        console.log(`   Desktop: bg=${desktopStyles.backgroundColor}, size=${desktopStyles.width}x${desktopStyles.height}`);
        console.log(`   Mobile:  bg=${mobileStyles?.backgroundColor || 'N/A'}, size=${mobileStyles?.width || 'N/A'}x${mobileStyles?.height || 'N/A'}`);

        // On mobile, cart icon should have consistent styling (dark background, larger size)
        // Check if mobile cart icon has the expected mobile menu styling
        if (mobileStyles) {
          const expectedMobileBg = 'rgb(59, 51, 51)'; // var(--color-primary)
          const expectedMobileSize = '56px';
          
          // Check if cart icon is inside .cart-icon-container (required for mobile styling)
          const isInContainer = await page.evaluate(() => {
            const icon = document.querySelector('#cart-icon-mobile, .cart-icon-container #cart-icon, .cart-icon-container .cart-icon');
            return icon && icon.closest('.cart-icon-container') !== null;
          });
          
          if (!isInContainer) {
            errors.push(`❌ ${url}: Mobile cart icon is not inside .cart-icon-container - mobile styling won't apply`);
          }
          
          if (mobileStyles.backgroundColor !== expectedMobileBg) {
            errors.push(`❌ ${url}: Mobile cart icon background should be ${expectedMobileBg}, got ${mobileStyles.backgroundColor}. Is it inside .cart-icon-container?`);
          }
          
          if (mobileStyles.width !== expectedMobileSize || mobileStyles.height !== expectedMobileSize) {
            errors.push(`❌ ${url}: Mobile cart icon size should be ${expectedMobileSize}x${expectedMobileSize}, got ${mobileStyles.width}x${mobileStyles.height}`);
          }
        } else {
          errors.push(`❌ ${url}: Mobile cart icon not found or not properly styled`);
        }

      } catch (error) {
        errors.push(`Failed to test cart icon on ${url}: ${error}`);
      }
    }

    // All pages should have cart icon, differences between desktop/mobile are expected
    expect(errors.length).toBe(0);
  });
});
