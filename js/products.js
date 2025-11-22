/**
 * Products Data
 * Centralized product information
 * 
 * NOTE: We use price_data in Stripe checkout (like sentiment_importer), so no need for pre-created Price IDs.
 * Products are created dynamically during checkout.
 */

window.PRODUCTS = {
  // Retail Products
  'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': {
    productId: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
    name: 'Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)',
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/la-do-sitio-farm.jpg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL8',
    farm: "Paulo's Farm, Pará"
  },
  'taste-of-rainforest-caramelized-cacao-beans': {
    productId: 'taste-of-rainforest-caramelized-cacao-beans',
    name: 'Taste of Rainforest - 200 grams Caramelized Cacao Beans',
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/taste-of-rainforest.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL10',
    farm: 'Capela Velha Fazenda'
  },
  'oscar-bahia-ceremonial-cacao-200g': {
    productId: 'oscar-bahia-ceremonial-cacao-200g',
    name: "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)",
    price: 25.00,
    weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/oscars-farm.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia"
  },
  '8-ounce-organic-cacao-nibs': {
    productId: '8-ounce-organic-cacao-nibs',
    name: 'Amazon Rainforest Regenerative 8 Ounce Organic Cacao Nibs',
    price: 25.00,
    weight: 8.0, // 8 oz (227g) (for shipping calculation)
    image: '/assets/images/products/cacao-nibs.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'retail',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia"
  },
  
  // Wholesale Products
  'organic-criollo-cacao-beans-oscar-farm': {
    productId: 'organic-criollo-cacao-beans-oscar-farm',
    name: 'Organic Criollo Cacao Beans - Oscar\'s 100-Year Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/oscars-farm.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL14',
    farm: "Oscar's Farm, Bahia"
  },
  'organic-hybrid-cacao-beans-jesus-da-deus': {
    productId: 'organic-hybrid-cacao-beans-jesus-da-deus',
    name: 'Organic Hybrid Cacao Beans - Jesus Da Deus Fazenda (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/taste-of-rainforest.jpeg', // TODO: Update with correct image
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL13',
    farm: "Vivi's Jesus Do Deus Farm, Itacaré"
  },
  'organic-criollo-cacao-nibs-oscar-farm': {
    productId: 'organic-criollo-cacao-nibs-oscar-farm',
    name: 'Organic Criollo Cacao Nibs - Oscar\'s 100-Year Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/cacao-nibs.jpeg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL4',
    farm: "Oscar's Farm, Bahia"
  },
  'premium-organic-cacao-beans-la-do-sitio': {
    productId: 'premium-organic-cacao-beans-la-do-sitio',
    name: 'Premium Organic Cacao Beans - La do Sitio Farm (per kg)',
    price: 0, // Contact for pricing
    image: '/assets/images/products/la-do-sitio-farm.jpg',
    stripePriceId: '', // Not needed - using price_data instead
    category: 'wholesale',
    shipment: 'AGL8',
    farm: "Paulo's Farm, Pará"
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

