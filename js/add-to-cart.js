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
   * Show toast notification
   */
  function showToast(message) {
    // Remove existing toast if any
    const existingToast = document.getElementById('add-to-cart-toast');
    if (existingToast) {
      existingToast.remove();
    }

    // Create toast
    const toast = document.createElement('div');
    toast.id = 'add-to-cart-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      background: var(--color-primary, #3b3333);
      color: white;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      z-index: 3000;
      animation: slideIn 0.3s ease;
      font-weight: 600;
    `;

    // Add animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    if (!document.getElementById('toast-animations')) {
      style.id = 'toast-animations';
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3000);
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
      showToast('Error: Invalid product data');
      button.dataset.processing = 'false';
      return;
    }

    // Add to cart
    const success = window.Cart.add(product);

    // Reset processing flag after a short delay
    setTimeout(() => {
      button.dataset.processing = 'false';
    }, 500);

    if (success) {
      showToast('Added to cart!');
      
      // Optionally open cart sidebar
      if (window.CartUI) {
        setTimeout(() => {
          window.CartUI.open();
        }, 500);
      }
    } else {
      showToast('Failed to add to cart. Please try again.');
    }
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

