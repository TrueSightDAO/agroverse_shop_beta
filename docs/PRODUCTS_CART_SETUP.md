# Products Cart Setup Guide

## Overview

All products on the Agroverse Shop website now have "Add to Cart" functionality. Users can add any product to their cart from:
- ✅ Individual product pages
- ✅ Category pages (retail-packs, wholesale-bulk)
- ✅ Main page product gallery

## Product List

### Retail Products (4)
1. **Ceremonial Cacao – La do Sitio Farm** (200g) - $25.00
   - Product ID: `ceremonial-cacao-paulo-s-la-do-sitio-farm-200g`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)

2. **Taste of Rainforest - Caramelized Cacao Beans** (200g) - $25.00
   - Product ID: `taste-of-rainforest-caramelized-cacao-beans`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)

3. **Ceremonial Cacao – Oscar's Farm** (200g) - $25.00
   - Product ID: `oscar-bahia-ceremonial-cacao-200g`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)

4. **Amazon Rainforest Regenerative Cacao Nibs** (8 oz) - $25.00
   - Product ID: `8-ounce-organic-cacao-nibs`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)

### Wholesale Products (4)
1. **Organic Criollo Cacao Beans - Oscar's Farm** (per kg)
   - Product ID: `organic-criollo-cacao-beans-oscar-farm`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)
   - Note: Shows "Contact for Pricing"

2. **Organic Hybrid Cacao Beans - Jesus Da Deus** (per kg)
   - Product ID: `organic-hybrid-cacao-beans-jesus-da-deus`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)
   - Note: Shows "Contact for Pricing"

3. **Organic Criollo Cacao Nibs - Oscar's Farm** (per kg)
   - Product ID: `organic-criollo-cacao-nibs-oscar-farm`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)
   - Note: Shows "Contact for Pricing"

4. **Premium Organic Cacao Beans - La do Sitio** (per kg)
   - Product ID: `premium-organic-cacao-beans-la-do-sitio`
   - Stripe Price ID: `price_xxxxx` (TODO: Update)
   - Note: Shows "Contact for Pricing"

## Setup Steps

### 1. Create Products in Stripe

For each product:
1. Go to Stripe Dashboard → Products
2. Create a new product with:
   - Name: Match the product name exactly
   - Description: Product description
   - Price: Set the price (or $0 for wholesale if you want to handle pricing separately)
3. Copy the **Price ID** (starts with `price_...`)

### 2. Update Product Data

**Option A: Update `js/products.js`**
- Open `js/products.js`
- Replace all `price_xxxxx` with actual Stripe Price IDs

**Option B: Update HTML directly**
- Find each product page
- Update `data-stripe-price-id` attribute in "Add to Cart" buttons
- Update category pages and main page product cards

### 3. Test Cart Functionality

1. Start local server: `./start-local-server.sh`
2. Visit `http://127.0.0.1:8000`
3. Test adding products from:
   - Main page product gallery
   - Category pages
   - Individual product pages
4. Verify cart icon updates with item count
5. Test checkout flow

## Product Data File

The `js/products.js` file centralizes all product information:

```javascript
window.PRODUCTS = {
  'product-id': {
    productId: 'product-id',
    name: 'Product Name',
    price: 25.00,
    image: '/path/to/image.jpg',
    stripePriceId: 'price_xxxxx',
    category: 'retail' | 'wholesale',
    shipment: 'AGL4',
    farm: "Farm Name"
  }
}
```

## Where "Add to Cart" Buttons Are Located

### Product Pages
- All 8 product pages have "Add to Cart" buttons
- Located below product details
- Includes product data attributes

### Category Pages
- `/category/retail-packs/index.html` - 4 retail products
- `/category/wholesale-bulk/index.html` - 4 wholesale products
- Buttons appear in product card footer

### Main Page
- Product gallery section (`#products`)
- 4 retail products displayed
- Buttons appear in product card footer

## Wholesale Products

Wholesale products can still be added to cart, but:
- Price shows as "Contact for Pricing"
- Button text: "Add to Cart - Contact for Pricing"
- You can handle pricing in checkout or contact customer

**Alternative:** If you want wholesale products to only show "Contact" button:
- Remove "Add to Cart" buttons from wholesale product pages
- Keep only "Contact for Wholesale Pricing" link

## Next Steps

1. ✅ All "Add to Cart" buttons added
2. ⏳ Create products in Stripe
3. ⏳ Update Stripe Price IDs in code
4. ⏳ Test complete checkout flow
5. ⏳ Deploy to production

## Troubleshooting

### Cart not updating
- Check browser console for errors
- Verify `js/cart.js` is loaded
- Check localStorage is enabled

### "Add to Cart" button not working
- Verify `js/add-to-cart.js` is loaded
- Check product data attributes are correct
- Verify Stripe Price ID is set (even if placeholder)

### Products not showing in Stripe checkout
- Verify Stripe Price IDs are correct
- Check Google App Script is using correct Price IDs
- Test with Stripe test mode first

