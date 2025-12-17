/**
 * Google Analytics 4 (GA4) Events Tracking
 * Implements recommended events for e-commerce and general properties
 * Based on: https://support.google.com/analytics/answer/9267735
 */

(function() {
  'use strict';

  /**
   * Check if gtag is available
   */
  function isGtagAvailable() {
    return typeof gtag !== 'undefined' && typeof window.dataLayer !== 'undefined';
  }

  /**
   * Send GA4 event
   */
  function sendEvent(eventName, eventParams) {
    if (!isGtagAvailable()) {
      console.warn('GA4 gtag not available, event not sent:', eventName);
      return;
    }

    try {
      gtag('event', eventName, eventParams);
      console.log('GA4 event sent:', eventName, eventParams);
    } catch (error) {
      console.error('Error sending GA4 event:', error);
    }
  }

  /**
   * Format product data for GA4 events
   */
  function formatProductData(product) {
    if (!product) return null;

    return {
      item_id: product.productId || '',
      item_name: product.name || '',
      item_category: product.category || 'retail',
      price: parseFloat(product.price) || 0,
      quantity: parseInt(product.quantity) || 1
    };
  }

  /**
   * Format cart items for GA4 events
   */
  function formatCartItems(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return [];
    }

    return cart.items.map(item => ({
      item_id: item.productId || '',
      item_name: item.name || '',
      item_category: item.category || 'retail',
      price: parseFloat(item.price) || 0,
      quantity: parseInt(item.quantity) || 1
    }));
  }

  /**
   * Calculate cart value
   */
  function calculateCartValue(cart) {
    if (!cart || !cart.items || cart.items.length === 0) {
      return 0;
    }

    return cart.items.reduce((total, item) => {
      return total + (parseFloat(item.price) || 0) * (parseInt(item.quantity) || 1);
    }, 0);
  }

  /**
   * VIEW_ITEM - When user views a product page
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#view_item
   */
  window.trackViewItem = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('view_item', {
      currency: 'USD',
      value: productData.price,
      items: [productData]
    });
  };

  /**
   * VIEW_ITEM_LIST - When user views a list of items (category page)
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#view_item_list
   */
  window.trackViewItemList = function(items, listName) {
    if (!items || items.length === 0) return;

    const formattedItems = items.map(item => formatProductData(item)).filter(Boolean);

    sendEvent('view_item_list', {
      item_list_name: listName || 'Product List',
      item_list_id: listName || 'default',
      items: formattedItems
    });
  };

  /**
   * SELECT_ITEM - When user selects an item from a list
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#select_item
   */
  window.trackSelectItem = function(product, listName) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('select_item', {
      item_list_name: listName || 'Product List',
      item_list_id: listName || 'default',
      items: [productData]
    });
  };

  /**
   * ADD_TO_CART - When user adds item to cart
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#add_to_cart
   */
  window.trackAddToCart = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('add_to_cart', {
      currency: 'USD',
      value: productData.price * productData.quantity,
      items: [productData]
    });
  };

  /**
   * REMOVE_FROM_CART - When user removes item from cart
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#remove_from_cart
   */
  window.trackRemoveFromCart = function(product) {
    if (!product) return;

    const productData = formatProductData(product);
    if (!productData) return;

    sendEvent('remove_from_cart', {
      currency: 'USD',
      value: productData.price * productData.quantity,
      items: [productData]
    });
  };

  /**
   * VIEW_CART - When user views their cart
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#view_cart
   */
  window.trackViewCart = function(cart) {
    if (!cart) return;

    const items = formatCartItems(cart);
    const value = calculateCartValue(cart);

    sendEvent('view_cart', {
      currency: 'USD',
      value: value,
      items: items
    });
  };

  /**
   * BEGIN_CHECKOUT - When user begins checkout
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#begin_checkout
   */
  window.trackBeginCheckout = function(cart) {
    if (!cart) return;

    const items = formatCartItems(cart);
    const value = calculateCartValue(cart);

    sendEvent('begin_checkout', {
      currency: 'USD',
      value: value,
      items: items
    });
  };

  /**
   * ADD_SHIPPING_INFO - When user adds shipping information
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#add_shipping_info
   */
  window.trackAddShippingInfo = function(cart, shippingTier) {
    if (!cart) return;

    const items = formatCartItems(cart);
    const value = calculateCartValue(cart);

    sendEvent('add_shipping_info', {
      currency: 'USD',
      value: value,
      shipping_tier: shippingTier || 'standard',
      items: items
    });
  };

  /**
   * ADD_PAYMENT_INFO - When user adds payment information
   * Note: This is typically tracked when user enters payment info in Stripe
   * We'll track it when checkout session is created
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#add_payment_info
   */
  window.trackAddPaymentInfo = function(cart, paymentType) {
    if (!cart) return;

    const items = formatCartItems(cart);
    const value = calculateCartValue(cart);

    sendEvent('add_payment_info', {
      currency: 'USD',
      value: value,
      payment_type: paymentType || 'stripe',
      items: items
    });
  };

  /**
   * PURCHASE - When user completes a purchase
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#purchase
   */
  window.trackPurchase = function(transactionId, cart, shipping, tax) {
    if (!cart || !transactionId) return;

    const items = formatCartItems(cart);
    const value = calculateCartValue(cart);
    const totalValue = value + (parseFloat(shipping) || 0) + (parseFloat(tax) || 0);

    sendEvent('purchase', {
      transaction_id: transactionId,
      value: totalValue,
      currency: 'USD',
      shipping: parseFloat(shipping) || 0,
      tax: parseFloat(tax) || 0,
      items: items
    });
  };

  /**
   * SEARCH - When user searches the site
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#search
   */
  window.trackSearch = function(searchTerm) {
    if (!searchTerm) return;

    sendEvent('search', {
      search_term: searchTerm
    });
  };

  /**
   * GENERATE_LEAD - When user submits a form or request for information
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#generate_lead
   */
  window.trackGenerateLead = function(value, currency) {
    sendEvent('generate_lead', {
      currency: currency || 'USD',
      value: parseFloat(value) || 0
    });
  };

  /**
   * SELECT_CONTENT - When user selects content
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#select_content
   */
  window.trackSelectContent = function(contentType, contentId) {
    sendEvent('select_content', {
      content_type: contentType,
      content_id: contentId
    });
  };

  /**
   * SHARE - When user shares content
   * https://developers.google.com/analytics/devguides/collection/ga4/reference/events#share
   */
  window.trackShare = function(method, contentType, contentId) {
    sendEvent('share', {
      method: method,
      content_type: contentType,
      content_id: contentId
    });
  };

  // Export for external use
  window.GA4Events = {
    trackViewItem: window.trackViewItem,
    trackViewItemList: window.trackViewItemList,
    trackSelectItem: window.trackSelectItem,
    trackAddToCart: window.trackAddToCart,
    trackRemoveFromCart: window.trackRemoveFromCart,
    trackViewCart: window.trackViewCart,
    trackBeginCheckout: window.trackBeginCheckout,
    trackAddShippingInfo: window.trackAddShippingInfo,
    trackAddPaymentInfo: window.trackAddPaymentInfo,
    trackPurchase: window.trackPurchase,
    trackSearch: window.trackSearch,
    trackGenerateLead: window.trackGenerateLead,
    trackSelectContent: window.trackSelectContent,
    trackShare: window.trackShare
  };

})();

