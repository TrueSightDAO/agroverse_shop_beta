/**
 * Google Analytics Loader
 * Only loads Google Analytics on production (www.agroverse.shop)
 * Skips loading on localhost:8000 and beta.agroverse.shop
 */

(function() {
  'use strict';

  // Get current hostname
  const hostname = window.location.hostname;
  
  // Only load Google Analytics on production
  const isProduction = hostname === 'www.agroverse.shop' || hostname === 'agroverse.shop';
  
  // Skip loading on localhost or beta
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isBeta = hostname === 'beta.agroverse.shop';
  
  if (!isProduction && (isLocalhost || isBeta)) {
    // Create a no-op gtag function to prevent errors if code tries to call gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function() {
      // No-op function - does nothing
      if (window.dataLayer) {
        window.dataLayer.push(arguments);
      }
    };
    
    // Log that GA is disabled (only in development)
    if (isLocalhost) {
      console.log('Google Analytics disabled: running on localhost');
    } else if (isBeta) {
      console.log('Google Analytics disabled: running on beta.agroverse.shop');
    }
    
    return; // Exit early, don't load GA
  }
  
  // Load Google Analytics only on production
  if (isProduction) {
    // Google tag (gtag.js)
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=G-S6EP25EHF4';
    document.head.appendChild(script);
    
    // Initialize dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    function gtag(){window.dataLayer.push(arguments);}
    window.gtag = gtag;
    
    gtag('js', new Date());
    gtag('config', 'G-S6EP25EHF4');
  }
})();
