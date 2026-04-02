/**
 * Google Customer Reviews — survey opt-in (Merchant Center / Google Customer Reviews program).
 * Docs: https://support.google.com/merchants/topic/7107684
 *
 * Loads https://apis.google.com/js/platform.js and calls gapi.surveyoptin.render with
 * order details. Allowed on www.agroverse.shop / agroverse.shop, and on localhost when
 * AGROVERSE_CONFIG.googleCustomerReviewsEnableLocalTest is true (see config.js).
 *
 * Usage: window.AgroverseGoogleCustomerReviews.scheduleRender({ ... }) from order-status
 * (or any page) after you have a real order id, email, country, and estimated delivery date.
 */

(function() {
  'use strict';

  var SCRIPT_SRC = 'https://apis.google.com/js/platform.js';
  var scriptLoading = false;
  var scriptLoaded = false;

  function isGcrAllowedHost() {
    var h = window.location.hostname;
    if (h === 'www.agroverse.shop' || h === 'agroverse.shop') return true;
    var cfg = window.AGROVERSE_CONFIG || {};
    if (cfg.isLocal && cfg.googleCustomerReviewsEnableLocalTest) return true;
    return false;
  }

  function normalizeDeliveryCountry(raw) {
    if (!raw || typeof raw !== 'string') return 'US';
    var u = raw.trim().toUpperCase();
    if (u === 'USA' || u === 'UNITED STATES' || u === 'UNITED STATES OF AMERICA') return 'US';
    if (u.length === 2) return u;
    return 'US';
  }

  function addDaysYyyyMmDd(isoDateStr, days) {
    var d = isoDateStr ? new Date(isoDateStr) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    d.setUTCDate(d.getUTCDate() + (typeof days === 'number' ? days : 7));
    var y = d.getUTCFullYear();
    var m = String(d.getUTCMonth() + 1).padStart(2, '0');
    var day = String(d.getUTCDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function runRender(opts) {
    if (!window.gapi || typeof window.gapi.load !== 'function') {
      console.warn('Google Customer Reviews: gapi.load not available');
      return;
    }
    window.gapi.load('surveyoptin', function() {
      if (!window.gapi.surveyoptin || typeof window.gapi.surveyoptin.render !== 'function') {
        console.warn('Google Customer Reviews: surveyoptin.render not available');
        return;
      }
      var payload = {
        merchant_id: opts.merchantId,
        order_id: String(opts.orderId || ''),
        email: String(opts.email || '').trim(),
        delivery_country: opts.deliveryCountry,
        estimated_delivery_date: opts.estimatedDeliveryDate
      };
      if (opts.products && opts.products.length > 0) {
        payload.products = opts.products;
      }
      try {
        if (window.AGROVERSE_CONFIG && window.AGROVERSE_CONFIG.debug) {
          console.log('[GCR] Calling surveyoptin.render', {
            merchant_id: payload.merchant_id,
            order_id: payload.order_id,
            delivery_country: payload.delivery_country,
            estimated_delivery_date: payload.estimated_delivery_date,
            products: payload.products || null
          });
        }
        window.gapi.surveyoptin.render(payload);
        if (opts._dedupeKey) {
          try {
            sessionStorage.setItem(opts._dedupeKey, '1');
          } catch (e2) {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn('Google Customer Reviews: render failed', e);
      }
    });
  }

  function ensurePlatformJs(then) {
    if (scriptLoaded && window.gapi && typeof window.gapi.load === 'function') {
      then();
      return;
    }
    if (scriptLoading) {
      var wait = setInterval(function() {
        if (scriptLoaded && window.gapi && typeof window.gapi.load === 'function') {
          clearInterval(wait);
          then();
        }
      }, 50);
      setTimeout(function() { clearInterval(wait); }, 15000);
      return;
    }
    scriptLoading = true;
    window.agroverseGcrPlatformOnLoad = function() {
      scriptLoaded = true;
      scriptLoading = false;
      try {
        delete window.agroverseGcrPlatformOnLoad;
      } catch (ignore) {
        window.agroverseGcrPlatformOnLoad = undefined;
      }
      then();
    };
    var s = document.createElement('script');
    s.async = true;
    s.defer = true;
    s.src = SCRIPT_SRC + '?onload=agroverseGcrPlatformOnLoad';
    s.onerror = function() {
      scriptLoading = false;
      console.warn('Google Customer Reviews: failed to load platform.js');
    };
    document.head.appendChild(s);
  }

  /**
   * Schedule GCR opt-in once per order_id in this browser (sessionStorage).
   * @param {Object} options
   * @param {number|string} options.merchantId - Merchant Center merchant id
   * @param {string} options.orderId - Stripe session id (cs_…) for web checkout; QR code id for offline
   * @param {string} options.email - Buyer email
   * @param {string} [options.deliveryCountry] - ISO 3166-1 alpha-2 (default US)
   * @param {string} [options.estimatedDeliveryDate] - YYYY-MM-DD
   * @param {string} [options.orderDateIso] - order date ISO; used if estimatedDeliveryDate omitted
   * @param {number} [options.deliveryDaysAfterOrder] - default from config or 7
   * @param {Array<{gtin:string}>} [options.products] - optional GTIN list for Google
   */
  function scheduleRender(options) {
    if (!isGcrAllowedHost()) return;

    var cfg = window.AGROVERSE_CONFIG || {};
    var merchantId = options.merchantId != null ? options.merchantId : cfg.googleCustomerReviewsMerchantId;
    if (merchantId == null || merchantId === '') return;

    var orderId = options.orderId;
    var email = options.email;
    if (!orderId || !email) return;

    var dedupeKey = 'agroverse_gcr_optin_' + String(orderId);
    try {
      if (sessionStorage.getItem(dedupeKey)) {
        if (cfg.debug) {
          console.log('[GCR] Skipped: already invoked this session for order_id', String(orderId));
        }
        return;
      }
    } catch (e) {
      /* continue */
    }

    var country = options.deliveryCountry || normalizeDeliveryCountry(
      options.shippingAddress && options.shippingAddress.country
    );
    var deliveryDays = typeof options.deliveryDaysAfterOrder === 'number'
      ? options.deliveryDaysAfterOrder
      : (typeof cfg.googleCustomerReviewsEstimatedDeliveryDays === 'number'
        ? cfg.googleCustomerReviewsEstimatedDeliveryDays
        : 7);
    var estDate = options.estimatedDeliveryDate
      || addDaysYyyyMmDd(options.orderDateIso, deliveryDays);

    ensurePlatformJs(function() {
      runRender({
        merchantId: typeof merchantId === 'number' ? merchantId : parseInt(String(merchantId), 10),
        orderId: orderId,
        email: email,
        deliveryCountry: country,
        estimatedDeliveryDate: estDate,
        products: options.products,
        _dedupeKey: dedupeKey
      });
    });
  }

  window.AgroverseGoogleCustomerReviews = {
    scheduleRender: scheduleRender,
    normalizeDeliveryCountry: normalizeDeliveryCountry,
    addDaysYyyyMmDd: addDaysYyyyMmDd
  };
})();
