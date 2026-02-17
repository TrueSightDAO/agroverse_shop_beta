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
  async function handleAddToCart(event) {
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

    // Ensure image URL is absolute for cross-page compatibility
    if (product.image && window.ImageUrlHelper && window.ImageUrlHelper.makeAbsolute) {
      product.image = window.ImageUrlHelper.makeAbsolute(product.image);
    }

    // Validate product data
    if (!product.productId || !product.name || !product.price) {
      console.error('Invalid product data:', product);
      button.dataset.processing = 'false';
      return;
    }

    // Add to cart with inventory validation
    try {
      const result = await window.Cart.add(product);
      
      if (result.success) {
        // Track GA4 add_to_cart event
        if (window.trackAddToCart) {
          window.trackAddToCart(product);
        }

        // Track Facebook Pixel AddToCart event
        if (window.trackFacebookAddToCart) {
          window.trackFacebookAddToCart(product);
        }

        // Show toast notification on mobile (where cart icon might not be visible)
        if (window.innerWidth <= 768) {
          showMobileToast('Added to cart!');
        }
      } else {
        // Show error message
        const errorMessage = result.message || 'Unable to add to cart';
        if (window.innerWidth <= 768) {
          showMobileToast(errorMessage);
        } else {
          alert(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      const errorMessage = 'Unable to add to cart. Please try again.';
      if (window.innerWidth <= 768) {
        showMobileToast(errorMessage);
      } else {
        alert(errorMessage);
      }
    } finally {
      // Reset processing flag after a short delay
      setTimeout(() => {
        button.dataset.processing = 'false';
      }, 500);
    }

    // Cart badge will update automatically via cart event listeners
  }

  /**
   * Update button state based on inventory
   * @param {HTMLElement} button - The add to cart button
   * @param {number} inventory - Current inventory count
   */
  function updateButtonState(button, inventory) {
    if (!button) return;
    
    const productId = button.dataset.productId;
    const originalPrice = button.dataset.productPrice || '';
    
    // Store original text and styles BEFORE any modifications (only once, and only if not "Out of Stock")
    if (!button.dataset.originalText) {
      const currentText = button.textContent || '';
      // Only save if it's not already "Out of Stock" (prevents saving wrong original)
      if (currentText !== 'Out of Stock') {
        button.dataset.originalText = currentText;
        // Store original inline style values (preserve CSS variables like var(--color-primary))
        // Parse the style attribute to get the actual CSS variable strings
        const inlineStyle = button.getAttribute('style') || '';
        const bgMatch = inlineStyle.match(/background-color:\s*([^;]+)/i);
        const colorMatch = inlineStyle.match(/color:\s*([^;]+)/i);
        const cursorMatch = inlineStyle.match(/cursor:\s*([^;]+)/i);
        
        // Extract and store original values, with proper fallbacks
        button.dataset.originalBgColor = (bgMatch ? bgMatch[1].trim() : null) || 'var(--color-primary, #3b3333)';
        // Ensure color is always stored as 'white' if not found or if it's a CSS variable
        const extractedColor = colorMatch ? colorMatch[1].trim() : null;
        button.dataset.originalColor = extractedColor || 'white';
        button.dataset.originalCursor = (cursorMatch ? cursorMatch[1].trim() : null) || 'pointer';
      } else if (originalPrice) {
        // If button is already "Out of Stock", reconstruct original text from price
        button.dataset.originalText = `Add to Cart - $${parseFloat(originalPrice).toFixed(2)}`;
        button.dataset.originalBgColor = 'var(--color-primary, #3b3333)';
        button.dataset.originalColor = 'white';
        button.dataset.originalCursor = 'pointer';
      } else {
        button.dataset.originalText = 'Add to Cart';
        button.dataset.originalBgColor = 'var(--color-primary, #3b3333)';
        button.dataset.originalColor = 'white';
        button.dataset.originalCursor = 'pointer';
      }
    }
    
    if (inventory <= 0) {
      // Out of stock
      button.disabled = true;
      button.classList.add('out-of-stock');
      button.textContent = 'Out of Stock';
      button.style.backgroundColor = '#999';
      button.style.cursor = 'not-allowed';
      button.style.opacity = '0.6';
    } else {
      // In stock - restore original state
      button.disabled = false;
      button.classList.remove('out-of-stock');
      
      // Restore original text (but never restore to "Out of Stock")
      if (button.dataset.originalText && button.dataset.originalText !== 'Out of Stock') {
        button.textContent = button.dataset.originalText;
      } else if (originalPrice) {
        button.textContent = `Add to Cart - $${parseFloat(originalPrice).toFixed(2)}`;
      } else {
        button.textContent = 'Add to Cart';
      }
      
      // Restore original styles - check if button has inline styles first
      const originalBgColor = button.dataset.originalBgColor || 'var(--color-primary, #3b3333)';
      const originalColor = button.dataset.originalColor || 'white';
      const originalCursor = button.dataset.originalCursor || 'pointer';
      
      // Restore background color (use original or default primary color)
      button.style.backgroundColor = originalBgColor;
      // Always set color to white for add-to-cart buttons (they should always be white)
      // Use setProperty with important to ensure it overrides any CSS
      button.style.setProperty('color', 'white', 'important');
      button.style.cursor = originalCursor;
      button.style.opacity = '';
    }
  }

  /**
   * Check inventory and update all add to cart buttons on the page
   */
  async function checkInventoryAndUpdateButtons() {
    // Wait for inventory service to be available
    if (!window.InventoryService) {
      // Retry after a short delay
      setTimeout(checkInventoryAndUpdateButtons, 100);
      return;
    }

    const buttons = document.querySelectorAll('.add-to-cart-btn');
    
    if (buttons.length === 0) return;

    // Fetch all inventory at once
    let allInventory = {};
    try {
      allInventory = await window.InventoryService.fetchAllInventory();
    } catch (error) {
      console.warn('Could not fetch inventory, buttons will remain enabled:', error);
      return;
    }

    // Update each button based on inventory
    buttons.forEach(button => {
      const productId = button.dataset.productId;
      if (productId) {
        const inventory = allInventory[productId] !== undefined ? parseInt(allInventory[productId], 10) : null;
        
        if (inventory !== null) {
          updateButtonState(button, inventory);
        }
      }
    });
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
        const button = event.target.closest('.add-to-cart-btn');
        if (button && !button.disabled && !button.classList.contains('out-of-stock')) {
          handleAddToCart(event);
        }
      }, true); // Use capture phase to catch early
      window.addToCartListenerAdded = true;
    }

    // Check inventory and update button states
    checkInventoryAndUpdateButtons();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAddToCart);
  } else {
    initAddToCart();
  }

})();

