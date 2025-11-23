/**
 * Shopping Cart Management
 * Handles cart operations using localStorage
 */

(function() {
  'use strict';

  const CART_STORAGE_KEY = 'agroverse_cart';
  const CART_EVENT_NAME = 'cartUpdated';

  /**
   * Generate unique session ID
   */
  function generateSessionId() {
    return `cart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get cart from localStorage
   */
  function getCart() {
    try {
      const cartData = localStorage.getItem(CART_STORAGE_KEY);
      if (!cartData) {
        return {
          sessionId: generateSessionId(),
          items: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      return JSON.parse(cartData);
    } catch (error) {
      console.error('Error reading cart:', error);
      return {
        sessionId: generateSessionId(),
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    }
  }

  /**
   * Save cart to localStorage
   */
  function saveCart(cart) {
    try {
      cart.updatedAt = new Date().toISOString();
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
      
      // Dispatch custom event for UI updates
      window.dispatchEvent(new CustomEvent(CART_EVENT_NAME, {
        detail: { cart: cart }
      }));
      
      return true;
    } catch (error) {
      console.error('Error saving cart:', error);
      return false;
    }
  }

  /**
   * Normalize and deduplicate cart items
   */
  function normalizeCartItems() {
    const cart = getCart();
    let updated = false;
    const seenIds = new Map();
    
    // Normalize product IDs and merge duplicates
    const normalizedItems = [];
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const normalizedId = normalizeProductId(item.productId);
      
      if (!normalizedId) {
        continue; // Skip invalid items
      }
      
      // Update item with normalized ID
      if (item.productId !== normalizedId) {
        item.productId = normalizedId;
        updated = true;
      }
      
      // Check if we've seen this product ID before
      if (seenIds.has(normalizedId)) {
        // Merge with existing item
        const existingIndex = seenIds.get(normalizedId);
        normalizedItems[existingIndex].quantity += (item.quantity || 1);
        updated = true;
      } else {
        // Add new item
        seenIds.set(normalizedId, normalizedItems.length);
        normalizedItems.push(item);
      }
    }
    
    // Update with canonical product data if available
    if (window.PRODUCTS) {
      for (let i = 0; i < normalizedItems.length; i++) {
        const item = normalizedItems[i];
        const product = window.PRODUCTS[item.productId];
        if (product) {
          // Update with canonical data
          if (item.name !== product.name) {
            item.name = product.name;
            updated = true;
          }
          if (item.price !== product.price) {
            item.price = product.price;
            updated = true;
          }
          if (product.image && item.image !== product.image) {
            item.image = product.image;
            updated = true;
          }
          if (!item.weight || parseFloat(item.weight) === 0) {
            item.weight = product.weight || 0;
            updated = true;
          }
        }
      }
    }
    
    if (updated || normalizedItems.length !== cart.items.length) {
      cart.items = normalizedItems;
      saveCart(cart);
    }
  }

  /**
   * Update cart items with missing weights from PRODUCTS
   */
  function updateCartItemWeights() {
    if (!window.PRODUCTS) {
      return; // PRODUCTS not loaded yet
    }
    
    // First normalize and deduplicate
    normalizeCartItems();
    
    const cart = getCart();
    let updated = false;
    
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      // If weight is still missing or 0, try to get it from PRODUCTS
      if (!item.weight || parseFloat(item.weight) === 0) {
        const product = window.PRODUCTS[item.productId];
        if (product && product.weight) {
          item.weight = parseFloat(product.weight);
          updated = true;
        }
      }
    }
    
    if (updated) {
      saveCart(cart);
    }
  }

  /**
   * Normalize product ID to ensure consistency
   */
  function normalizeProductId(productId) {
    if (!productId) return null;
    
    // Trim whitespace
    productId = productId.trim();
    
    // Map known variations to canonical IDs
    const idMappings = {
      'ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g': 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
      'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g'
    };
    
    return idMappings[productId] || productId;
  }

  /**
   * Add item to cart
   */
  function addToCart(product) {
    const cart = getCart();
    
    // Validate product data
    if (!product.productId || !product.name || !product.price) {
      console.error('Invalid product data:', product);
      return false;
    }

    // Normalize product ID to prevent duplicates
    product.productId = normalizeProductId(product.productId);
    if (!product.productId) {
      console.error('Invalid product ID after normalization');
      return false;
    }

    // Get canonical product data from PRODUCTS if available (ensures consistency)
    if (window.PRODUCTS && window.PRODUCTS[product.productId]) {
      const canonicalProduct = window.PRODUCTS[product.productId];
      // Use canonical data but preserve quantity
      product = {
        productId: canonicalProduct.productId,
        name: canonicalProduct.name,
        price: canonicalProduct.price,
        image: canonicalProduct.image || product.image,
        stripePriceId: canonicalProduct.stripePriceId || product.stripePriceId,
        weight: canonicalProduct.weight || product.weight || 0,
        quantity: product.quantity || 1
      };
    }

    // If weight is missing, try to get it from PRODUCTS
    if (!product.weight || parseFloat(product.weight) === 0) {
      if (window.PRODUCTS && window.PRODUCTS[product.productId]) {
        product.weight = window.PRODUCTS[product.productId].weight || 0;
      }
    }

    // Check if product already in cart (use normalized ID)
    const existingIndex = cart.items.findIndex(
      item => normalizeProductId(item.productId) === product.productId
    );

    if (existingIndex >= 0) {
      // Update existing item - use canonical data to prevent inconsistencies
      const existingItem = cart.items[existingIndex];
      existingItem.quantity += (product.quantity || 1);
      // Update with canonical data if available
      if (window.PRODUCTS && window.PRODUCTS[product.productId]) {
        const canonicalProduct = window.PRODUCTS[product.productId];
        existingItem.productId = canonicalProduct.productId; // Ensure normalized ID
        existingItem.name = canonicalProduct.name; // Use canonical name
        existingItem.price = canonicalProduct.price; // Use canonical price
        existingItem.image = canonicalProduct.image || existingItem.image; // Prefer canonical image
        existingItem.weight = canonicalProduct.weight || existingItem.weight || 0;
      } else if (product.weight) {
        existingItem.weight = parseFloat(product.weight) || 0;
      }
    } else {
      // Add new item with normalized data
      cart.items.push({
        productId: product.productId,
        name: product.name,
        price: parseFloat(product.price),
        quantity: product.quantity || 1,
        image: product.image || '',
        stripePriceId: product.stripePriceId || '',
        weight: parseFloat(product.weight) || 0 // Weight in ounces for shipping calculation
      });
    }

    return saveCart(cart);
  }

  /**
   * Remove item from cart
   */
  function removeFromCart(productId) {
    const cart = getCart();
    const normalizedId = normalizeProductId(productId);
    cart.items = cart.items.filter(item => normalizeProductId(item.productId) !== normalizedId);
    return saveCart(cart);
  }

  /**
   * Update item quantity
   */
  function updateQuantity(productId, quantity) {
    if (quantity <= 0) {
      return removeFromCart(productId);
    }

    const cart = getCart();
    const normalizedId = normalizeProductId(productId);
    const item = cart.items.find(item => normalizeProductId(item.productId) === normalizedId);
    
    if (item) {
      item.quantity = parseInt(quantity, 10);
      return saveCart(cart);
    }
    
    return false;
  }

  /**
   * Clear cart
   */
  function clearCart() {
    const cart = {
      sessionId: generateSessionId(),
      items: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    return saveCart(cart);
  }

  /**
   * Get cart item count
   */
  function getCartItemCount() {
    const cart = getCart();
    return cart.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Calculate subtotal
   */
  function calculateSubtotal() {
    const cart = getCart();
    return cart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  /**
   * Get cart data
   */
  function getCartData() {
    return getCart();
  }

  // Export public API
  // Update cart weights when PRODUCTS is available
  if (window.PRODUCTS) {
    updateCartItemWeights();
  } else {
    // Wait for PRODUCTS to load
    const checkProducts = setInterval(function() {
      if (window.PRODUCTS) {
        updateCartItemWeights();
        clearInterval(checkProducts);
      }
    }, 100);
    // Stop checking after 5 seconds
    setTimeout(function() {
      clearInterval(checkProducts);
    }, 5000);
  }

  window.Cart = {
    add: addToCart,
    remove: removeFromCart,
    updateQuantity: updateQuantity,
    clear: clearCart,
    getItemCount: getCartItemCount,
    getSubtotal: calculateSubtotal,
    updateWeights: updateCartItemWeights,
    normalize: normalizeCartItems,
    getCart: getCartData,
    EVENT_NAME: CART_EVENT_NAME
  };

  // Normalize cart on load to fix any legacy duplicates
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(normalizeCartItems, 500); // Wait a bit for PRODUCTS to load
    });
  } else {
    setTimeout(normalizeCartItems, 500);
  }

})();

