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
   * Update cart items with missing weights from PRODUCTS
   */
  function updateCartItemWeights() {
    if (!window.PRODUCTS) {
      return; // PRODUCTS not loaded yet
    }
    
    const cart = getCart();
    let updated = false;
    
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      // If weight is missing or 0, try to get it from PRODUCTS
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
   * Add item to cart
   */
  function addToCart(product) {
    const cart = getCart();
    
    // Validate product data
    if (!product.productId || !product.name || !product.price) {
      console.error('Invalid product data:', product);
      return false;
    }

    // If weight is missing, try to get it from PRODUCTS
    if (!product.weight || parseFloat(product.weight) === 0) {
      if (window.PRODUCTS && window.PRODUCTS[product.productId]) {
        product.weight = window.PRODUCTS[product.productId].weight || 0;
      }
    }

    // Check if product already in cart
    const existingIndex = cart.items.findIndex(
      item => item.productId === product.productId
    );

    if (existingIndex >= 0) {
      // Update quantity
      cart.items[existingIndex].quantity += (product.quantity || 1);
      // Update weight if provided
      if (product.weight) {
        cart.items[existingIndex].weight = parseFloat(product.weight) || 0;
      }
    } else {
      // Add new item
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
    cart.items = cart.items.filter(item => item.productId !== productId);
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
    const item = cart.items.find(item => item.productId === productId);
    
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
    getCart: getCartData,
    EVENT_NAME: CART_EVENT_NAME
  };

})();

