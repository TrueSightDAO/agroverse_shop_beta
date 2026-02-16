/**
 * Cart UI Components
 * Handles cart icon, sidebar, and cart display
 */

(function() {
  'use strict';

  const config = window.AGROVERSE_CONFIG || {};

  /**
   * Create cart icon HTML
   */
  function createCartIcon() {
    return `
      <button id="cart-icon" class="cart-icon" aria-label="Shopping cart">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <path d="M16 10a4 4 0 0 1-8 0"></path>
        </svg>
        <span id="cart-badge" class="cart-badge">0</span>
      </button>
    `;
  }

  /**
   * Create cart sidebar HTML
   */
  function createCartSidebar() {
    return `
      <div id="cart-sidebar" class="cart-sidebar">
        <div class="cart-sidebar-header">
          <h2>Shopping Cart</h2>
          <button id="cart-close" class="cart-close" aria-label="Close cart">×</button>
        </div>
        <div id="cart-items" class="cart-items">
          <p class="cart-empty">Your cart is empty</p>
        </div>
        <div class="cart-sidebar-footer">
          <div class="cart-subtotal">
            <span>Subtotal:</span>
            <span id="cart-subtotal">$0.00</span>
          </div>
          <a href="${config.urls.checkout || '/checkout'}" id="cart-checkout-btn" class="cart-checkout-btn">Checkout</a>
        </div>
      </div>
      <div id="cart-overlay" class="cart-overlay"></div>
    `;
  }

  /**
   * Update cart badge
   */
  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = window.Cart.getItemCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'block' : 'none';
    }
  }

  /**
   * Render cart items
   */
  function renderCartItems() {
    const container = document.getElementById('cart-items');
    if (!container) return;

    const cart = window.Cart.getCart();

    if (!cart.items || cart.items.length === 0) {
      container.innerHTML = '<p class="cart-empty">Your cart is empty</p>';
      const checkoutBtn = document.getElementById('cart-checkout-btn');
      if (checkoutBtn) {
        checkoutBtn.style.display = 'none';
      }
      return;
    }

    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.style.display = 'block';
    }

    container.innerHTML = cart.items.map(item => {
      // Convert image URL to absolute if helper is available
      const imageUrl = item.image || '';
      const absoluteImageUrl = (window.ImageUrlHelper && imageUrl) 
        ? window.ImageUrlHelper.makeAbsolute(imageUrl) 
        : imageUrl;
      
      return `
      <div class="cart-item" data-product-id="${item.productId}">
        <img src="${absoluteImageUrl}" alt="${item.name}" class="cart-item-image" onerror="this.onerror=null; this.style.display='none';">
        <div class="cart-item-details">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-price">$${item.price.toFixed(2)}</div>
          <div class="cart-item-controls">
            <button class="cart-item-decrease" data-product-id="${item.productId}">−</button>
            <span class="cart-item-quantity">${item.quantity}</span>
            <button class="cart-item-increase" data-product-id="${item.productId}">+</button>
            <button class="cart-item-remove" data-product-id="${item.productId}">Remove</button>
          </div>
        </div>
      </div>
    `;
    }).join('');

    // Attach event listeners
    container.querySelectorAll('.cart-item-decrease').forEach(btn => {
      btn.addEventListener('click', async () => {
        const productId = btn.dataset.productId;
        const item = cart.items.find(i => i.productId === productId);
        if (item) {
          // Decreasing quantity doesn't need inventory check
          const result = await window.Cart.updateQuantity(productId, item.quantity - 1, { skipInventoryCheck: true });
          if (!result.success && result.message) {
            alert(result.message);
          }
        }
      });
    });

    container.querySelectorAll('.cart-item-increase').forEach(btn => {
      btn.addEventListener('click', async () => {
        const productId = btn.dataset.productId;
        const item = cart.items.find(i => i.productId === productId);
        if (item) {
          // Increasing quantity needs inventory check
          const result = await window.Cart.updateQuantity(productId, item.quantity + 1);
          if (!result.success) {
            const errorMessage = result.message || 'Unable to update quantity';
            alert(errorMessage);
          }
        }
      });
    });

    container.querySelectorAll('.cart-item-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const productId = btn.dataset.productId;
        window.Cart.remove(productId);
      });
    });
  }

  /**
   * Update cart subtotal
   */
  function updateCartSubtotal() {
    const subtotalEl = document.getElementById('cart-subtotal');
    if (subtotalEl) {
      const subtotal = window.Cart.getSubtotal();
      subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
    }
  }

  /**
   * Set mobile viewport height for cart sidebar
   */
  function setMobileViewportHeight() {
    const sidebar = document.getElementById('cart-sidebar');
    if (!sidebar) return;
    
    // On mobile, use actual window height instead of 100vh
    if (window.innerWidth <= 768) {
      const vh = window.innerHeight * 0.01;
      sidebar.style.setProperty('--vh', `${vh}px`);
      sidebar.style.height = `${window.innerHeight}px`;
      sidebar.style.maxHeight = `${window.innerHeight}px`;
    } else {
      sidebar.style.height = '';
      sidebar.style.maxHeight = '';
    }
  }

  /**
   * Open cart sidebar
   */
  function openCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    setMobileViewportHeight(); // Set correct height before opening
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) {
      sidebar.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
    if (overlay) {
      overlay.classList.add('active');
    }
  }

  /**
   * Close cart sidebar
   */
  function closeCartSidebar() {
    const sidebar = document.getElementById('cart-sidebar');
    const overlay = document.getElementById('cart-overlay');
    if (sidebar) {
      sidebar.classList.remove('active');
      document.body.style.overflow = '';
    }
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  /**
   * Initialize cart UI
   */
  function initCartUI() {
    // Add cart icon to header if it doesn't exist
    const header = document.querySelector('header nav');
    if (header && !document.getElementById('cart-icon')) {
      // Find ALL nav-links elements
      const allNavLinks = header.querySelectorAll('.nav-links');
      
      // Find desktop nav (one that doesn't have mobile-menu class)
      let desktopNavLinks = null;
      let mobileNavLinks = null;
      
      allNavLinks.forEach(function(nav) {
        if (nav.classList.contains('mobile-menu')) {
          mobileNavLinks = nav;
        } else {
          desktopNavLinks = nav;
        }
      });
      
      // If no separate desktop nav exists, check if there's a nav-links without mobile-menu
      if (!desktopNavLinks) {
        desktopNavLinks = header.querySelector('.nav-links:not(.mobile-menu)');
      }
      
      // Add cart icon to desktop nav (or first nav-links if no desktop nav found)
      const targetNav = desktopNavLinks || (allNavLinks.length > 0 ? allNavLinks[0] : null);
      
      if (targetNav && !targetNav.classList.contains('mobile-menu')) {
        // Add to desktop nav (normal nav-links)
        const cartIconContainer = document.createElement('li');
        cartIconContainer.innerHTML = createCartIcon();
        targetNav.appendChild(cartIconContainer);
      } else if (targetNav) {
        // If we only have mobile menu, add it there with container class for proper styling
        const cartIconContainer = document.createElement('li');
        cartIconContainer.className = 'cart-icon-container';
        cartIconContainer.innerHTML = createCartIcon();
        targetNav.insertBefore(cartIconContainer, targetNav.firstChild);
      }
      
      // Always ensure cart icon is in mobile menu with container class (for consistent mobile styling)
      // Do this after a short delay to ensure mobile menu exists
      setTimeout(function() {
        const mobileMenu = document.querySelector('.nav-links.mobile-menu') || document.querySelector('ul.mobile-menu');
        const cartIcon = document.getElementById('cart-icon');
        
        if (mobileMenu && cartIcon) {
          // Check if cart icon is already in mobile menu
          const cartIconInMobileMenu = mobileMenu.contains(cartIcon);
          const existingContainer = mobileMenu.querySelector('.cart-icon-container');
          
          if (!existingContainer) {
            if (cartIconInMobileMenu) {
              // Cart icon is in mobile menu, wrap it in container
              const cartIconLi = cartIcon.closest('li');
              if (cartIconLi && !cartIconLi.classList.contains('cart-icon-container')) {
                cartIconLi.classList.add('cart-icon-container');
                // Move to beginning
                mobileMenu.insertBefore(cartIconLi, mobileMenu.firstChild);
              }
            } else {
              // Cart icon not in mobile menu, add it with container
              const mobileCartContainer = document.createElement('li');
              mobileCartContainer.className = 'cart-icon-container';
              mobileCartContainer.innerHTML = createCartIcon();
              mobileMenu.insertBefore(mobileCartContainer, mobileMenu.firstChild);
            }
          }
        }
      }, 100);
    }

    // Add cart sidebar to body if it doesn't exist
    if (!document.getElementById('cart-sidebar')) {
      document.body.insertAdjacentHTML('beforeend', createCartSidebar());
    }

    // Attach event listeners
    const cartIcon = document.getElementById('cart-icon');
    if (cartIcon) {
      cartIcon.addEventListener('click', openCartSidebar);
    }

    const cartClose = document.getElementById('cart-close');
    if (cartClose) {
      cartClose.addEventListener('click', closeCartSidebar);
    }

    const cartOverlay = document.getElementById('cart-overlay');
    if (cartOverlay) {
      cartOverlay.addEventListener('click', closeCartSidebar);
    }

    // Update cart display
    updateCartDisplay();

    // Listen for cart updates
    window.addEventListener(window.Cart.EVENT_NAME, () => {
      updateCartDisplay();
    });
  }

  /**
   * Update entire cart display
   */
  function updateCartDisplay() {
    updateCartBadge();
    renderCartItems();
    updateCartSubtotal();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartUI);
  } else {
    initCartUI();
  }

  // Handle viewport height changes on mobile (e.g., when address bar shows/hides)
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      setMobileViewportHeight();
    }, 100);
  });

  // Also handle orientation changes
  window.addEventListener('orientationchange', function() {
    setTimeout(function() {
      setMobileViewportHeight();
    }, 200);
  });

  // Export for external use
  window.CartUI = {
    open: openCartSidebar,
    close: closeCartSidebar,
    update: updateCartDisplay
  };

})();

