/**
 * Facebook Pixel Base Code
 * Initializes Facebook Pixel and provides tracking functions
 * 
 * SETUP:
 * 1. Get your Facebook Pixel ID from Facebook Events Manager
 * 2. Set FACEBOOK_PIXEL_ID in config.js or replace 'YOUR_PIXEL_ID' below
 */

(function() {
  'use strict';

  // Get Pixel ID from config or use placeholder
  const config = window.AGROVERSE_CONFIG || {};
  const PIXEL_ID = config.facebookPixelId || 'YOUR_PIXEL_ID';

  // Skip initialization if no Pixel ID
  if (!PIXEL_ID || PIXEL_ID === 'YOUR_PIXEL_ID') {
    console.warn('Facebook Pixel ID not configured. Please set AGROVERSE_CONFIG.facebookPixelId');
    return;
  }

  // Skip initialization on beta or localhost to avoid leaking into production analytics
  var hostname = window.location.hostname;
  if (hostname === 'beta.agroverse.shop' || hostname === 'www.beta.agroverse.shop' || hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('Facebook Pixel disabled: running on ' + hostname);
    return;
  }

  // Facebook Pixel base code
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src=v;s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');

  // Initialize Pixel
  fbq('init', PIXEL_ID);
  fbq('track', 'PageView');

  // Export fbq for use in other scripts
  window.fbq = window.fbq || function() {
    (window.fbq.q = window.fbq.q || []).push(arguments);
  };

  // Add noscript fallback for users with JavaScript disabled
  // This ensures tracking works even when JavaScript is disabled
  if (document.body) {
    const noscript = document.createElement('noscript');
    const img = document.createElement('img');
    img.height = '1';
    img.width = '1';
    img.style.display = 'none';
    img.src = 'https://www.facebook.com/tr?id=' + PIXEL_ID + '&ev=PageView&noscript=1';
    noscript.appendChild(img);
    document.body.appendChild(noscript);
  } else {
    // If body not ready, wait for it
    document.addEventListener('DOMContentLoaded', function() {
      const noscript = document.createElement('noscript');
      const img = document.createElement('img');
      img.height = '1';
      img.width = '1';
      img.style.display = 'none';
      img.src = 'https://www.facebook.com/tr?id=' + PIXEL_ID + '&ev=PageView&noscript=1';
      noscript.appendChild(img);
      document.body.appendChild(noscript);
    });
  }

  console.log('Facebook Pixel initialized with ID:', PIXEL_ID);

})();

