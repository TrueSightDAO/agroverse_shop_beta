/**
 * Inventory Service
 * Prefers public JSON on raw.githubusercontent.com (fast); falls back to Google Apps Script getInventory.
 */

(function() {
  'use strict';

  // Cache inventory data (5 minute TTL)
  let inventoryCache = null;
  let inventoryCacheTime = null;
  const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /** Snapshot written by update_store_inventory → agroverse-inventory repo (see README there). */
  const INVENTORY_SNAPSHOT_URL =
    'https://raw.githubusercontent.com/TrueSightDAO/agroverse-inventory/main/store-inventory.json';

  // Inventory web service URL (from update_store_inventory.gs deployment) — fallback
  const INVENTORY_SERVICE_URL =
    'https://script.google.com/macros/s/AKfycbzcrCKpRv7ONKpDrrj6ZBTql_MHCLzkGTizvMgGfzT12Uc_SlObS_N5RbUwPqilAzdxoQ/exec';

  /**
   * Normalize API response to flat SKU → count map (legacy GAS = flat; snapshot = { inventory: {...} }).
   * @param {Object} data
   * @return {Object.<string, number>}
   */
  function inventoryMapFromResponse(data) {
    if (!data || typeof data !== 'object') {
      return {};
    }
    if (data.error) {
      return {};
    }
    if (data.inventory && typeof data.inventory === 'object') {
      return data.inventory;
    }
    const copy = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key) &&
          key !== 'generatedAt' && key !== 'source') {
        copy[key] = data[key];
      }
    }
    return copy;
  }

  /**
   * Fetch flat inventory map from snapshot URL, then GAS.
   * @return {Promise<Object.<string, number>>}
   */
  async function fetchMapWithFallback() {
    try {
      const snapUrl =
        INVENTORY_SNAPSHOT_URL +
        '?t=' +
        encodeURIComponent(String(Math.floor(Date.now() / (60 * 1000))));
      const snapRes = await fetch(snapUrl);
      if (snapRes.ok) {
        const data = await snapRes.json();
        const map = inventoryMapFromResponse(data);
        if (Object.keys(map).length > 0) {
          return map;
        }
      }
    } catch (e) {
      console.warn('Inventory snapshot fetch failed, using GAS:', e);
    }

    const url = INVENTORY_SERVICE_URL + '?action=getInventory';
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP error! status: ' + response.status);
    }
    const data = await response.json();
    return inventoryMapFromResponse(data);
  }

  /**
   * Fetch inventory for all SKUs from the web service
   * @return {Promise<Object>} Map of SKU Product ID to inventory count
   */
  async function fetchAllInventory() {
    if (inventoryCache && inventoryCacheTime && (Date.now() - inventoryCacheTime) < CACHE_TTL_MS) {
      return inventoryCache;
    }

    try {
      const map = await fetchMapWithFallback();
      inventoryCache = map;
      inventoryCacheTime = Date.now();
      return map;
    } catch (error) {
      console.error('Error fetching inventory:', error);
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
      const all = await fetchAllInventory();
      if (all[sku] !== undefined) {
        return parseInt(all[sku], 10) || 0;
      }
      const url =
        INVENTORY_SERVICE_URL +
        '?action=getInventory&sku=' +
        encodeURIComponent(sku);
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('HTTP error! status: ' + response.status);
      }

      const data = await response.json();

      if (data.error) {
        console.error('Inventory service error:', data.error);
        return 0;
      }

      if (data.sku && data.inventory !== undefined) {
        return parseInt(data.inventory, 10) || 0;
      }

      const map = inventoryMapFromResponse(data);
      if (map[sku] !== undefined) {
        return parseInt(map[sku], 10) || 0;
      }

      return 0;
    } catch (error) {
      console.error('Error fetching inventory for SKU ' + sku + ':', error);
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

    if (inventoryCache && inventoryCacheTime && (Date.now() - inventoryCacheTime) < CACHE_TTL_MS) {
      return inventoryCache[sku] !== undefined ? parseInt(inventoryCache[sku], 10) : 0;
    }

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

  window.InventoryService = {
    getInventory: getInventory,
    fetchAllInventory: fetchAllInventory,
    fetchInventoryForSKU: fetchInventoryForSKU,
    checkInventoryAvailability: checkInventoryAvailability,
    clearCache: clearCache
  };
})();
