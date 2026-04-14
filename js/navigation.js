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
        // Reset panel scroll so the first link is inside the scrollable viewport (Playwright + short viewports).
        mobileMenu.scrollTop = 0;
        var firstMenuLink = mobileMenu.querySelector('a');
        if (firstMenuLink && typeof firstMenuLink.scrollIntoView === 'function') {
          requestAnimationFrame(function() {
            firstMenuLink.scrollIntoView({ block: 'nearest', inline: 'nearest' });
          });
        }
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

  function repositionCartIcon() {
    if (typeof window.AgroverseRepositionCart === 'function') {
      window.AgroverseRepositionCart();
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
        repositionCartIcon();
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
    setTimeout(function() {
      repositionCartIcon();
    }, 100);
  } else {
    window.addEventListener('load', function() {
      setTimeout(function() {
        repositionCartIcon();
      }, 500);
    });
  }

  window.Navigation = {
    init: initNavigation,
    positionCartIcon: repositionCartIcon
  };

})();

