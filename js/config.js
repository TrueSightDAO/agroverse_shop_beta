/**
 * Environment Configuration
 * Automatically detects local development vs production
 */

(function() {
  'use strict';

  // Detect environment based on hostname
  const hostname = window.location.hostname;
  
  const isLocal = hostname === 'localhost' || 
                hostname === '127.0.0.1' ||
                hostname.includes('localhost:') ||
                hostname.includes('127.0.0.1:');

  // Beta subdomain = development mode
  const isDevelopment = hostname === 'beta.agroverse.shop' || 
                       hostname === 'www.beta.agroverse.shop';

  // Main domain = production mode
  const isProduction = hostname === 'www.agroverse.shop' ||
                       hostname === 'agroverse.shop' ||
                       (!isLocal && !isDevelopment); // Default to production if not local or beta

  // Base URL configuration
  let baseUrl;
  if (isLocal) {
    baseUrl = 'http://127.0.0.1:8000'; // Local development server
  } else if (isDevelopment) {
    baseUrl = 'https://beta.agroverse.shop';
  } else {
    baseUrl = 'https://www.agroverse.shop';
  }

  // Google App Script Web App URL
  // IMPORTANT: Replace with your actual Google App Script deployment URL
  // 
  // To get your URL:
  // 1. Deploy your Google App Script as a Web App
  // 2. Copy the Web app URL (looks like: https://script.google.com/macros/s/.../exec)
  // 3. Paste it below
  //
  // ✅ GOOD NEWS: You can use the SAME URL for both local and production!
  // The script automatically detects dev vs prod from the request.
  // Just paste your deployment URL in both fields (or use the same one).
  const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyefqjQnWegrXR9y18HyJMxSM2wWCyucsK5qdh5isJICVhonssajEpT4Dt3hq3A7PTA/exec';

  // Stripe Configuration
  // Note: Stripe keys should be in Google App Script, not here
  // This is just for reference
  const STRIPE_CONFIG = {
    mode: isLocal ? 'test' : 'live',
    publishableKey: isLocal 
      ? 'pk_test_...' // Stripe test publishable key (optional, for future use)
      : 'pk_live_...' // Stripe live publishable key (optional, for future use)
  };

  // Google Places API Key (for address autocomplete)
  // Using the same key from dapp repository
  const GOOGLE_PLACES_API_KEY = 'AIzaSyCJvOEQgMAqLPzQnTkFfH-wWMhusNTpWaE';

  // Determine environment for API calls
  const environment = isLocal || isDevelopment ? 'development' : 'production';

  // Export configuration
  window.AGROVERSE_CONFIG = {
    isLocal: isLocal,
    isDevelopment: isDevelopment,
    isProduction: isProduction,
    baseUrl: baseUrl,
    googleScriptUrl: GOOGLE_SCRIPT_URL,
    googlePlacesApiKey: GOOGLE_PLACES_API_KEY,
    stripe: STRIPE_CONFIG,
    environment: environment,
    
    // URLs
    urls: {
      checkout: `${baseUrl}/checkout`,
      orderStatus: `${baseUrl}/order-status`,
      cart: `${baseUrl}/#cart`
    },
    
    // Debug mode
    debug: isLocal || isDevelopment
  };

  // Log environment in development
  if (isLocal || isDevelopment) {
    console.log('🔧 ' + (isLocal ? 'Local' : 'Beta') + ' Development Mode');
    console.log('Hostname:', hostname);
    console.log('Environment:', environment);
    console.log('Config:', window.AGROVERSE_CONFIG);
  }
})();

