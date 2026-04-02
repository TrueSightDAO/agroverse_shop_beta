/**
 * Product Page GA4 Tracking
 * Automatically tracks view_item event when product page loads
 * Optional: ?qr=CODE or ?gcr_qr=CODE loads Google Customer Reviews opt-in (via getGcrContextByQr Apps Script)
 */

(function() {
  'use strict';

  /**
   * If URL has qr / gcr_qr, fetch ledger-backed GCR fields and call AgroverseGoogleCustomerReviews.scheduleRender
   */
  function initGcrFromQrParam() {
    var params = new URLSearchParams(window.location.search);
    var qr = params.get('qr') || params.get('gcr_qr');
    if (!qr || !String(qr).trim()) {
      return;
    }

    var cfg = window.AGROVERSE_CONFIG || {};
    var scriptUrl = cfg.googleScriptUrl;
    if (!scriptUrl || scriptUrl.indexOf('YOUR_') !== -1) {
      if (cfg.debug) {
        console.warn('GCR QR: googleScriptUrl not configured');
      }
      return;
    }

    var apiUrl = scriptUrl + '?action=getGcrContextByQr&qr=' + encodeURIComponent(String(qr).trim());

    fetch(apiUrl)
      .then(function(res) {
        return res.json();
      })
      .then(function(data) {
        if (!data || data.status !== 'success' || !data.gcr) {
          if (cfg.debug) {
            console.warn('GCR QR:', (data && data.error) ? data.error : data);
          }
          return;
        }

        var g = data.gcr;

        function runSchedule() {
          if (!window.AgroverseGoogleCustomerReviews) {
            return;
          }
          if (!cfg.googleCustomerReviewsMerchantId) {
            if (cfg.debug) {
              console.warn('GCR QR: googleCustomerReviewsMerchantId not set for this host');
            }
            return;
          }
          window.AgroverseGoogleCustomerReviews.scheduleRender({
            merchantId: cfg.googleCustomerReviewsMerchantId,
            orderId: g.orderId,
            email: g.email,
            deliveryCountry: g.deliveryCountry,
            orderDateIso: g.orderDateIso,
            products: g.products,
            deliveryDaysAfterOrder: cfg.googleCustomerReviewsEstimatedDeliveryDays
          });
        }

        if (window.AgroverseGoogleCustomerReviews) {
          runSchedule();
          return;
        }

        var base = (cfg.baseUrl || window.location.origin || '').replace(/\/$/, '');
        var src = base + '/js/google-customer-reviews.js';
        var s = document.createElement('script');
        s.src = src;
        s.onload = runSchedule;
        s.onerror = function() {
          if (cfg.debug) {
            console.warn('GCR QR: failed to load google-customer-reviews.js');
          }
        };
        document.head.appendChild(s);
      })
      .catch(function(err) {
        if (cfg.debug) {
          console.warn('GCR QR fetch failed', err);
        }
      });
  }

  /**
   * Initialize product page tracking
   */
  function initProductPageTracking() {
    // Wait for PRODUCTS to be available
    if (!window.PRODUCTS) {
      setTimeout(initProductPageTracking, 100);
      return;
    }

    // Try to find product ID from URL or page
    const pathParts = window.location.pathname.split('/');
    let productId = null;

    // Check if there's a product ID in the URL path
    // Product pages are like: /product-page/product-name/index.html
    if (pathParts.length >= 2 && pathParts[pathParts.length - 3] === 'product-page') {
      const productPath = pathParts[pathParts.length - 2];
      
      // Try to match product ID from PRODUCTS
      for (const id in window.PRODUCTS) {
        if (productPath.includes(id.replace(/-/g, '-')) || id.includes(productPath)) {
          productId = id;
          break;
        }
      }
    }

    // If not found in URL, try to get from add-to-cart button
    if (!productId) {
      const addToCartBtn = document.querySelector('.add-to-cart-btn');
      if (addToCartBtn && addToCartBtn.dataset.productId) {
        productId = addToCartBtn.dataset.productId;
      }
    }

    // If still not found, try to match by product name in h1
    if (!productId) {
      const h1 = document.querySelector('h1');
      if (h1) {
        const productName = h1.textContent.trim();
        for (const id in window.PRODUCTS) {
          if (window.PRODUCTS[id].name === productName) {
            productId = id;
            break;
          }
        }
      }
    }

    // Track view_item if we found a product
    if (productId && window.PRODUCTS[productId]) {
      const product = window.PRODUCTS[productId];
      
      // Track GA4 view_item
      if (window.trackViewItem) {
        window.trackViewItem(product);
      }
      
      // Track Facebook Pixel ViewContent
      if (window.trackFacebookViewContent) {
        window.trackFacebookViewContent(product);
      }
    }
  }

  function onDomReady() {
    initProductPageTracking();
    initGcrFromQrParam();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onDomReady);
  } else {
    onDomReady();
  }

})();

