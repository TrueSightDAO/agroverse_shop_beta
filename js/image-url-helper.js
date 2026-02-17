/**
 * Image URL Helper
 * Converts relative image URLs to absolute URLs based on current page location
 */

(function() {
  'use strict';

  /**
   * Convert relative image URL to absolute URL
   * Handles paths like:
   * - /assets/images/products/image.jpg (absolute from root)
   * - assets/images/products/image.jpg (relative)
   * - ../assets/images/products/image.jpg (relative with parent)
   * - https://example.com/image.jpg (already absolute)
   * 
   * For cart images, always use absolute URLs from root to ensure
   * they work across all pages regardless of URL depth.
   */
  function makeImageUrlAbsolute(imageUrl) {
    if (!imageUrl) {
      return '';
    }

    // If already absolute (starts with http:// or https://), return as-is
    if (imageUrl.indexOf('http://') === 0 || imageUrl.indexOf('https://') === 0) {
      return imageUrl;
    }

    // Get current page's base URL
    const currentHost = window.location.origin;
    
    // If image starts with /, it's already absolute from root - just prepend origin
    if (imageUrl.indexOf('/') === 0) {
      return currentHost + imageUrl;
    }

    // For relative paths, convert to absolute from root
    // This ensures images work on all pages regardless of URL depth
    // Remove any leading ../ or ./ and ensure it starts with /
    let cleanPath = imageUrl;
    
    // Remove leading ../ or ./
    cleanPath = cleanPath.replace(/^(\.\.\/)+/, '');
    cleanPath = cleanPath.replace(/^\.\//, '');
    
    // Ensure path starts with /
    if (cleanPath.indexOf('/') !== 0) {
      cleanPath = '/' + cleanPath;
    }
    
    // Return absolute URL
    return currentHost + cleanPath;
  }

  // Export for external use
  window.ImageUrlHelper = {
    makeAbsolute: makeImageUrlAbsolute
  };

})();







