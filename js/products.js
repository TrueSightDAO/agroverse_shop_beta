/**
 * Products Data
 * Centralized product information
 * 
 * NOTE: We use price_data in Stripe checkout (like sentiment_importer), so no need for pre-created Price IDs.
 * Products are created dynamically during checkout.
 *
 * relatedFamily: groups PDPs for js/related-pdp-section.js (merged with same-farm picks).
 * productPageSlug: folder name under /product-page/ for this SKU's PDP.
 * gtin: GTIN-14 (or other GTIN format) for Google Merchant Center and structured data.
 *       Add this field to every product entry; scripts generating PDP pages,
 *       JSON-LD, and product feeds read it from here as the single source of truth.
 *
 * SUBSCRIPTION FIELDS (generic / subscribable entries only):
 *   subscribable: true           — this SKU can be subscribed to
 *   subscriptionSlug: string     — maps to /subscribe/<slug>/ clean URL
 *   cadence: 'monthly'           — billing interval
 *   minQty, maxQty, defaultQty   — quantity bounds for the subscribe engine
 *   origin: 'rotating'           — sentinel: not bound to a single farm/shipment
 */

window.PRODUCTS = {
  // Retail Products
  'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': {
    productId: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
    // URL path under /product-page/ (must match folder name; id may differ for Stripe/SKU)
    productPageSlug: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g',
    name: 'Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)',
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/la-do-sitio-farm.jpg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL8',
    farm: "Paulo's Farm, Pará",
    relatedFamily: 'ceremonial-200g'
  },
  'taste-of-rainforest-caramelized-cacao-beans': {
    productId: 'taste-of-rainforest-caramelized-cacao-beans',
    productPageSlug: 'taste-of-rainforest-200-grams-caramelized-cacao-beans',
    name: 'Taste of Rainforest - 200 grams Caramelized Cacao Beans',
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/taste-of-rainforest.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL10',
    farm: 'Capela Velha Fazenda',
    gtin: '00860010660249',
    relatedFamily: 'whole-cacao-retail'
  },
  'oscar-bahia-ceremonial-cacao-200g': {
    productId: 'oscar-bahia-ceremonial-cacao-200g',
    productPageSlug: 'oscar-s-bahia-ceremonial-cacao',
    name: "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)",
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/oscars-farm.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia",
    relatedFamily: 'ceremonial-200g'
  },
  '8-ounce-organic-cacao-nibs': {
    productId: '8-ounce-organic-cacao-nibs',
    productPageSlug: '8-ounce-organic-cacao-nibs-from-brazil',
    name: 'Amazon Rainforest Regenerative 8 Ounce Organic Cacao Nibs',
    price: 25.00,
    weight: 8.0, // 8 oz (227g) (for shipping calculation)
    image: '/assets/images/products/cacao-nibs.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia",
    relatedFamily: 'whole-cacao-retail'
  },
  
  // Wholesale Products
  'organic-criollo-cacao-beans-oscar-farm': {
    productId: 'organic-criollo-cacao-beans-oscar-farm',
    productPageSlug: 'organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm',
    name: 'Organic Criollo Cacao Beans - Oscar\'s 100-Year Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/oscars-farm.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL14',
    farm: "Oscar's Farm, Bahia",
    relatedFamily: 'bulk-beans-wholesale'
  },
  'organic-hybrid-cacao-beans-jesus-da-deus': {
    productId: 'organic-hybrid-cacao-beans-jesus-da-deus',
    productPageSlug: 'organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram',
    name: 'Organic Hybrid Cacao Beans - Jesus Da Deus Fazenda (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/taste-of-rainforest.jpeg', // TODO: Update with correct image
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL13',
    farm: "Vivi's Jesus Do Deus Farm, Itacaré",
    relatedFamily: 'bulk-beans-wholesale'
  },
  'organic-criollo-cacao-nibs-oscar-farm': {
    productId: 'organic-criollo-cacao-nibs-oscar-farm',
    productPageSlug: 'organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm',
    name: 'Organic Criollo Cacao Nibs - Oscar\'s 100-Year Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/cacao-nibs.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia",
    relatedFamily: 'bulk-beans-wholesale'
  },
  'premium-organic-cacao-beans-la-do-sitio': {
    productId: 'premium-organic-cacao-beans-la-do-sitio',
    productPageSlug: 'premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far',
    name: 'Premium Organic Cacao Beans - La do Sitio Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/la-do-sitio-farm.jpg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL8',
    farm: "Paulo's Farm, Pará",
    relatedFamily: 'bulk-beans-wholesale'
  },
  'ceremonial-cacao-fazenda-santa-ana-2023-200g': {
    productId: 'ceremonial-cacao-fazenda-santa-ana-2023-200g',
    productPageSlug: 'ceremonial-cacao-fazenda-santa-ana-2023-200g',
    name: 'Ceremonial Cacao – Fazenda Santa Ana, Bahia Brazil, 2023 (200g)',
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/fazenda-santa-ana-product.jpg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL2',
    farm: 'Fazenda Santa Ana, Bahia',
    relatedFamily: 'ceremonial-200g'
  },
  'organic-81-dark-chocolate-bar-50g-oscar-bahia-2024': {
    productId: 'organic-81-dark-chocolate-bar-50g-oscar-bahia-2024',
    productPageSlug: 'organic-81-dark-chocolate-bar-50g-oscar-bahia-2024',
    name: "81% Organic Dark Chocolate Bar (50g) — Oscar's Farm, Bahia Brazil, 2024",
    price: 10.00,
    weight: 1.76, // 50g ≈ 1.76 oz (shipping calculation)
    image: '/assets/images/products/81-dark-chocolate-bar-50g-packaging.jpg',
    stripePriceId: '',
    category: 'retail',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia",
    gtin: '00860010660256',
    relatedFamily: 'bar-81-50g'
  },
  'organic-81-dark-chocolate-bar-50g-fazenda-santa-ana-bahia-2023': {
    productId: 'organic-81-dark-chocolate-bar-50g-fazenda-santa-ana-bahia-2023',
    productPageSlug: 'organic-81-dark-chocolate-bar-50g-fazenda-santa-ana-bahia-2023',
    name: '81% Organic Dark Chocolate Bar (50g) — Fazenda Santa Ana, Bahia Brazil, 2023',
    price: 10.00,
    weight: 1.76,
    image: '/assets/images/products/81-dark-chocolate-bar-50g-packaging.jpg',
    stripePriceId: '',
    category: 'retail',
    shipment: 'AGL2',
    farm: 'Fazenda Santa Ana, Bahia',
    gtin: '00860010660256',
    relatedFamily: 'bar-81-50g'
  },

  // ===== GENERIC / SUBSCRIBABLE ENTRIES =====
  // These are vintage-independent, single-GTIN entries. The GTIN is shared with
  // the vintage PDPs above. Provenance is per-bar via the QR code.

  'generic-ceremonial-cacao-chocolate-bar': {
    productId: 'generic-ceremonial-cacao-chocolate-bar',
    productPageSlug: 'ceremonial-cacao-chocolate-bar',
    name: 'Ceremonial Cacao Chocolate Bar — Single-Estate, Monthly Discovery',
    price: 10.00,
    weight: 1.76, // 50g ≈ 1.76 oz
    image: '/assets/images/products/81-dark-chocolate-bar-50g-packaging.jpg',
    stripePriceId: '',
    category: 'retail',
    gtin: '00860010660256', // Shared 81% 50g bar GTIN — REUSE, never mint
    origin: 'rotating',      // Sentinel: NOT one farm/shipment
    relatedFamily: 'bar-81-50g',
    // Subscription metadata
    subscribable: true,
    subscriptionSlug: 'chocolate-bar',  // → /subscribe/chocolate-bar/
    cadence: 'monthly',
    minQty: 1,
    maxQty: 24,
    defaultQty: 6
  }
};

/**
 * Get product by ID
 */
window.getProduct = function(productId) {
  return window.PRODUCTS[productId] || null;
};

/**
 * Get all products
 */
window.getAllProducts = function() {
  return Object.values(window.PRODUCTS);
};

/**
 * Get products by category
 */
window.getProductsByCategory = function(category) {
  return Object.values(window.PRODUCTS).filter(p => p.category === category);
};

/**
 * Get subscribable products (those with subscribable: true)
 */
window.getSubscribableProducts = function() {
  return Object.values(window.PRODUCTS).filter(p => p.subscribable === true);
};

/**
 * Resolve a subscription slug to its product entry.
 * Returns null if no match.
 */
window.getProductBySubscriptionSlug = function(slug) {
  var all = Object.values(window.PRODUCTS);
  for (var i = 0; i < all.length; i++) {
    if (all[i].subscriptionSlug === slug) {
      return all[i];
    }
  }
  return null;
};
