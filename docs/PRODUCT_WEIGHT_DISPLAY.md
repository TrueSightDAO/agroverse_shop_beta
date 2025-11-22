# Product Weight Display Guide

## Overview

Product weights are displayed on product pages and used for shipping cost calculation. This guide explains the cleanest way to indicate weight for each product.

## Display Pattern

### On Product Pages

Product weights are displayed in the **"Product Details"** section using a consistent pattern:

```html
<div class="product-details">
  <h3>Product Details</h3>
  <div class="detail-row">
    <span class="detail-label">Weight:</span>
    <span class="detail-value">200g</span>
  </div>
  <!-- other details -->
</div>
```

### Weight Format

- **Metric**: Use grams (g) for smaller products (e.g., `200g`, `227g`)
- **Imperial**: Use ounces (oz) for US market (e.g., `8 oz`)
- **Dual Format**: Show both when helpful (e.g., `8 oz (227g)`)

**Examples:**
- `200g` - Simple metric
- `8 oz (227g)` - Imperial with metric conversion
- `7.05 oz` - Precise imperial (for shipping calculation)

## Adding Weight to Products

### Step 1: Add to Product Data (`js/products.js`)

Add `weight` property in **ounces** (for shipping calculation):

```javascript
'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': {
  productId: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
  name: 'Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)',
  price: 25.00,
  weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
  image: '/assets/images/products/la-do-sitio-farm.jpg',
  stripePriceId: 'price_xxxxx',
  // ... rest of product data
}
```

**Weight Conversion:**
- 1 gram = 0.035274 ounces
- 200g = 7.05 oz
- 227g = 8.0 oz

### Step 2: Display on Product Page

Add weight to the "Product Details" section:

```html
<div class="detail-row">
  <span class="detail-label">Weight:</span>
  <span class="detail-value">200g</span>
</div>
```

### Step 3: Weight is Automatically Used

- When product is added to cart, weight is included
- Shipping calculation uses weight for EasyPost rate calculation
- Weight is stored in cart items for accurate shipping costs

## Current Product Pages

These product pages already display weight:

- ✅ `product-page/oscar-s-bahia-ceremonial-cacao/index.html` - "200g"
- ✅ `product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans/index.html` - "200g"
- ✅ `product-page/8-ounce-organic-cacao-nibs-from-brazil/index.html` - "8 oz (227g)"
- ✅ `product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g/index.html` - "200g"

## Best Practices

1. **Consistency**: Always display weight in the "Product Details" section
2. **User-Friendly**: Show weight in the format customers expect (grams for metric, oz for US)
3. **Precision**: Store weight in ounces in `products.js` for accurate shipping calculation
4. **Dual Format**: Consider showing both metric and imperial when helpful (e.g., "8 oz (227g)")

## Weight Conversion Reference

| Grams | Ounces (approx) | Common Products |
|-------|----------------|-----------------|
| 200g | 7.05 oz | Standard cacao bags |
| 227g | 8.0 oz | Cacao nibs |
| 250g | 8.82 oz | Larger bags |
| 500g | 17.64 oz | Bulk products |
| 1000g (1kg) | 35.27 oz | Wholesale products |

## Example: Complete Product Setup

**In `js/products.js`:**
```javascript
'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': {
  productId: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
  name: 'Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)',
  price: 25.00,
  weight: 7.05, // 200g in ounces (for shipping)
  image: '/assets/images/products/la-do-sitio-farm.jpg',
  stripePriceId: 'price_xxxxx',
  category: 'retail',
  shipment: 'AGL8',
  farm: "Paulo's Farm, Pará"
}
```

**On product page:**
```html
<div class="product-details">
  <h3>Product Details</h3>
  <div class="detail-row">
    <span class="detail-label">Weight:</span>
    <span class="detail-value">200g</span>
  </div>
  <div class="detail-row">
    <span class="detail-label">Origin:</span>
    <span class="detail-value">Paulo's Farm, Pará, Brazil</span>
  </div>
  <!-- other details -->
</div>
```

## Why This Approach?

1. **Clean Display**: Weight is shown in a consistent, easy-to-find location
2. **Shipping Accuracy**: Weight in ounces enables accurate shipping cost calculation
3. **User Experience**: Customers see weight in familiar units (grams/ounces)
4. **Maintainability**: Weight is stored in one place (`products.js`) and used everywhere

