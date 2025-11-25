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
    const currentPath = window.location.pathname;
    const currentHost = window.location.origin;
    
    // If image starts with /, it's absolute from root - just prepend origin
    if (imageUrl.indexOf('/') === 0) {
      return currentHost + imageUrl;
    }

    // Calculate depth of current page
    // e.g., /blog/ = depth 1, /post/article/ = depth 2, / = depth 0
    const pathParts = currentPath.split('/').filter(p => p && p !== 'index.html');
    const depth = pathParts.length;

    // Build path to root
    let rootPath = '';
    if (depth > 0) {
      rootPath = '../'.repeat(depth);
    }

    // Handle relative paths
    // If imageUrl already starts with ../, we need to be careful
    if (imageUrl.indexOf('../') === 0) {
      // Count how many ../ in the image URL
      const imageDepth = (imageUrl.match(/\.\.\//g) || []).length;
      // Adjust root path
      const adjustedDepth = Math.max(0, depth - imageDepth);
      rootPath = adjustedDepth > 0 ? '../'.repeat(adjustedDepth) : '';
      // Remove ../ from imageUrl
      imageUrl = imageUrl.replace(/\.\.\//g, '');
    }

    // Ensure image path doesn't start with / (we'll add it)
    const cleanImagePath = imageUrl.indexOf('/') === 0 ? imageUrl.substring(1) : imageUrl;
    
    // Build absolute URL
    return currentHost + '/' + rootPath.replace(/\/$/, '') + (rootPath ? '/' : '') + cleanImagePath;
  }

  // Export for external use
  window.ImageUrlHelper = {
    makeAbsolute: makeImageUrlAbsolute
  };

})();


