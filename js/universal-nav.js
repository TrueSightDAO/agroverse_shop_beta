/**
 * Universal Navigation Script
 * Adds cart icon and order history link to all pages
 * This script should be included on all pages
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.universalNavInitialized) {
    return;
  }
  window.universalNavInitialized = true;

  /**
   * Get base URL for relative paths
   */
  function getBaseUrl() {
    // Handle file:// URLs
    if (window.location.protocol === 'file:') {
      const path = window.location.pathname;
      // For file:// URLs, pathname includes the full file path
      // Extract just the directory structure
      const pathParts = path.split('/').filter(p => p);
      // Remove the filename (last part if it ends with .html)
      if (pathParts.length > 0 && pathParts[pathParts.length - 1].endsWith('.html')) {
        pathParts.pop();
      }
      // Count depth (excluding root directories like Users, Applications, etc.)
      // For partner pages: partners/kikis-cocoa -> depth = 2
      const depth = pathParts.length;
      // Find where 'agroverse_shop' or similar project root is
      const projectRootIndex = pathParts.findIndex(p => p.includes('agroverse'));
      if (projectRootIndex >= 0) {
        const relativeDepth = pathParts.length - projectRootIndex - 1;
        return relativeDepth > 0 ? '../'.repeat(relativeDepth) : '../';
      }
      return depth > 0 ? '../'.repeat(depth) : '../';
    }
    
    // Handle http/https URLs
    const path = window.location.pathname;
    if (path === '/' || path === '/index.html') {
      return '';
    }
    // Count depth (how many directories deep we are)
    // Remove leading/trailing slashes and split
    const parts = path.split('/').filter(p => p && p !== 'index.html');
    // For paths like /post/article/index.html, parts = ['post', 'article']
    // We need to go up 2 levels, so depth = parts.length
    const depth = parts.length;
    return depth > 0 ? '../'.repeat(depth) : '../';
  }

  /**
   * Add cart scripts to page if not already present
   */
  function addCartScripts() {
    const baseUrl = getBaseUrl();
    
    // Wait for config to be available
    if (!window.AGROVERSE_CONFIG) {
      // Load config.js first if not present
      if (!document.querySelector('script[src*="config.js"]')) {
        const configJs = document.createElement('script');
        configJs.src = baseUrl + 'js/config.js';
        configJs.async = false; // Load synchronously
        document.head.appendChild(configJs);
        
        configJs.onload = function() {
          loadCartScripts();
        };
        return;
      } else {
        // Config is loading, wait a bit
        setTimeout(addCartScripts, 200);
        return;
      }
    }

    loadCartScripts();

    function loadCartScripts() {
      // Check if cart scripts are already loaded
      if (window.Cart && window.CartUI) {
        return; // Already loaded
      }

      // Add image-url-helper.js first (needed by cart-ui and order-history)
      if (!document.querySelector('script[src*="image-url-helper.js"]') && !window.ImageUrlHelper) {
        const imageHelperJs = document.createElement('script');
        imageHelperJs.src = baseUrl + 'js/image-url-helper.js';
        imageHelperJs.async = false; // Load synchronously before cart-ui
        document.body.appendChild(imageHelperJs);
      }

      // Add cart.css if not present
      if (!document.querySelector('link[href*="cart.css"]')) {
        const cartCss = document.createElement('link');
        cartCss.rel = 'stylesheet';
        cartCss.href = baseUrl + 'css/cart.css';
        document.head.appendChild(cartCss);
      }

      // Add inventory-service.js first (needed by cart.js)
      if (!document.querySelector('script[src*="inventory-service.js"]') && !window.InventoryService) {
        const inventoryServiceJs = document.createElement('script');
        inventoryServiceJs.src = baseUrl + 'js/inventory-service.js';
        inventoryServiceJs.async = false; // Load synchronously before cart.js
        document.body.appendChild(inventoryServiceJs);
      }

      // Add cart.js if not present
      if (!document.querySelector('script[src*="cart.js"]') && !window.Cart) {
        const cartJs = document.createElement('script');
        cartJs.src = baseUrl + 'js/cart.js';
        cartJs.async = true;
        document.body.appendChild(cartJs);
      }

      // Add cart-ui.js if not present
      if (!document.querySelector('script[src*="cart-ui.js"]') && !window.CartUI) {
        const cartUIJs = document.createElement('script');
        cartUIJs.src = baseUrl + 'js/cart-ui.js';
        cartUIJs.async = false; // Load synchronously to ensure it's ready
        document.body.appendChild(cartUIJs);
        
        // After cart-ui.js loads, ensure cart icon is added
        cartUIJs.onload = function() {
          setTimeout(function() {
            if (window.CartUI && typeof window.CartUI.init === 'function') {
              window.CartUI.init();
            } else if (window.CartUI && typeof window.CartUI.initCartUI === 'function') {
              window.CartUI.initCartUI();
            }
          }, 100);
        };
      }
    }
  }

  /**
   * Add order history link to navigation if orders exist
   */
  function addOrderHistoryLink() {
    // Wait for OrderHistory to be available
    if (!window.OrderHistory) {
      // Try to load order-history.js if not present
      const baseUrl = getBaseUrl();
      if (!document.querySelector('script[src*="order-history.js"]')) {
        const orderHistoryJs = document.createElement('script');
        // Handle file:// URLs and relative paths
        let scriptPath = baseUrl + 'js/order-history.js';
        if (window.location.protocol === 'file:') {
          // For file:// URLs, ensure we have a proper relative path
          if (!baseUrl || baseUrl === '/') {
            scriptPath = '../../js/order-history.js';
          }
        }
        orderHistoryJs.src = scriptPath;
        orderHistoryJs.async = true;
        // Suppress errors if file doesn't exist
        orderHistoryJs.onerror = function() {
          console.warn('order-history.js not found, skipping order history link');
        };
        orderHistoryJs.onload = function() {
          setTimeout(checkAndAddOrderHistoryLink, 500);
        };
        document.body.appendChild(orderHistoryJs);
      } else {
        // Already loading, check after a delay
        setTimeout(checkAndAddOrderHistoryLink, 1000);
      }
      return;
    }

    checkAndAddOrderHistoryLink();
  }

  /**
   * Check if order history exists and add link
   */
  function checkAndAddOrderHistoryLink() {
    if (!window.OrderHistory) {
      return;
    }

    // Don't add link if we're already on the order history page
    if (window.location.pathname.includes('/order-history')) {
      return;
    }

    const orderHistory = window.OrderHistory.getOrderHistory();
    if (!orderHistory || orderHistory.length === 0) {
      return; // No orders, don't show link
    }

    // Check if link already exists
    if (document.getElementById('nav-order-history-link')) {
      return; // Already added
    }
    
    // Check if there's already an "Order History" link in navigation (hardcoded)
    const existingOrderHistoryLink = document.querySelector('nav a[href*="order-history"], .nav-links a[href*="order-history"]');
    if (existingOrderHistoryLink) {
      return; // Already has order history link, don't add another
    }

    const baseUrl = getBaseUrl();
    const orderHistoryUrl = baseUrl + 'order-history/';

    // Try to find navigation in different possible locations
    let navLinks = document.querySelector('.nav-links') || 
                   document.querySelector('nav ul') ||
                   document.querySelector('header nav ul') ||
                   document.querySelector('ul.nav-links') ||
                   document.querySelector('nav .nav-links');

    // If still not found, try to find nav element and create ul if needed
    if (!navLinks) {
      const nav = document.querySelector('nav') || document.querySelector('header nav');
      if (nav) {
        // Check if nav has direct children that are links (not in ul)
        const directLinks = nav.querySelectorAll(':scope > a');
        if (directLinks.length > 0) {
          // Create a ul container
          navLinks = document.createElement('ul');
          navLinks.className = 'nav-links';
          navLinks.style.cssText = 'display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0;';
          // Move existing links into the ul
          directLinks.forEach(link => {
            const li = document.createElement('li');
            li.style.listStyle = 'none';
            li.appendChild(link.cloneNode(true));
            navLinks.appendChild(li);
            link.remove();
          });
          nav.appendChild(navLinks);
        }
      }
    }

    if (!navLinks) {
      return; // No navigation found
    }

    // Create order history link
    const orderHistoryItem = document.createElement('li');
    orderHistoryItem.id = 'nav-order-history-item';
    orderHistoryItem.style.listStyle = 'none';
    
    const orderHistoryLink = document.createElement('a');
    orderHistoryLink.id = 'nav-order-history-link';
    orderHistoryLink.href = orderHistoryUrl;
    orderHistoryLink.textContent = 'Order History';
    orderHistoryLink.style.cssText = 'color: var(--color-text, #3b3333); text-decoration: none; font-weight: 600;';
    
    // Add hover effect
    orderHistoryLink.addEventListener('mouseenter', function() {
      this.style.color = 'var(--color-secondary, #4d4d4d)';
    });
    orderHistoryLink.addEventListener('mouseleave', function() {
      this.style.color = 'var(--color-text, #3b3333)';
    });

    orderHistoryItem.appendChild(orderHistoryLink);
    
    // Insert before cart icon if it exists, otherwise append
    const cartIconItem = navLinks.querySelector('#cart-icon')?.closest('li');
    if (cartIconItem) {
      navLinks.insertBefore(orderHistoryItem, cartIconItem);
    } else {
      navLinks.appendChild(orderHistoryItem);
    }
  }

  /**
   * Add cart icon to navigation
   * This function ensures the cart icon is added even if cart-ui.js hasn't initialized yet
   */
  function addCartIcon() {
    // Check if cart icon already exists
    if (document.getElementById('cart-icon')) {
      return; // Already added
    }

    // Try to find navigation in different possible locations
    let navLinks = document.querySelector('.nav-links') || 
                   document.querySelector('nav ul') ||
                   document.querySelector('header nav ul') ||
                   document.querySelector('ul.nav-links') ||
                   document.querySelector('nav .nav-links');

    // If still not found, try to find nav element and create ul if needed
    if (!navLinks) {
      const nav = document.querySelector('nav') || document.querySelector('header nav');
      if (nav) {
        // Check if nav has direct children that are links (not in ul)
        const directLinks = nav.querySelectorAll(':scope > a');
        if (directLinks.length > 0) {
          // Create a ul container
          navLinks = document.createElement('ul');
          navLinks.className = 'nav-links';
          navLinks.style.cssText = 'display: flex; gap: 2rem; list-style: none; margin: 0; padding: 0;';
          // Move existing links into the ul
          directLinks.forEach(link => {
            const li = document.createElement('li');
            li.style.listStyle = 'none';
            li.appendChild(link.cloneNode(true));
            navLinks.appendChild(li);
            link.remove();
          });
          nav.appendChild(navLinks);
        } else {
          // Check if there's a ul but it doesn't have nav-links class
          const existingUl = nav.querySelector('ul');
          if (existingUl) {
            navLinks = existingUl;
            if (!navLinks.classList.contains('nav-links')) {
              navLinks.classList.add('nav-links');
            }
          }
        }
      }
    }

    if (!navLinks) {
      // If still not found, try again after a delay
      setTimeout(addCartIcon, 500);
      return;
    }

    // If CartUI is available, use it to initialize
    if (window.CartUI) {
      // CartUI should handle initialization, but let's make sure
      if (typeof window.CartUI.init === 'function') {
        window.CartUI.init();
      } else if (typeof window.CartUI.initCartUI === 'function') {
        window.CartUI.initCartUI();
      }
    } else {
      // CartUI not loaded yet, wait and try again
      setTimeout(addCartIcon, 500);
    }
  }

  /**
   * Initialize universal navigation
   */
  function initUniversalNav() {
    // Add cart scripts
    addCartScripts();

    // Add cart icon (will check after CartUI loads)
    addCartIcon();

    // Add order history link (will check after OrderHistory loads)
    addOrderHistoryLink();

    // Re-check cart icon periodically (in case scripts load late)
    setInterval(function() {
      if (window.CartUI && !document.getElementById('cart-icon')) {
        addCartIcon();
      }
    }, 1000);

    // Re-check order history link periodically (in case orders are added)
    setInterval(function() {
      if (window.OrderHistory) {
        checkAndAddOrderHistoryLink();
      }
    }, 2000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUniversalNav);
  } else {
    initUniversalNav();
  }

  // Also try after a short delay to catch dynamically loaded content
  setTimeout(initUniversalNav, 500);

})();

