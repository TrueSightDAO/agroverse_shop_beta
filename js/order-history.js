/**
 * Order History Management
 * Handles storing and retrieving order history from localStorage
 */

(function() {
  'use strict';

  const ORDER_HISTORY_KEY = 'agroverse_order_history';
  const MAX_ORDERS = 50;

  /**
   * Get all orders from history
   */
  function getOrderHistory() {
    try {
      const historyData = localStorage.getItem(ORDER_HISTORY_KEY);
      if (!historyData) {
        return [];
      }
      return JSON.parse(historyData);
    } catch (error) {
      console.error('Error reading order history:', error);
      return [];
    }
  }

  /**
   * Save order to history
   */
  function saveOrderToHistory(order) {
    try {
      let orderHistory = getOrderHistory();
      
      // Check if order already exists in history
      const existingIndex = orderHistory.findIndex(o => o.sessionId === order.sessionId);
      
      // Create order summary for history
      const firstItem = order.items && order.items.length > 0 ? order.items[0] : null;
      const orderSummary = {
        sessionId: order.sessionId,
        date: order.date,
        status: order.status || 'Placed',
        amount: order.amount,
        currency: order.currency || 'USD',
        itemCount: order.items ? order.items.reduce((sum, item) => sum + (item.quantity || 1), 0) : 0,
        firstItemName: firstItem ? firstItem.name : 'Product',
        firstItemImage: firstItem && firstItem.image ? firstItem.image : null
      };
      
      if (existingIndex >= 0) {
        // Update existing order
        orderHistory[existingIndex] = orderSummary;
      } else {
        // Add new order (at the beginning - most recent first)
        orderHistory.unshift(orderSummary);
      }
      
      // Keep only last MAX_ORDERS orders
      if (orderHistory.length > MAX_ORDERS) {
        orderHistory = orderHistory.slice(0, MAX_ORDERS);
      }
      
      // Save back to localStorage
      localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orderHistory));
      
      // Dispatch event for order history update
      window.dispatchEvent(new CustomEvent('orderHistoryUpdated', { 
        detail: { orderHistory: orderHistory } 
      }));
      
      return true;
    } catch (error) {
      console.error('Error saving order to history:', error);
      return false;
    }
  }

  /**
   * Get a specific order from history by session ID
   */
  function getOrderFromHistory(sessionId) {
    const orderHistory = getOrderHistory();
    return orderHistory.find(o => o.sessionId === sessionId) || null;
  }

  /**
   * Clear order history
   */
  function clearOrderHistory() {
    try {
      localStorage.removeItem(ORDER_HISTORY_KEY);
      window.dispatchEvent(new CustomEvent('orderHistoryUpdated', { 
        detail: { orderHistory: [] } 
      }));
      return true;
    } catch (error) {
      console.error('Error clearing order history:', error);
      return false;
    }
  }

  /**
   * Format date for display
   */
  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Get status badge class
   */
  function getStatusClass(status) {
    const statusMap = {
      'Placed': 'status-placed',
      'Processing': 'status-processing',
      'Shipped': 'status-shipped',
      'Delivered': 'status-delivered',
      'Pending': 'status-pending'
    };
    return statusMap[status] || 'status-placed';
  }

  /**
   * Generate order history HTML
   */
  function generateOrderHistoryHTML(orderHistory, baseUrl) {
    if (!orderHistory || orderHistory.length === 0) {
      return `
        <div class="order-history-empty">
          <p>You haven't placed any orders yet.</p>
          <a href="${baseUrl || '/'}" class="cta-button">Start Shopping</a>
        </div>
      `;
    }

    const ordersHtml = orderHistory.map(order => {
      const statusClass = getStatusClass(order.status);
      return `
        <div class="order-history-item">
          ${order.firstItemImage ? `<img src="${order.firstItemImage}" alt="${order.firstItemName}" class="order-history-image" />` : ''}
          <div class="order-history-content">
            <div class="order-history-header">
              <div class="order-history-info">
                <h3>${order.firstItemName}${order.itemCount > 1 ? ` + ${order.itemCount - 1} more` : ''}</h3>
                <p class="order-history-date">${formatDate(order.date)}</p>
              </div>
              <div class="order-history-meta">
                <span class="order-history-status ${statusClass}">${order.status}</span>
                <span class="order-history-amount">$${order.amount.toFixed(2)} ${order.currency}</span>
              </div>
            </div>
            <div class="order-history-actions">
              <a href="${baseUrl || ''}/order-status/?session_id=${order.sessionId}" class="order-history-link">
                View Details →
              </a>
            </div>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="order-history-list">
        ${ordersHtml}
      </div>
    `;
  }

  // Export for external use
  window.OrderHistory = {
    getOrderHistory: getOrderHistory,
    saveOrderToHistory: saveOrderToHistory,
    getOrderFromHistory: getOrderFromHistory,
    clearOrderHistory: clearOrderHistory,
    formatDate: formatDate,
    getStatusClass: getStatusClass,
    generateOrderHistoryHTML: generateOrderHistoryHTML
  };

})();

