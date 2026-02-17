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
   * Position cart icon correctly in navigation menu
   * Desktop: after Contact link
   * Mobile: at top of mobile menu
   */
  function positionCartIconInMobileMenu() {
    const mobileMenu = document.querySelector('.nav-links.mobile-menu') || document.querySelector('ul.mobile-menu');
    const cartIcon = document.getElementById('cart-icon');
    
    if (!mobileMenu || !cartIcon) {
      return; // Elements not found
    }
    
    const isDesktop = window.innerWidth > 768;
    const cartIconLi = cartIcon.closest('li');
    
    if (!cartIconLi) {
      return; // Cart icon not in a list item
    }
    
    // Ensure cart icon container has the class
    if (!cartIconLi.classList.contains('cart-icon-container')) {
      cartIconLi.classList.add('cart-icon-container');
    }
    
    // Ensure cart icon has the cart-icon class for CSS styling
    if (!cartIcon.classList.contains('cart-icon')) {
      cartIcon.classList.add('cart-icon');
    }
    
    // Check if cart icon is already in the mobile menu
    const cartIconInMobileMenu = mobileMenu.contains(cartIcon);
    
    if (cartIconInMobileMenu) {
      if (isDesktop) {
        // Desktop: position after Contact link
        const contactLink = mobileMenu.querySelector('a[href*="contact"], a[href*="Contact"], a[href="#contact"]');
        if (contactLink) {
          const contactLi = contactLink.closest('li');
          if (contactLi && contactLi !== cartIconLi && contactLi.nextSibling !== cartIconLi) {
            // Remove cart icon from current position
            cartIconLi.remove();
            // Insert after Contact
            if (contactLi.nextSibling) {
              mobileMenu.insertBefore(cartIconLi, contactLi.nextSibling);
            } else {
              mobileMenu.appendChild(cartIconLi);
            }
          }
        }
      } else {
        // Mobile: position at top
        if (cartIconLi !== mobileMenu.firstChild) {
          mobileMenu.insertBefore(cartIconLi, mobileMenu.firstChild);
        }
      }
      return;
    }
    
    // Cart icon is not in mobile menu yet - this shouldn't happen if cart-ui.js ran first
    // But handle it anyway for robustness
    if (!isDesktop) {
      const cartContainer = document.createElement('li');
      cartContainer.className = 'cart-icon-container';
      
      // Clone the cart icon for mobile menu
      const cartIconClone = cartIcon.cloneNode(true);
      cartIconClone.id = 'cart-icon-mobile'; // Use different ID to avoid conflicts
      // Ensure it has the cart-icon class for CSS styling
      cartIconClone.classList.add('cart-icon');
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
    } else {
      // On desktop, ensure cart icon in mobile menu has container class for CSS
      // (even though it won't be visible, it ensures consistency)
      const cartIconInMobileMenu = mobileMenu.contains(cartIcon);
      if (cartIconInMobileMenu) {
        const cartIconLi = cartIcon.closest('li');
        if (cartIconLi && !cartIconLi.classList.contains('cart-icon-container')) {
          cartIconLi.classList.add('cart-icon-container');
        }
      }
    }
  }

  /**
   * Initialize navigation
   */
  function initNavigation() {
    // Initialize mobile navigation
    initMobileNavigation();
    
    // Position cart icon in mobile menu (wait for cart to be initialized)
    // Always check and position - function handles mobile/desktop logic internally
    function checkAndPosition() {
      if (document.getElementById('cart-icon')) {
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

  // Re-check cart icon positioning after cart UI initializes
  if (window.CartUI) {
    // Cart UI already loaded, check immediately
    setTimeout(function() {
      positionCartIconInMobileMenu();
    }, 100);
  } else {
    // Wait for CartUI to be available
    window.addEventListener('load', function() {
      setTimeout(function() {
        positionCartIconInMobileMenu();
      }, 500);
    });
  }
  
  // Re-check on window resize to reposition cart icon correctly
  let resizeTimeout;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      positionCartIconInMobileMenu();
    }, 150);
  });

  // Export for external use
  window.Navigation = {
    init: initNavigation,
    positionCartIcon: positionCartIconInMobileMenu
  };

})();

