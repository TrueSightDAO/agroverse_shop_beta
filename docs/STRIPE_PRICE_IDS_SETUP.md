# Stripe Price IDs Setup Guide

## Current Issue

All products currently have placeholder Stripe Price IDs (`price_xxxxx`). You need to create products in Stripe and update the Price IDs in `js/products.js`.

## Step-by-Step Setup

### 1. Create Products in Stripe

For each product in your shop:

1. **Go to Stripe Dashboard**
   - Visit [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Make sure you're in **Test mode** for development or **Live mode** for production

2. **Create a Product**
   - Click **Products** in the left sidebar
   - Click **+ Add product**
   - Fill in:
     - **Name**: Product name (e.g., "Taste of Rainforest - 200 grams Caramelized Cacao Beans")
     - **Description**: Product description (optional)
     - **Pricing**: 
       - **Price**: $25.00 (or your product price)
       - **Currency**: USD
       - **Billing period**: One time
   - Click **Save product**

3. **Copy the Price ID**
   - After saving, you'll see the product details
   - Find the **Price ID** (starts with `price_...`)
   - Copy it (e.g., `price_1ABC123def456GHI789jkl012`)

### 2. Update Product Data

Open `js/products.js` and replace all `price_xxxxx` with your actual Stripe Price IDs:

```javascript
'taste-of-rainforest-caramelized-cacao-beans': {
  productId: 'taste-of-rainforest-caramelized-cacao-beans',
  name: 'Taste of Rainforest - 200 grams Caramelized Cacao Beans',
  price: 25.00,
  weight: 7.05,
  image: '/assets/images/products/taste-of-rainforest.jpeg',
  stripePriceId: 'price_1ABC123def456GHI789jkl012', // ← Replace with your actual Price ID
  category: 'retail',
  shipment: 'AGL10',
  farm: 'Capela Velha Fazenda'
},
```

### 3. Products That Need Price IDs

#### Retail Products (4)
1. `ceremonial-cacao-paulo-s-la-do-sitio-farm-200g` - $25.00
2. `taste-of-rainforest-caramelized-cacao-beans` - $25.00
3. `oscar-bahia-ceremonial-cacao-200g` - $25.00
4. `8-ounce-organic-cacao-nibs` - $25.00

#### Wholesale Products (4)
**Note:** Wholesale products can use $0.00 prices in Stripe if you want to handle pricing separately, or set actual prices if you want direct checkout.

1. `organic-criollo-cacao-beans-oscar-farm`
2. `organic-hybrid-cacao-beans-jesus-da-deus`
3. `organic-criollo-cacao-nibs-oscar-farm`
4. `premium-organic-cacao-beans-la-do-sitio`

### 4. Test Mode vs Live Mode

**Important:** You need separate Price IDs for Test mode and Live mode!

- **Test Mode Price IDs**: Start with `price_` and are used when `environment=development`
- **Live Mode Price IDs**: Also start with `price_` but are different from test mode

**Option A: Use Same Price IDs for Both (Simpler)**
- Create products in Test mode
- Use those Price IDs in `js/products.js`
- When switching to production, create the same products in Live mode and update the Price IDs

**Option B: Environment-Specific Price IDs (More Complex)**
- Store test and live Price IDs separately
- Update the code to select the correct Price ID based on environment

For now, **Option A is recommended** - just use Test mode Price IDs during development.

### 5. Verify Setup

1. Open `js/products.js`
2. Search for `price_xxxxx` - there should be no results
3. All products should have real Price IDs starting with `price_`
4. Test checkout flow:
   - Add product to cart
   - Go to checkout
   - Should successfully create Stripe checkout session

## Quick Reference

**Where to find Price IDs:**
- Stripe Dashboard → Products → [Product Name] → Pricing section

**Price ID format:**
- Test mode: `price_1ABC123def456GHI789jkl012`
- Live mode: `price_1XYZ789abc012DEF345ghi678`

**File to update:**
- `js/products.js` - Update `stripePriceId` for each product

## Troubleshooting

### Error: "No such price: 'price_xxxxx'"
- **Cause**: Placeholder Price ID not replaced
- **Fix**: Update `stripePriceId` in `js/products.js` with actual Stripe Price ID

### Error: "No such price: 'price_1ABC...'"
- **Cause**: Price ID doesn't exist in current Stripe mode (test vs live)
- **Fix**: Make sure you're using Test mode Price IDs when `environment=development`

### Error: "Invalid Stripe Price ID for product: ..."
- **Cause**: Price ID format is invalid or missing
- **Fix**: Ensure Price ID starts with `price_` and is from your Stripe account

## Next Steps

After updating all Price IDs:
1. Test adding products to cart
2. Test checkout flow
3. Complete a test purchase in Stripe Test mode
4. Verify order appears in Google Sheet
5. When ready for production, create products in Live mode and update Price IDs

