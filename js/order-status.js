/**
 * Order Status Page
 * Fetches and displays order status from Google Sheets via Google App Script
 */

(function() {
  'use strict';

  const config = window.AGROVERSE_CONFIG || {};

  /**
   * Get session ID from URL
   */
  function getSessionIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('session_id');
  }

  /**
   * Fetch order status from Google App Script
   */
  async function fetchOrderStatus(sessionId) {
    const scriptUrl = config.googleScriptUrl;
    
    if (!scriptUrl || scriptUrl.includes('YOUR_')) {
      throw new Error('Google App Script URL not configured');
    }

    const url = `${scriptUrl}?action=getOrderStatus&sessionId=${encodeURIComponent(sessionId)}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch order status');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data.order || null;
    } catch (error) {
      console.error('Error fetching order status:', error);
      throw error;
    }
  }

  /**
   * Format date
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Get tracking URL based on tracking number format
   */
  function getTrackingUrl(trackingNumber) {
    if (!trackingNumber) return null;

    const trimmed = trackingNumber.trim().toUpperCase();

    // USPS tracking (starts with numbers, ends with US)
    if (/^\d+[A-Z]{2}\d+US$/.test(trimmed)) {
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trimmed}`;
    }

    // UPS tracking (starts with 1Z)
    if (trimmed.startsWith('1Z')) {
      return `https://www.ups.com/track?tracknum=${trimmed}`;
    }

    // FedEx tracking (12 digits)
    if (/^\d{12}$/.test(trimmed)) {
      return `https://www.fedex.com/fedextrack/?trknbr=${trimmed}`;
    }

    // Default: try USPS
    return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trimmed}`;
  }

  /**
   * Get status badge class
   */
  function getStatusClass(status) {
    const statusMap = {
      'Placed': 'status-placed',
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Delivered': 'status-delivered'
    };
    return statusMap[status] || 'status-placed';
  }

  /**
   * Display order status
   */
  function displayOrderStatus(order) {
    const container = document.getElementById('order-status-container');
    if (!container) return;

    const items = order.items || [];
    const itemsHtml = items.map(item => `
      <div class="order-item">
        <div class="order-item-name">${item.name || 'Product'}</div>
        <div class="order-item-details">
          <span>Quantity: ${item.quantity || 1}</span>
          <span class="order-item-price">$${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
        </div>
      </div>
    `).join('');

    const trackingUrl = getTrackingUrl(order.trackingNumber);
    const trackingHtml = order.trackingNumber 
      ? `
        <div class="order-tracking">
          <h3>Tracking Information</h3>
          <p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>
          ${trackingUrl ? `<a href="${trackingUrl}" target="_blank" class="tracking-link">Track Package →</a>` : ''}
        </div>
      `
      : '<p class="order-tracking-note">Tracking information will be available once your order ships.</p>';

    container.innerHTML = `
      <div class="order-status-header">
        <h1>Order Status</h1>
        <div class="order-status-badge ${getStatusClass(order.status)}">
          ${order.status || 'Placed'}
        </div>
      </div>

      <div class="order-details">
        <div class="order-section">
          <h2>Order Information</h2>
          <div class="order-info-row">
            <span class="order-info-label">Order Number:</span>
            <span class="order-info-value">${order.sessionId || 'N/A'}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-label">Order Date:</span>
            <span class="order-info-value">${formatDate(order.date)}</span>
          </div>
          <div class="order-info-row">
            <span class="order-info-label">Status:</span>
            <span class="order-info-value">${order.status || 'Placed'}</span>
          </div>
        </div>

        <div class="order-section">
          <h2>Items</h2>
          <div class="order-items">
            ${itemsHtml}
          </div>
        </div>

        <div class="order-section">
          <h2>Shipping Address</h2>
          <div class="shipping-address">
            ${order.shippingAddress ? `
              <p>${order.shippingAddress.fullName || ''}</p>
              <p>${order.shippingAddress.address || ''}</p>
              <p>${order.shippingAddress.city || ''}, ${order.shippingAddress.state || ''} ${order.shippingAddress.zip || ''}</p>
              <p>${order.shippingAddress.country || 'USA'}</p>
            ` : 'N/A'}
          </div>
        </div>

        ${trackingHtml}
      </div>

      <div class="order-actions">
        <a href="${config.baseUrl || '/'}" class="cta-button">Continue Shopping</a>
        <a href="${config.baseUrl || '/'}/order-history/" class="cta-button" style="margin-left: 1rem; background-color: var(--color-secondary);">View Order History</a>
      </div>
      
      ${generateRecentOrdersSection(order.sessionId)}
    `;
  }

  /**
   * Generate recent orders section (excluding current order)
   */
  function generateRecentOrdersSection(currentSessionId) {
    if (!window.OrderHistory) {
      return '';
    }

    const orderHistory = window.OrderHistory.getOrderHistory();
    if (!orderHistory || orderHistory.length === 0) {
      return '';
    }

    // Filter out current order and get up to 3 recent orders
    const recentOrders = orderHistory
      .filter(order => order.sessionId !== currentSessionId)
      .slice(0, 3);

    if (recentOrders.length === 0) {
      return '';
    }

    const ordersHtml = recentOrders.map(order => {
      const statusClass = window.OrderHistory.getStatusClass(order.status);
      return `
        <div class="recent-order-item">
          <div class="recent-order-info">
            <h4>${order.firstItemName}${order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ''}</h4>
            <p class="recent-order-date">${window.OrderHistory.formatDate(order.date)}</p>
          </div>
          <div class="recent-order-meta">
            <span class="recent-order-status ${statusClass}">${order.status}</span>
            <span class="recent-order-amount">$${order.amount.toFixed(2)}</span>
          </div>
          <a href="${config.baseUrl || ''}/order-status/?session_id=${order.sessionId}" class="recent-order-link">View →</a>
        </div>
      `;
    }).join('');

    return `
      <div class="recent-orders-section">
        <h2>Recent Orders</h2>
        <div class="recent-orders-list">
          ${ordersHtml}
        </div>
        <div class="recent-orders-footer">
          <a href="${config.baseUrl || '/'}/order-history/" class="recent-orders-link">View All Orders →</a>
        </div>
      </div>
    `;
  }

  /**
   * Display error state
   */
  function displayError(message) {
    const container = document.getElementById('order-status-container');
    if (!container) return;

    container.innerHTML = `
      <div class="order-error">
        <h2>Unable to Load Order</h2>
        <p>${message}</p>
        <p>Please check your order number and try again, or <a href="mailto:info@agroverse.shop">contact us</a> for assistance.</p>
        <a href="${config.baseUrl || '/'}" class="cta-button">Return to Home</a>
      </div>
    `;
  }

  /**
   * Display loading state
   */
  function displayLoading() {
    const container = document.getElementById('order-status-container');
    if (!container) return;

    container.innerHTML = `
      <div class="order-loading">
        <div class="loading-spinner"></div>
        <p>Loading order status...</p>
      </div>
    `;
  }

  /**
   * Clear shopping cart (order completed)
   */
  function clearCart() {
    if (window.Cart && typeof window.Cart.clear === 'function') {
      window.Cart.clear();
    } else if (window.Cart && typeof window.Cart.clearCart === 'function') {
      window.Cart.clearCart();
    } else {
      // Fallback: clear localStorage directly
      try {
        localStorage.removeItem('agroverse_cart');
        // Dispatch event to update cart UI
        window.dispatchEvent(new CustomEvent('cartUpdated'));
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }
  }

  /**
   * Save order to order history
   */
  function saveOrderToHistory(order) {
    if (window.OrderHistory && typeof window.OrderHistory.saveOrderToHistory === 'function') {
      window.OrderHistory.saveOrderToHistory(order);
    } else {
      console.warn('OrderHistory utility not loaded');
    }
  }

  /**
   * Initialize order status page
   */
  async function initOrderStatus() {
    const sessionId = getSessionIdFromUrl();

    if (!sessionId) {
      displayError('No order number provided. Please check your order confirmation email for the order number.');
      return;
    }

    displayLoading();

    try {
      const order = await fetchOrderStatus(sessionId);
      
      if (!order) {
        displayError('Order not found. Please verify your order number.');
        return;
      }

      // Clear cart since order is completed
      clearCart();
      
      // Save order to history
      saveOrderToHistory(order);

      displayOrderStatus(order);
    } catch (error) {
      console.error('Order status error:', error);
      displayError(error.message || 'Failed to load order status. Please try again later.');
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOrderStatus);
  } else {
    initOrderStatus();
  }

  // Export for external use
  window.OrderStatus = {
    fetchOrderStatus: fetchOrderStatus,
    getSessionIdFromUrl: getSessionIdFromUrl
  };

})();

