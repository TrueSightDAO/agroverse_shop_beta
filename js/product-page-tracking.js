/**
 * Product Page GA4 Tracking
 * Automatically tracks view_item event when product page loads
 */

(function() {
  'use strict';

  /**
   * Initialize product page tracking
   */
  function initProductPageTracking() {
    // Wait for PRODUCTS to be available
    if (!window.PRODUCTS) {
      setTimeout(initProductPageTracking, 100);
      return;
    }

    // Try to find product ID from URL or page
    const pathParts = window.location.pathname.split('/');
    let productId = null;

    // Check if there's a product ID in the URL path
    // Product pages are like: /product-page/product-name/index.html
    if (pathParts.length >= 2 && pathParts[pathParts.length - 3] === 'product-page') {
      const productPath = pathParts[pathParts.length - 2];
      
      // Try to match product ID from PRODUCTS
      for (const id in window.PRODUCTS) {
        if (productPath.includes(id.replace(/-/g, '-')) || id.includes(productPath)) {
          productId = id;
          break;
        }
      }
    }

    // If not found in URL, try to get from add-to-cart button
    if (!productId) {
      const addToCartBtn = document.querySelector('.add-to-cart-btn');
      if (addToCartBtn && addToCartBtn.dataset.productId) {
        productId = addToCartBtn.dataset.productId;
      }
    }

    // If still not found, try to match by product name in h1
    if (!productId) {
      const h1 = document.querySelector('h1');
      if (h1) {
        const productName = h1.textContent.trim();
        for (const id in window.PRODUCTS) {
          if (window.PRODUCTS[id].name === productName) {
            productId = id;
            break;
          }
        }
      }
    }

    // Track view_item if we found a product
    if (productId && window.PRODUCTS[productId] && window.trackViewItem) {
      const product = window.PRODUCTS[productId];
      window.trackViewItem(product);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProductPageTracking);
  } else {
    initProductPageTracking();
  }

})();

