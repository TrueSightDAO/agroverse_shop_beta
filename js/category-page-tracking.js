/**
 * Category Page GA4 Tracking
 * Tracks view_item_list and select_item events on category pages
 */

(function() {
  'use strict';

  /**
   * Initialize category page tracking
   */
  function initCategoryPageTracking() {
    // Wait for PRODUCTS to be available
    if (!window.PRODUCTS) {
      setTimeout(initCategoryPageTracking, 100);
      return;
    }

    // Determine category name from URL
    const pathParts = window.location.pathname.split('/');
    let categoryName = 'Product List';
    
    if (pathParts.includes('retail-packs')) {
      categoryName = 'Retail Packs';
    } else if (pathParts.includes('wholesale-bulk')) {
      categoryName = 'Wholesale Bulk';
    }

    // Get all products on the page
    const productCards = document.querySelectorAll('.product-card');
    const products = [];

    productCards.forEach(card => {
      const addToCartBtn = card.querySelector('.add-to-cart-btn');
      if (addToCartBtn && addToCartBtn.dataset.productId) {
        const productId = addToCartBtn.dataset.productId;
        if (window.PRODUCTS[productId]) {
          products.push(window.PRODUCTS[productId]);
        }
      }
    });

    // Track view_item_list
    if (products.length > 0 && window.trackViewItemList) {
      window.trackViewItemList(products, categoryName);
    }

    // Track select_item when user clicks on a product card
    productCards.forEach(card => {
      const productLink = card.querySelector('.product-card-link');
      if (productLink) {
        productLink.addEventListener('click', function(e) {
          const addToCartBtn = card.querySelector('.add-to-cart-btn');
          if (addToCartBtn && addToCartBtn.dataset.productId) {
            const productId = addToCartBtn.dataset.productId;
            if (window.PRODUCTS[productId] && window.trackSelectItem) {
              window.trackSelectItem(window.PRODUCTS[productId], categoryName);
            }
          }
        });
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCategoryPageTracking);
  } else {
    initCategoryPageTracking();
  }

})();




