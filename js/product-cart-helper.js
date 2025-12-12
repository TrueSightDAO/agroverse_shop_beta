/**
 * Product Cart Helper
 * Provides helper functions to add "Add to Cart" buttons dynamically
 * and handles product data from products.js
 */

(function() {
  'use strict';

  /**
   * Create "Add to Cart" button HTML
   */
  function createAddToCartButton(product, options = {}) {
    const priceText = product.price > 0 
      ? `$${product.price.toFixed(2)}` 
      : 'Contact for Pricing';
    
    const buttonText = options.buttonText || `Add to Cart${product.price > 0 ? ` - ${priceText}` : ''}`;
    const buttonClass = options.buttonClass || 'cta-button add-to-cart-btn';
    const style = options.style || '';

    return `
      <button class="${buttonClass} add-to-cart-btn" 
              data-product-id="${product.productId}"
              data-product-name="${product.name}"
              data-product-price="${product.price}"
              data-product-image="${product.image}"
              data-stripe-price-id="${product.stripePriceId}"
              ${style ? `style="${style}"` : ''}>
        ${buttonText}
      </button>
    `;
  }

  /**
   * Add "Add to Cart" button to product cards on category pages
   */
  function addToCartToCategoryCards() {
    // Wait for products.js to load
    if (typeof window.PRODUCTS === 'undefined') {
      setTimeout(addToCartToCategoryCards, 100);
      return;
    }

    const productCards = document.querySelectorAll('.product-card');
    productCards.forEach(card => {
      // Skip if already has add to cart button
      if (card.querySelector('.add-to-cart-btn')) {
        return;
      }

      const link = card.querySelector('.product-card-link');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Extract product ID from URL
      const productId = extractProductIdFromUrl(href);
      if (!productId) return;

      const product = window.getProduct(productId);
      if (!product) return;

      // Find price element to get price
      const priceEl = card.querySelector('.price');
      if (priceEl) {
        const priceText = priceEl.textContent.trim();
        if (priceText.includes('Contact')) {
          product.price = 0; // Wholesale product
        }
      }

      // Create add to cart button
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'product-card-actions';
      buttonContainer.style.cssText = 'padding: 1rem 1.5rem; border-top: 1px solid #eee;';
      
      const button = document.createElement('button');
      button.className = 'add-to-cart-btn product-card-add-btn';
      button.setAttribute('data-product-id', product.productId);
      button.setAttribute('data-product-name', product.name);
      button.setAttribute('data-product-price', product.price);
      button.setAttribute('data-product-image', product.image);
      button.setAttribute('data-stripe-price-id', product.stripePriceId);
      button.textContent = product.price > 0 ? `Add to Cart - $${product.price.toFixed(2)}` : 'Add to Cart';
      button.style.cssText = 'width: 100%; padding: 0.75rem; background-color: var(--color-primary, #3b3333); color: white; border: none; border-radius: 5px; font-weight: 600; cursor: pointer; transition: background-color 0.3s;';
      
      button.addEventListener('mouseenter', function() {
        this.style.backgroundColor = 'var(--color-secondary, #4d4d4d)';
      });
      button.addEventListener('mouseleave', function() {
        this.style.backgroundColor = 'var(--color-primary, #3b3333)';
      });

      buttonContainer.appendChild(button);
      card.appendChild(buttonContainer);
    });
  }

  /**
   * Extract product ID from URL
   */
  function extractProductIdFromUrl(url) {
    // Match product page URLs
    const patterns = [
      /product-page\/([^\/]+)/,
      /product-page\/([^\/]+)\/index\.html/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const slug = match[1];
        // Map URL slugs to product IDs
        const slugToId = {
          'ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g': 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
          'taste-of-rainforest-200-grams-caramelized-cacao-beans': 'taste-of-rainforest-caramelized-cacao-beans',
          'oscar-s-bahia-ceremonial-cacao': 'oscar-bahia-ceremonial-cacao-200g',
          '8-ounce-organic-cacao-nibs-from-brazil': '8-ounce-organic-cacao-nibs',
          'organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm': 'organic-criollo-cacao-beans-oscar-farm',
          'organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram': 'organic-hybrid-cacao-beans-jesus-da-deus',
          'organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm': 'organic-criollo-cacao-nibs-oscar-farm',
          'premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far': 'premium-organic-cacao-beans-la-do-sitio'
        };
        return slugToId[slug] || slug;
      }
    }
    return null;
  }

  /**
   * Initialize product cart helpers
   */
  function init() {
    // Add to cart buttons to category pages
    if (document.querySelector('.products-grid') || document.querySelector('.product-gallery')) {
      addToCartToCategoryCards();
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export for external use
  window.ProductCartHelper = {
    createAddToCartButton: createAddToCartButton,
    extractProductIdFromUrl: extractProductIdFromUrl,
    addToCartToCategoryCards: addToCartToCategoryCards
  };

})();







