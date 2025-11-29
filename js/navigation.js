/**
 * Shared Navigation JavaScript
 * Handles hamburger menu toggle and cart icon positioning
 * Consistent behavior across all pages
 */

(function() {
  'use strict';

  /**
   * Initialize mobile navigation
   */
  function initMobileNavigation() {
    const menuToggle = document.querySelector('.mobile-menu-toggle');
    const mobileMenu = document.querySelector('.nav-links.mobile-menu') || document.querySelector('ul.mobile-menu');
    const overlay = document.querySelector('.mobile-menu-overlay');
    
    if (!menuToggle || !mobileMenu) {
      return; // Navigation elements not found
    }
    
    // Toggle menu on hamburger click
    menuToggle.addEventListener('click', function() {
      const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
      
      menuToggle.setAttribute('aria-expanded', !isExpanded);
      mobileMenu.classList.toggle('active');
      
      if (overlay) {
        overlay.classList.toggle('active');
      }
      
      // Prevent body scroll when menu is open
      if (!isExpanded) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });
    
    // Close menu when clicking overlay
    if (overlay) {
      overlay.addEventListener('click', function() {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
      });
    }
    
    // Close menu when clicking a link
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        if (overlay) {
          overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
      });
    });
    
    // Close menu on window resize if it becomes desktop view
    window.addEventListener('resize', function() {
      if (window.innerWidth > 768) {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileMenu.classList.remove('active');
        if (overlay) {
          overlay.classList.remove('active');
        }
        document.body.style.overflow = '';
      }
    });
  }

  /**
   * Position cart icon at top right of mobile menu (mobile only)
   */
  function positionCartIconInMobileMenu() {
    // Only run on mobile screens
    if (window.innerWidth > 768) {
      return;
    }
    
    const mobileMenu = document.querySelector('.nav-links.mobile-menu') || document.querySelector('ul.mobile-menu');
    const cartIcon = document.getElementById('cart-icon');
    
    if (!mobileMenu || !cartIcon) {
      return; // Elements not found
    }
    
    // Check if cart icon is already positioned in mobile menu
    const existingCartContainer = mobileMenu.querySelector('.cart-icon-container');
    if (existingCartContainer) {
      return; // Already positioned
    }
    
    // Check if cart icon is already in the mobile menu (not in a container)
    const cartIconInMobileMenu = mobileMenu.contains(cartIcon);
    
    if (cartIconInMobileMenu) {
      // Cart icon is already in mobile menu, move to top for mobile
      const cartIconLi = cartIcon.closest('li');
      if (cartIconLi && !cartIconLi.classList.contains('cart-icon-container')) {
        cartIconLi.classList.add('cart-icon-container');
        // Move to beginning of mobile menu
        mobileMenu.insertBefore(cartIconLi, mobileMenu.firstChild);
      }
      return;
    }
    
    // Find the cart icon's parent li (should be in desktop menu)
    const cartIconLi = cartIcon.closest('li');
    if (!cartIconLi) {
      return; // Cart icon not in a list item
    }
    
    // Create container for cart icon at top right of mobile menu
    const cartContainer = document.createElement('li');
    cartContainer.className = 'cart-icon-container';
    
    // Clone the cart icon for mobile menu
    const cartIconClone = cartIcon.cloneNode(true);
    cartIconClone.id = 'cart-icon-mobile'; // Use different ID to avoid conflicts
    cartContainer.appendChild(cartIconClone);
    
    // Insert at the beginning of mobile menu for top-right positioning
    mobileMenu.insertBefore(cartContainer, mobileMenu.firstChild);
    
    // Attach event listener to the mobile cart icon
    cartIconClone.addEventListener('click', function(e) {
      e.preventDefault();
      if (window.CartUI) {
        window.CartUI.open();
      }
    });
    
    // Update mobile cart badge when cart updates
    if (window.Cart) {
      function updateMobileCartBadge() {
        const mobileBadge = cartIconClone.querySelector('#cart-badge');
        const desktopBadge = cartIcon.querySelector('#cart-badge');
        const count = window.Cart.getItemCount();
        
        if (mobileBadge) {
          mobileBadge.textContent = count;
          mobileBadge.style.display = count > 0 ? 'block' : 'none';
        }
        if (desktopBadge) {
          desktopBadge.textContent = count;
          desktopBadge.style.display = count > 0 ? 'block' : 'none';
        }
      }
      
      // Initial update
      updateMobileCartBadge();
      
      // Listen for cart updates
      window.addEventListener(window.Cart.EVENT_NAME, updateMobileCartBadge);
    }
  }

  /**
   * Initialize navigation
   */
  function initNavigation() {
    // Initialize mobile navigation
    initMobileNavigation();
    
    // Position cart icon in mobile menu (wait for cart to be initialized)
    // Only position on mobile screens
    function checkAndPosition() {
      if (window.innerWidth <= 768 && document.getElementById('cart-icon')) {
        positionCartIconInMobileMenu();
      }
    }
    
    if (document.getElementById('cart-icon')) {
      checkAndPosition();
    } else {
      // Wait for cart icon to be added
      const observer = new MutationObserver(function(mutations) {
        if (document.getElementById('cart-icon')) {
          checkAndPosition();
          observer.disconnect();
        }
      });
      
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      
      // Also check periodically as fallback
      setTimeout(checkAndPosition, 1000);
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation);
  } else {
    initNavigation();
  }

  // Re-check cart icon positioning after cart UI initializes (mobile only)
  if (window.CartUI) {
    // Cart UI already loaded, check immediately (only on mobile)
    setTimeout(function() {
      if (window.innerWidth <= 768) {
        positionCartIconInMobileMenu();
      }
    }, 100);
  } else {
    // Wait for CartUI to be available
    window.addEventListener('load', function() {
      setTimeout(function() {
        if (window.innerWidth <= 768) {
          positionCartIconInMobileMenu();
        }
      }, 500);
    });
  }
  
  // Re-check on window resize (only reposition on mobile)
  window.addEventListener('resize', function() {
    if (window.innerWidth <= 768) {
      positionCartIconInMobileMenu();
    } else {
      // On desktop, ensure cart icon is at the end (not moved to beginning)
      const mobileMenu = document.querySelector('.nav-links.mobile-menu');
      const cartIcon = document.getElementById('cart-icon');
      if (mobileMenu && cartIcon) {
        const cartIconLi = cartIcon.closest('li');
        if (cartIconLi && cartIconLi.classList.contains('cart-icon-container')) {
          // Remove container class and move to end on desktop
          cartIconLi.classList.remove('cart-icon-container');
          mobileMenu.appendChild(cartIconLi);
        }
      }
    }
  });

  // Export for external use
  window.Navigation = {
    init: initNavigation,
    positionCartIcon: positionCartIconInMobileMenu
  };

})();

