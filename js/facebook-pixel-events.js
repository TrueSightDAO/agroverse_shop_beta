/**
 * Facebook Pixel E-commerce Events
 * Implements standard Facebook Pixel events for e-commerce tracking
 * https://www.facebook.com/business/help/402791146561036
 */

(function() {
  'use strict';

  /**
   * Check if Facebook Pixel is available
   */
  function isFbqAvailable() {
    return typeof fbq !== 'undefined' && typeof window.fbq !== 'undefined';
  }

  /**
   * Send Facebook Pixel event
   */
  function sendEvent(eventName, eventParams) {
    if (!isFbqAvailable()) {
      console.warn('Facebook Pixel not available, event not sent:', eventName);
      return;
    }

    try {
      if (eventParams && Object.keys(eventParams).length > 0) {
        fbq('track', eventName, eventParams);
      } else {
        fbq('track', eventName);
      }
      console.log('Facebook Pixel event sent:', eventName, eventParams || '');
    } catch (error) {
      console.error('Error sending Facebook Pixel event:', error);
    }
  }

  /**
   * Format product data for Facebook Pixel events
   */
  function formatProductData(product) {
    if (!product) return null;

    return {
      content_ids: [product.productId || ''],
      content_name: product.name || '',
      content_type: 'product',
      content_category: product.category || 'retail',
      value: parseFloat(product.price) || 0,
      currency: 'USD'
    };
  }

  /**
   * Format cart items for Facebook Pixel events
   */
  function formatCartItems(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return {
        content_ids: [],
        contents: [],
        value: 0,
        currency: 'USD'
      };
    }

    const contentIds = [];
    const contents = [];
    let totalValue = 0;

    cart.items.forEach(item => {
      const itemId = item.productId || '';
      const itemName = item.name || '';
      const itemPrice = parseFloat(item.price) || 0;
      const quantity = parseInt(item.quantity) || 1;

      contentIds.push(itemId);
      contents.push({
        id: itemId,
        quantity: quantity,
        item_price: itemPrice
      });

      totalValue += itemPrice * quantity;
    });

    return {
      content_ids: contentIds,
      contents: contents,
      value: totalValue,
      currency: 'USD'
    };
  }

  /**
   * VIEW_CONTENT - When user views a product page
   * https://www.facebook.com/business/help/402791146561036
   */
  window.trackFacebookViewContent = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('ViewContent', productData);
  };

  /**
   * SEARCH - When user searches the site
   */
  window.trackFacebookSearch = function(searchTerm) {
    if (!searchTerm) return;

    sendEvent('Search', {
      search_string: searchTerm
    });
  };

  /**
   * ADD_TO_CART - When user adds item to cart
   */
  window.trackFacebookAddToCart = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('AddToCart', productData);
  };

  /**
   * REMOVE_FROM_CART - When user removes item from cart
   */
  window.trackFacebookRemoveFromCart = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('RemoveFromCart', productData);
  };

  /**
   * INITIATE_CHECKOUT - When user begins checkout
   */
  window.trackFacebookInitiateCheckout = function(cart) {
    if (!cart) return;

    const cartData = formatCartItems(cart);
    sendEvent('InitiateCheckout', cartData);
  };

  /**
   * ADD_PAYMENT_INFO - When user adds payment information
   */
  window.trackFacebookAddPaymentInfo = function(cart, paymentType) {
    if (!cart) return;

    const cartData = formatCartItems(cart);
    cartData.payment_type = paymentType || 'stripe';
    
    sendEvent('AddPaymentInfo', cartData);
  };

  /**
   * PURCHASE - When user completes a purchase
   */
  window.trackFacebookPurchase = function(transactionId, cart, shipping, tax) {
    if (!cart || !transactionId) return;

    const cartData = formatCartItems(cart);
    const totalValue = cartData.value + (parseFloat(shipping) || 0) + (parseFloat(tax) || 0);

    sendEvent('Purchase', {
      content_ids: cartData.content_ids,
      contents: cartData.contents,
      value: totalValue,
      currency: 'USD',
      num_items: cart.items ? cart.items.length : 0
    });
  };

  /**
   * LEAD - When user submits a form or request for information
   */
  window.trackFacebookLead = function(value) {
    sendEvent('Lead', {
      value: parseFloat(value) || 0,
      currency: 'USD'
    });
  };

  // Export for external use
  window.FacebookPixelEvents = {
    trackViewContent: window.trackFacebookViewContent,
    trackSearch: window.trackFacebookSearch,
    trackAddToCart: window.trackFacebookAddToCart,
    trackRemoveFromCart: window.trackFacebookRemoveFromCart,
    trackInitiateCheckout: window.trackFacebookInitiateCheckout,
    trackAddPaymentInfo: window.trackFacebookAddPaymentInfo,
    trackPurchase: window.trackFacebookPurchase,
    trackLead: window.trackFacebookLead
  };

})();

