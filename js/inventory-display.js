/**
 * Inventory Display Utility
 * Displays inventory counts on product cards and product pages
 */

(function() {
  'use strict';

  /** Last SKU map from a successful listing fetch; used to re-apply sort after resize/orientation. */
  let lastListingInventoryMap = null;
  let listingOrderResizeTimer = null;

  // Inventory status thresholds
  const LOW_STOCK_THRESHOLD = 5;
  const OUT_OF_STOCK_THRESHOLD = 0;

  /**
   * Get inventory status class and text
   * @param {number} inventory - Inventory count
   * @return {Object} Status object with class, text, and color
   */
  function getInventoryStatus(inventory) {
    if (inventory === null || inventory === undefined) {
      return {
        class: 'inventory-unknown',
        text: 'Check availability',
        color: '#756F63',
        available: true
      };
    }

    const count = parseInt(inventory, 10) || 0;

    if (count <= OUT_OF_STOCK_THRESHOLD) {
      return {
        class: 'inventory-out',
        text: 'Out of stock',
        color: '#f44336',
        available: false
      };
    } else if (count <= LOW_STOCK_THRESHOLD) {
      return {
        class: 'inventory-low',
        text: `Low stock (${count} left)`,
        color: '#FF9800',
        available: true
      };
    } else {
      return {
        class: 'inventory-in',
        text: `${count} in stock`,
        color: '#4CAF50',
        available: true
      };
    }
  }

  /**
   * Create inventory badge element
   * @param {number} inventory - Inventory count
   * @param {string} size - Badge size: 'small' (for cards) or 'large' (for product pages)
   * @return {HTMLElement} Badge element
   */
  function createInventoryBadge(inventory, size = 'small') {
    const status = getInventoryStatus(inventory);
    const badge = document.createElement('div');
    badge.className = `inventory-badge inventory-badge-${size} ${status.class}`;
    badge.textContent = status.text;
    badge.style.cssText = `
      display: inline-block;
      padding: ${size === 'large' ? '8px 16px' : '4px 10px'};
      border-radius: 20px;
      font-size: ${size === 'large' ? '14px' : '12px'};
      font-weight: 600;
      color: white;
      background-color: ${status.color};
      line-height: 1.2;
      white-space: nowrap;
    `;
    return badge;
  }

  /**
   * Update product card with inventory
   * @param {HTMLElement} card - Product card element
   * @param {string} productId - Product ID/SKU
   * @param {number} inventory - Inventory count
   */
  function updateProductCard(card, productId, inventory) {
    if (!card) return;

    // Check if we've already processed this card (prevent duplicate calls)
    if (card.dataset.inventoryProcessed === 'true') {
      // Still remove any existing badges in case they're stale
      const existingBadges = card.querySelectorAll('.inventory-badge, .inventory-display');
      existingBadges.forEach(badge => badge.remove());
    }
    
    // Mark card as processed
    card.dataset.inventoryProcessed = 'true';

    // Remove ALL existing inventory badges/displays to prevent duplicates
    // Search more broadly to catch all instances
    const existingBadges = card.querySelectorAll('.inventory-badge, .inventory-display');
    existingBadges.forEach(badge => {
      badge.remove();
    });
    
    // Also check if badge was added directly to card or actions section
    const allChildren = Array.from(card.querySelectorAll('*'));
    allChildren.forEach(el => {
      if (el.classList && (
          el.classList.contains('inventory-badge') || 
          el.classList.contains('inventory-display') ||
          (el.textContent && (
            el.textContent.toLowerCase().includes('in stock') ||
            el.textContent.toLowerCase().includes('out of stock') ||
            el.textContent.toLowerCase().includes('low stock')
          ))
        )) {
        // Double check it's an inventory badge by checking classes or text
        if (el.classList.contains('inventory-badge') || 
            el.classList.contains('inventory-display') ||
            (el.textContent.match(/\d+\s*(in stock|left|available)/i))) {
          el.remove();
        }
      }
    });
    
    // Explicitly remove any badges in the actions section
    const actionsSection = card.querySelector('.product-card-actions');
    if (actionsSection) {
      const badgesInActions = actionsSection.querySelectorAll('.inventory-badge, .inventory-display');
      badgesInActions.forEach(badge => badge.remove());
    }

    const status = getInventoryStatus(inventory);
    const badge = createInventoryBadge(inventory, 'small');
    badge.className = 'inventory-badge inventory-badge-small ' + status.class;
    badge.setAttribute('data-inventory-badge', 'true'); // Mark it so we can find it later

    // Find the price element - it should be inside .product-card-body
    const cardBody = card.querySelector('.product-card-body');
    const priceElement = cardBody ? cardBody.querySelector('.price') : card.querySelector('.price');

    // CRITICAL: Never insert in or near the actions section
    if (actionsSection) {
      // Make absolutely sure we never insert in actions section
      const allActionsChildren = actionsSection.querySelectorAll('*');
      allActionsChildren.forEach(child => {
        if (child.classList && child.classList.contains('inventory-badge')) {
          child.remove();
        }
      });
    }

    // Insert ONLY in the card body, right after the price
    if (priceElement && cardBody && cardBody.contains(priceElement)) {
      // Insert right after price element
      const priceParent = priceElement.parentElement;
      if (priceParent === cardBody || cardBody.contains(priceParent)) {
        // Insert after price, before next sibling
        let nextSibling = priceElement.nextSibling;
        // Skip text nodes
        while (nextSibling && nextSibling.nodeType !== 1) {
          nextSibling = nextSibling.nextSibling;
        }
        priceParent.insertBefore(badge, nextSibling);
        badge.style.marginTop = '0.5rem';
        badge.style.display = 'block';
      } else {
        // Price is in a link or other container, insert after it
        priceElement.parentElement.insertBefore(badge, priceElement.nextSibling);
        badge.style.marginTop = '0.5rem';
        badge.style.display = 'block';
      }
    } else if (cardBody && !actionsSection) {
      // Fallback: insert at end of card body (only if no actions section)
      cardBody.appendChild(badge);
      badge.style.marginTop = '0.5rem';
      badge.style.display = 'block';
    } else if (priceElement) {
      // Last resort: insert after price wherever it is (but not in actions)
      const priceParent = priceElement.parentElement;
      if (priceParent && (!actionsSection || !actionsSection.contains(priceParent))) {
        priceParent.insertBefore(badge, priceElement.nextSibling);
        badge.style.marginTop = '0.5rem';
        badge.style.display = 'block';
      }
    }
    
    // Final safety check: if badge somehow ended up in actions section, move it
    if (actionsSection && actionsSection.contains(badge)) {
      badge.remove();
      // Re-insert in card body
      if (cardBody) {
        const priceEl = cardBody.querySelector('.price');
        if (priceEl) {
          cardBody.insertBefore(badge, priceEl.nextSibling);
        } else {
          cardBody.appendChild(badge);
        }
      }
    }

    // Breathing room above Add to Cart / actions when the card has an actions row
    if (badge.parentNode) {
      const hasActions = card.querySelector('.product-card-actions');
      badge.style.marginBottom = hasActions ? '1rem' : '0';
    }

    // Disable add-to-cart button if out of stock
    const addToCartBtn = card.querySelector('.add-to-cart-btn, button[data-product-id]');
    if (addToCartBtn && !status.available) {
      addToCartBtn.disabled = true;
      addToCartBtn.style.opacity = '0.6';
      addToCartBtn.style.cursor = 'not-allowed';
      addToCartBtn.title = 'This item is currently out of stock';
    } else if (addToCartBtn && status.available) {
      addToCartBtn.disabled = false;
      addToCartBtn.style.opacity = '1';
      addToCartBtn.style.cursor = 'pointer';
      addToCartBtn.title = '';
    }
  }

  /**
   * Update product page with inventory
   * @param {string} productId - Product ID/SKU
   * @param {number} inventory - Inventory count
   */
  function updateProductPage(productId, inventory) {
    const status = getInventoryStatus(inventory);
    
    // Find price element or product info section
    const priceElement = document.querySelector('.price, .product-price, [class*="price"]');
    const productInfo = document.querySelector('.product-info, .product-details, [class*="product-info"]');
    
    // Remove existing inventory display
    const existingDisplay = document.querySelector('.inventory-display');
    if (existingDisplay) {
      existingDisplay.remove();
    }

    const display = createInventoryBadge(inventory, 'large');
    display.className = 'inventory-display inventory-badge-large ' + status.class;
    display.style.marginTop = '1rem';
    display.style.marginBottom = '1rem';

    // Insert near price or in product info
    if (priceElement && priceElement.parentElement) {
      priceElement.parentElement.insertBefore(display, priceElement.nextSibling);
    } else if (productInfo) {
      const firstChild = productInfo.firstElementChild;
      if (firstChild) {
        productInfo.insertBefore(display, firstChild.nextSibling);
      } else {
        productInfo.appendChild(display);
      }
    }

    // Update quantity selector max value
    const quantityInput = document.querySelector('input[type="number"][name="quantity"], input[type="number"].quantity, #quantity');
    if (quantityInput && status.available && inventory !== null && inventory !== undefined) {
      const maxQuantity = parseInt(inventory, 10) || 0;
      quantityInput.setAttribute('max', maxQuantity);
      quantityInput.setAttribute('data-max-inventory', maxQuantity);
      
      // Add validation
      quantityInput.addEventListener('change', function() {
        const requested = parseInt(this.value, 10) || 0;
        if (requested > maxQuantity) {
          this.value = maxQuantity;
          alert(`Only ${maxQuantity} units available. Quantity adjusted.`);
        }
      });
    }

    // Disable add-to-cart button if out of stock
    const addToCartBtn = document.querySelector('.add-to-cart-btn, button[data-product-id], .cta-button[data-product-id]');
    if (addToCartBtn && !status.available) {
      addToCartBtn.disabled = true;
      addToCartBtn.style.opacity = '0.6';
      addToCartBtn.style.cursor = 'not-allowed';
      addToCartBtn.textContent = 'Out of Stock';
      if (addToCartBtn.classList) {
        addToCartBtn.classList.add('disabled');
      }
    } else if (addToCartBtn && status.available) {
      addToCartBtn.disabled = false;
      addToCartBtn.style.opacity = '1';
      addToCartBtn.style.cursor = 'pointer';
      if (addToCartBtn.dataset && addToCartBtn.dataset.originalText) {
        addToCartBtn.textContent = addToCartBtn.dataset.originalText;
      }
      if (addToCartBtn.classList) {
        addToCartBtn.classList.remove('disabled');
      }
    }

    // Show low stock warning if applicable
    if (status.class === 'inventory-low' && inventory <= LOW_STOCK_THRESHOLD) {
      const warning = document.createElement('div');
      warning.className = 'inventory-warning';
      warning.style.cssText = `
        margin-top: 0.5rem;
        padding: 0.75rem;
        background-color: #FFF3E0;
        border-left: 4px solid #FF9800;
        border-radius: 4px;
        color: #E65100;
        font-size: 14px;
      `;
      warning.textContent = `⚠️ Only ${inventory} units remaining. Order soon!`;
      display.parentElement.insertBefore(warning, display.nextSibling);
    }
  }

  /**
   * Collect outer .product-card roots that have an add-to-cart control (same rules as init).
   * @return {HTMLElement[]}
   */
  function collectListingProductCards() {
    const productCards = document.querySelectorAll('.product-card');
    const cardMap = new Map();

    productCards.forEach(card => {
      const addToCartBtn = card.querySelector('.add-to-cart-btn, button[data-product-id]');
      let productId = null;
      if (addToCartBtn) {
        productId = addToCartBtn.getAttribute('data-product-id') ||
          addToCartBtn.dataset?.productId;
      }
      if (!productId) {
        productId = card.getAttribute('data-product-id') || card.dataset?.productId;
      }
      if (productId) {
        if (!cardMap.has(productId)) {
          cardMap.set(productId, []);
        }
        cardMap.get(productId).push(card);
      }
    });

    return Array.from(
      new Set(
        Array.from(cardMap.values()).reduce((acc, list) => acc.concat(list), [])
      )
    );
  }

  /**
   * Re-apply listing order using the last known inventory map (e.g. after mobile resize/orientation).
   */
  function refreshListingProductOrder() {
    if (!lastListingInventoryMap) return;
    const uniqueCards = collectListingProductCards();
    if (uniqueCards.length <= 1) return;
    reorderProductCardsByInventory(uniqueCards, lastListingInventoryMap);
  }

  function scheduleListingOrderRefresh() {
    if (listingOrderResizeTimer) {
      clearTimeout(listingOrderResizeTimer);
    }
    listingOrderResizeTimer = setTimeout(function() {
      listingOrderResizeTimer = null;
      refreshListingProductOrder();
    }, 150);
  }

  /**
   * Sort product card rows so buyable items appear first and out-of-stock last.
   * Within each parent (e.g. .product-gallery, .products-grid), only direct
   * .product-card children are reordered; original order is kept within the same tier.
   * @param {HTMLElement[]} cards - Product card elements
   * @param {Object|null|undefined} allInventory - SKU map from fetchAllInventory
   */
  function reorderProductCardsByInventory(cards, allInventory) {
    if (!cards || cards.length <= 1) return;

    const invMap = allInventory && typeof allInventory === 'object' ? allInventory : null;
    const parents = new Map();

    cards.forEach(card => {
      const parent = card.parentElement;
      if (!parent) return;
      if (!parents.has(parent)) {
        parents.set(parent, []);
      }
      parents.get(parent).push(card);
    });

    const touchedParents = [];

    parents.forEach((cardList, parent) => {
      const row = Array.from(parent.children).filter(
        el => el.classList && el.classList.contains('product-card')
      );
      if (row.length <= 1) return;

      const decorated = row.map((el, idx) => {
        const btn = el.querySelector('.add-to-cart-btn, button[data-product-id]');
        const pid =
          (btn && (btn.getAttribute('data-product-id') || btn.dataset?.productId)) ||
          el.getAttribute('data-product-id') ||
          el.dataset?.productId;

        let tier;
        let invSort = 0;

        if (!pid || !invMap) {
          tier = 1;
        } else if (Object.prototype.hasOwnProperty.call(invMap, pid)) {
          const n = parseInt(invMap[pid], 10);
          const count = isNaN(n) ? 0 : n;
          if (count > 0) {
            tier = 0;
            invSort = count;
          } else {
            tier = 2;
          }
        } else {
          tier = 1;
        }

        return { el, idx, tier, invSort };
      });

      decorated.sort((a, b) => {
        if (a.tier !== b.tier) return a.tier - b.tier;
        if (a.tier === 0 && b.tier === 0) return b.invSort - a.invSort;
        return a.idx - b.idx;
      });

      decorated.forEach(({ el }) => parent.appendChild(el));
      decorated.forEach(({ el }, i) => {
        el.style.order = String(i);
      });
      touchedParents.push(parent);
    });

    if (typeof requestAnimationFrame !== 'undefined' && touchedParents.length) {
      requestAnimationFrame(function() {
        touchedParents.forEach(function(p) {
          void p.offsetHeight;
        });
      });
    }
  }

  /**
   * Initialize inventory display for all product cards on the page
   */
  async function initProductCards() {
    let attempts = 0;
    while (!window.InventoryService && attempts < 40) {
      await new Promise(function(resolve) {
        setTimeout(resolve, 50);
      });
      attempts++;
    }

    if (!window.InventoryService) {
      console.warn('InventoryService not available. Inventory display disabled.');
      return;
    }

    // Outer cards only (.product-card-actions also matches [class*="product-card"] and confused parent grouping).
    const productCards = document.querySelectorAll('.product-card');
    
    if (productCards.length === 0) {
      return;
    }

    // Collect all product IDs
    const productIds = [];
    const cardMap = new Map();

    productCards.forEach(card => {
      const addToCartBtn = card.querySelector('.add-to-cart-btn, button[data-product-id]');
      let productId = null;
      if (addToCartBtn) {
        productId = addToCartBtn.getAttribute('data-product-id') ||
          addToCartBtn.dataset?.productId;
      }
      if (!productId) {
        productId = card.getAttribute('data-product-id') || card.dataset?.productId;
      }
      if (productId) {
        productIds.push(productId);
        if (!cardMap.has(productId)) {
          cardMap.set(productId, []);
        }
        cardMap.get(productId).push(card);
      }
    });

    if (productIds.length === 0) {
      return;
    }

    const uniqueCards = Array.from(
      new Set(
        Array.from(cardMap.values()).reduce((acc, list) => acc.concat(list), [])
      )
    );

    // Fetch all inventory at once
    try {
      const allInventory = await window.InventoryService.fetchAllInventory();
      
      // Update each card
      productIds.forEach(productId => {
        const inventory = allInventory[productId] !== undefined ? 
                         parseInt(allInventory[productId], 10) : null;
        const cards = cardMap.get(productId) || [];
        cards.forEach(card => {
          updateProductCard(card, productId, inventory);
        });
      });

      lastListingInventoryMap = allInventory;
      reorderProductCardsByInventory(uniqueCards, allInventory);
    } catch (error) {
      console.error('Error fetching inventory for product cards:', error);
      // Show "Check availability" for all cards on error
      productIds.forEach(productId => {
        const cards = cardMap.get(productId) || [];
        cards.forEach(card => {
          updateProductCard(card, productId, null);
        });
      });
    }
  }

  /**
   * Initialize inventory display for product page
   */
  async function initProductPage() {
    // Check if InventoryService is available
    if (!window.InventoryService) {
      console.warn('InventoryService not available. Inventory display disabled.');
      return;
    }

    // Check if there's already a custom inventory display script running
    // (Some product pages have their own inventory display implementation)
    const existingInventoryDisplay = document.getElementById('inventory-display');
    if (existingInventoryDisplay && existingInventoryDisplay.textContent.trim() !== '') {
      // Custom implementation exists, let it handle the display
      // But we can still update buttons and quantity selectors
      console.log('Custom inventory display detected, using it for display');
    }

    // Find product ID from various possible sources
    let productId = null;
    
    // Try from add-to-cart button
    const addToCartBtn = document.querySelector('.add-to-cart-btn, button[data-product-id], .cta-button[data-product-id]');
    if (addToCartBtn) {
      productId = addToCartBtn.getAttribute('data-product-id') || 
                  addToCartBtn.dataset?.productId;
    }

    // Try from URL (fallback) - map common product page URLs to product IDs
    if (!productId) {
      const pathParts = window.location.pathname.split('/');
      const urlPath = window.location.pathname.toLowerCase();
      
      // Map known product page URLs to product IDs
      const productIdMap = {
        'ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g': 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
        'oscar-s-bahia-ceremonial-cacao': 'oscar-bahia-ceremonial-cacao-200g',
        '8-ounce-organic-cacao-nibs-from-brazil': '8-ounce-organic-cacao-nibs',
        'taste-of-rainforest-200-grams-caramelized-cacao-beans': 'taste-of-rainforest-caramelized-cacao-beans',
        'premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far': 'premium-organic-cacao-beans-la-do-sitio',
        'organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram': 'organic-hybrid-cacao-beans-jesus-da-deus',
        'organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm': 'organic-criollo-cacao-nibs-oscar',
        'organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm': 'organic-criollo-cacao-beans-oscar',
        'ceremonial-cacao-fazenda-santa-ana-2023-200g': 'ceremonial-cacao-fazenda-santa-ana-2023-200g'
      };
      
      for (const [urlKey, id] of Object.entries(productIdMap)) {
        if (urlPath.includes(urlKey)) {
          productId = id;
          break;
        }
      }
      
      // Last resort: extract from URL path
      if (!productId) {
        const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2];
        if (lastPart && lastPart !== 'index.html' && lastPart !== 'product-page') {
          productId = lastPart.replace(/\.html$/, '').replace(/\//g, '-').toLowerCase();
        }
      }
    }

    if (!productId) {
      console.warn('Could not determine product ID for inventory display');
      return;
    }

    // Store original button text if needed
    if (addToCartBtn && !addToCartBtn.dataset.originalText) {
      addToCartBtn.dataset.originalText = addToCartBtn.textContent;
    }

    // Fetch inventory
    try {
      const inventory = await window.InventoryService.getInventory(productId);
      
      // Always update buttons and quantity selectors based on actual inventory
      // This ensures buttons match the inventory even if custom display exists
      updateProductPageButtons(productId, inventory);
      
      // If custom display exists, wait a bit for it to update, then sync button again
      if (existingInventoryDisplay) {
        // Wait for custom display to update (it might run after us)
        setTimeout(() => {
          updateProductPageButtons(productId, inventory);
        }, 500);
      }
      
      // Only create our own display if there isn't already a custom one
      if (!existingInventoryDisplay || existingInventoryDisplay.textContent.trim() === '') {
        updateProductPage(productId, inventory);
      }
    } catch (error) {
      console.error('Error fetching inventory for product page:', error);
      // Still try to update buttons even on error
      updateProductPageButtons(productId, null);
      
      if (!existingInventoryDisplay || existingInventoryDisplay.textContent.trim() === '') {
        updateProductPage(productId, null);
      }
    }
    
    // Also set up a mutation observer to watch for changes to custom inventory display
    if (existingInventoryDisplay) {
      const observer = new MutationObserver(() => {
        // When custom display updates, sync the button state
        setTimeout(() => {
          updateProductPageButtons(productId, null); // Will extract from display
        }, 100);
      });
      
      observer.observe(existingInventoryDisplay, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  /**
   * Update only buttons and quantity selectors (for pages with custom inventory display)
   */
  function updateProductPageButtons(productId, inventory) {
    // Parse inventory - handle both number and string
    let inventoryCount = null;
    if (inventory !== null && inventory !== undefined) {
      inventoryCount = parseInt(inventory, 10);
      if (isNaN(inventoryCount)) {
        inventoryCount = null;
      }
    }
    
    // If inventory is null/undefined, try to extract from custom display element
    if (inventoryCount === null) {
      const customDisplay = document.getElementById('inventory-display');
      if (customDisplay && customDisplay.textContent) {
        // Try to extract number from text like "50 bags left in stock"
        const match = customDisplay.textContent.match(/(\d+)\s*(bag|bags|unit|units)/i);
        if (match) {
          inventoryCount = parseInt(match[1], 10);
          console.log(`Extracted inventory from custom display: ${inventoryCount}`);
        } else if (customDisplay.textContent.toLowerCase().includes('out of stock')) {
          inventoryCount = 0;
        }
      }
    }
    
    const status = getInventoryStatus(inventoryCount);
    
    // Update quantity selector max value
    const quantityInput = document.querySelector('input[type="number"][name="quantity"], input[type="number"].quantity, #quantity');
    if (quantityInput && status.available && inventoryCount !== null && inventoryCount > 0) {
      quantityInput.setAttribute('max', inventoryCount);
      quantityInput.setAttribute('data-max-inventory', inventoryCount);
      
      // Remove existing validation listener to avoid duplicates
      const newQuantityInput = quantityInput.cloneNode(true);
      quantityInput.parentNode.replaceChild(newQuantityInput, quantityInput);
      
      // Add validation
      newQuantityInput.addEventListener('change', function() {
        const requested = parseInt(this.value, 10) || 0;
        if (requested > inventoryCount) {
          this.value = inventoryCount;
          alert(`Only ${inventoryCount} units available. Quantity adjusted.`);
        }
      });
    }

    // Update add-to-cart button based on actual inventory
    const addToCartBtn = document.querySelector('.add-to-cart-btn, button[data-product-id], .cta-button[data-product-id]');
    if (!addToCartBtn) return;
    
    // Store original text if not already stored
    if (!addToCartBtn.dataset.originalText) {
      addToCartBtn.dataset.originalText = addToCartBtn.textContent || addToCartBtn.innerText || '';
    }
    
    // Determine if product is actually available
    const isAvailable = inventoryCount !== null && inventoryCount > 0;
    
    if (!isAvailable) {
      // Out of stock
      addToCartBtn.disabled = true;
      addToCartBtn.style.opacity = '0.6';
      addToCartBtn.style.cursor = 'not-allowed';
      if (!addToCartBtn.textContent.includes('Out of Stock')) {
        addToCartBtn.textContent = 'Out of Stock';
      }
      if (addToCartBtn.classList) {
        addToCartBtn.classList.add('disabled');
      }
    } else {
      // In stock - enable button
      addToCartBtn.disabled = false;
      addToCartBtn.style.opacity = '1';
      addToCartBtn.style.cursor = 'pointer';
      // Restore original text
      if (addToCartBtn.dataset.originalText) {
        addToCartBtn.textContent = addToCartBtn.dataset.originalText;
      }
      if (addToCartBtn.classList) {
        addToCartBtn.classList.remove('disabled');
      }
    }
    
    console.log(`Updated button for ${productId}: inventory=${inventoryCount}, available=${isAvailable}`);
  }

  /**
   * Initialize inventory display based on page type
   */
  function init() {
    // Wait for DOM and InventoryService to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        setTimeout(init, 100); // Small delay to ensure InventoryService is loaded
      });
      return;
    }

    // Check if we're on a product page or listing page
    const isProductPage = window.location.pathname.includes('/product-page/');
    const hasProductCards = document.querySelectorAll('.product-card').length > 0;

    if (isProductPage) {
      initProductPage();
    } else if (hasProductCards) {
      initProductCards();
    }
  }

  // Auto-initialize
  init();

  window.addEventListener('resize', scheduleListingOrderRefresh);
  window.addEventListener('orientationchange', scheduleListingOrderRefresh);

  // Export for manual initialization if needed
  window.InventoryDisplay = {
    init: init,
    initProductCards: initProductCards,
    initProductPage: initProductPage,
    updateProductCard: updateProductCard,
    updateProductPage: updateProductPage,
    reorderProductCardsByInventory: reorderProductCardsByInventory,
    refreshListingProductOrder: refreshListingProductOrder
  };

})();

