/**
 * Inventory Service
 * Fetches inventory data from Google Apps Script web service
 */

(function() {
  'use strict';

  // Cache inventory data (5 minute TTL)
  let inventoryCache = null;
  let inventoryCacheTime = null;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  // Inventory web service URL (from update_store_inventory.gs deployment)
  const INVENTORY_SERVICE_URL = 'https://script.google.com/macros/s/AKfycbzcrCKpRv7ONKpDrrj6ZBTql_MHCLzkGTizvMgGfzT12Uc_SlObS_N5RbUwPqilAzdxoQ/exec';

  /**
   * Fetch inventory for all SKUs from the web service
   * @return {Promise<Object>} Map of SKU Product ID to inventory count
   */
  async function fetchAllInventory() {
    // Check cache first
    if (inventoryCache && inventoryCacheTime && (Date.now() - inventoryCacheTime) < CACHE_TTL_MS) {
      return inventoryCache;
    }

    try {
      const url = `${INVENTORY_SERVICE_URL}?action=getInventory`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      inventoryCache = data;
      inventoryCacheTime = Date.now();
      
      return data;
    } catch (error) {
      console.error('Error fetching inventory:', error);
      // Return empty object on error (allow cart operations to continue)
      return {};
    }
  }

  /**
   * Fetch inventory for a specific SKU
   * @param {string} sku - Product ID
   * @return {Promise<number>} Inventory count for the SKU (0 if not found or error)
   */
  async function fetchInventoryForSKU(sku) {
    if (!sku) return 0;

    try {
      const url = `${INVENTORY_SERVICE_URL}?action=getInventory&sku=${encodeURIComponent(sku)}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Response format: { "sku": "product-id", "inventory": 10 } or error
      if (data.error) {
        console.error('Inventory service error:', data.error);
        return 0;
      }
      
      if (data.sku && data.inventory !== undefined) {
        return parseInt(data.inventory, 10) || 0;
      }
      
      return 0;
    } catch (error) {
      console.error(`Error fetching inventory for SKU ${sku}:`, error);
      return 0;
    }
  }

  /**
   * Get inventory for a SKU (uses cache if available, otherwise fetches)
   * @param {string} sku - Product ID
   * @return {Promise<number>} Inventory count for the SKU
   */
  async function getInventory(sku) {
    if (!sku) return 0;

    // Try cache first
    if (inventoryCache && inventoryCacheTime && (Date.now() - inventoryCacheTime) < CACHE_TTL_MS) {
      return inventoryCache[sku] !== undefined ? parseInt(inventoryCache[sku], 10) : 0;
    }

    // Fetch all inventory to populate cache
    const allInventory = await fetchAllInventory();
    return allInventory[sku] !== undefined ? parseInt(allInventory[sku], 10) : 0;
  }

  /**
   * Clear the inventory cache (force refresh on next request)
   */
  function clearCache() {
    inventoryCache = null;
    inventoryCacheTime = null;
  }

  /**
   * Check if a quantity can be added to cart based on inventory
   * @param {string} sku - Product ID
   * @param {number} requestedQuantity - Quantity user wants to add
   * @param {number} currentCartQuantity - Current quantity already in cart (optional)
   * @return {Promise<{available: boolean, availableQuantity: number, requestedQuantity: number, inventory: number}>}
   */
  async function checkInventoryAvailability(sku, requestedQuantity, currentCartQuantity = 0) {
    const inventory = await getInventory(sku);
    const totalRequested = currentCartQuantity + requestedQuantity;
    const availableQuantity = Math.max(0, inventory - currentCartQuantity);
    const available = totalRequested <= inventory;

    return {
      available: available,
      availableQuantity: availableQuantity,
      requestedQuantity: requestedQuantity,
      inventory: inventory,
      currentCartQuantity: currentCartQuantity
    };
  }

  // Export public API
  window.InventoryService = {
    getInventory: getInventory,
    fetchAllInventory: fetchAllInventory,
    fetchInventoryForSKU: fetchInventoryForSKU,
    checkInventoryAvailability: checkInventoryAvailability,
    clearCache: clearCache
  };

})();

