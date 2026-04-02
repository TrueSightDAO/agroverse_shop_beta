/**
 * Google tag (gtag.js) — GA4 + optional Merchant Center–linked destinations
 *
 * Merchant Center “key event tracking” (free listings performance, purchases):
 * https://support.google.com/merchants/answer/14166401
 *
 * Recommended Merchant Center setup (pick one primary path):
 * 1) **Link Google Analytics** — In Merchant Center → Settings (gear) → General → Key event setup:
 *    enable auto-tagging, add key event source → “Link Google Analytics” → choose the GA4 property
 *    for this Measurement ID. Purchases are already sent from `ga4-events.js` / order-status page.
 * 2) **Link your website** — If the wizard gives an *additional* Google tag / destination ID (e.g. GT-…),
 *    append it to ADDITIONAL_GTAG_CONFIG_IDS below so `gtag('config', …)` runs for that ID too.
 *
 * Clicks from free listings may add `?srsltid=…` to landing URLs; GA4 page views use the full URL by default.
 *
 * Production only: www.agroverse.shop / agroverse.shop. Localhost and beta skip loading the real tag.
 */

(function() {
  'use strict';

  var GTAG_MEASUREMENT_ID = 'G-S6EP25EHF4';

  /**
   * Optional extra tag IDs from Merchant Center “Link your website” (Google tag setup).
   * Leave empty if you only use “Link Google Analytics” for the same property as above.
   * Example: ['GT-XXXXXXXX']
   */
  var ADDITIONAL_GTAG_CONFIG_IDS = [];

  var hostname = window.location.hostname;
  var isProduction = hostname === 'www.agroverse.shop' || hostname === 'agroverse.shop';
  var isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  var isBeta = hostname === 'beta.agroverse.shop';

  if (!isProduction && (isLocalhost || isBeta)) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      if (window.dataLayer) {
        window.dataLayer.push(arguments);
      }
    };
    if (isLocalhost) {
      console.log('Google Analytics disabled: running on localhost');
    } else if (isBeta) {
      console.log('Google Analytics disabled: running on beta.agroverse.shop');
    }
    return;
  }

  if (isProduction) {
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GTAG_MEASUREMENT_ID);
    document.head.appendChild(script);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GTAG_MEASUREMENT_ID, {
      send_page_view: true
    });

    for (var i = 0; i < ADDITIONAL_GTAG_CONFIG_IDS.length; i++) {
      var extraId = (ADDITIONAL_GTAG_CONFIG_IDS[i] || '').trim();
      if (extraId && extraId !== GTAG_MEASUREMENT_ID) {
        gtag('config', extraId);
      }
    }
  }
})();
