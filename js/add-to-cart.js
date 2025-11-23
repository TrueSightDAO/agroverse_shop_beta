/**
 * Add to Cart Button Handler
 * Handles "Add to Cart" button clicks on product pages
 */

(function() {
  'use strict';

  // Prevent multiple initializations
  if (window.addToCartInitialized) {
    return;
  }
  window.addToCartInitialized = true;

  /**
   * Show mobile toast notification
   */
  function showMobileToast(message) {
    // Remove existing toast if any
    const existingToast = document.getElementById('mobile-cart-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'mobile-cart-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--color-primary, #3b3333);
      color: white;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      animation: slideUp 0.3s ease-out;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }
    `;
    if (!document.querySelector('#mobile-cart-toast-style')) {
      style.id = 'mobile-cart-toast-style';
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after 2 seconds
    setTimeout(() => {
      toast.style.animation = 'slideUp 0.3s ease-out reverse';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 2000);
  }

  /**
   * Handle add to cart button click
   */
  function handleAddToCart(event) {
    event.preventDefault();
    event.stopPropagation(); // Prevent event from bubbling up

    const button = event.target.closest('.add-to-cart-btn');
    if (!button) return;

    // Prevent double-firing by checking if already processing
    if (button.dataset.processing === 'true') {
      return;
    }
    button.dataset.processing = 'true';

    // Get product data from data attributes
    const productId = button.dataset.productId;
    
    // Try to get full product data from window.PRODUCTS first (includes weight)
    let product;
    if (window.PRODUCTS && window.PRODUCTS[productId]) {
      product = Object.assign({}, window.PRODUCTS[productId], {
        quantity: 1
      });
    } else {
      // Fallback to data attributes if product not in PRODUCTS
      product = {
        productId: productId,
        name: button.dataset.productName,
        price: parseFloat(button.dataset.productPrice),
        image: button.dataset.productImage,
        stripePriceId: button.dataset.stripePriceId || '',
        weight: parseFloat(button.dataset.productWeight) || 0,
        quantity: 1
      };
    }

    // Validate product data
    if (!product.productId || !product.name || !product.price) {
      console.error('Invalid product data:', product);
      button.dataset.processing = 'false';
      return;
    }

    // Add to cart
    const success = window.Cart.add(product);

    // Reset processing flag after a short delay
    setTimeout(() => {
      button.dataset.processing = 'false';
    }, 500);

    // Show toast notification on mobile (where cart icon might not be visible)
    if (success && window.innerWidth <= 768) {
      showMobileToast('Added to cart!');
    }

    // Cart badge will update automatically via cart event listeners
  }

  /**
   * Initialize add to cart buttons
   */
  function initAddToCart() {
    // Use event delegation - single listener on document
    // This handles both existing and dynamically added buttons
    // Only add listener once (check if already added)
    if (!window.addToCartListenerAdded) {
      document.addEventListener('click', function(event) {
        if (event.target.closest('.add-to-cart-btn')) {
          handleAddToCart(event);
        }
      }, true); // Use capture phase to catch early
      window.addToCartListenerAdded = true;
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddToCart);
  } else {
    initAddToCart();
  }

})();

