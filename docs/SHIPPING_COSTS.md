# Shipping Costs Implementation

## Overview

Shipping costs are now automatically included in the Stripe checkout process, following the same pattern used in the `sentiment_importer` codebase.

The system uses **EasyPost API** to calculate real USPS shipping rates based on:
- Package weight (product weights + base box + per-item packaging)
- Origin address (your warehouse/store)
- Destination address (customer's shipping address)

If EasyPost is not configured, it falls back to fixed shipping rates based on order total.

## How It Works

### Primary Method: EasyPost API (Real USPS Rates)

If `EASYPOST_API_KEY` is configured in Script Properties:

1. **Calculate Package Weight**:
   - Product weights (from cart items, in ounces)
   - Base box weight (default: 11.5 oz, configurable via `BASE_BOX_WEIGHT_OZ`)
   - Per-item packaging weight (default: 0.65 oz per item, configurable via `PER_ITEM_PACKAGING_OZ`)
   - Total = product weights + base box + (per-item weight × quantity)

2. **Get Real USPS Rates**:
   - Uses EasyPost API to calculate actual USPS shipping rates
   - Based on package weight, origin address (warehouse), and destination address (customer)
   - Returns multiple USPS service options (Priority Mail, First-Class, etc.)
   - Rates are converted to Stripe shipping rate format

3. **Fallback to Fixed Rates**:
   - If EasyPost fails or is not configured, falls back to fixed rates based on order total

### Fallback Method: Fixed Rates (if EasyPost not configured)

Shipping rates are fixed (no free shipping):

1. **Standard Shipping**
   - Delivery: 3-7 business days
   - Amount: $5.00

2. **Express Shipping**
   - Delivery: 1-3 business days
   - Amount: $15.00

### Implementation Details

The shipping rates are calculated in the Google App Script (`agroverse_shop_checkout.gs`):

```javascript
// Primary: EasyPost calculation
function calculateShippingRatesViaEasyPost(weightOz, shippingAddress) {
  // Calls EasyPost API to get real USPS rates
  // Returns array of shipping rate objects for Stripe
}

// Fallback: Fixed rates
function buildShippingRates(orderTotalCents) {
  // Calculates shipping options based on order total
  // Returns array of shipping rate objects for Stripe
}
```

### Stripe Integration

- Shipping options are added to the Stripe checkout session via `shipping_options`
- Stripe automatically displays these options during checkout
- The cheapest option is auto-selected
- Customer can choose a different option if desired

### Package Weight Calculation

Package weight is calculated from cart items:
- Each item's weight (in ounces) is multiplied by quantity
- Base box weight is added (default: 11.5 oz)
- Per-item packaging weight is added (default: 0.65 oz × quantity)
- Total weight is used for EasyPost rate calculation

**Note:** Product weights should be included in cart items. Add `weight` property (in ounces) to products in `js/products.js`.

## Setup

### 1. Configure EasyPost (Recommended)

1. Get EasyPost API key from [EasyPost Dashboard](https://www.easypost.com/dashboard)
2. Add to Script Properties: `EASYPOST_API_KEY`
3. Configure origin address (warehouse/store):
   - `ORIGIN_ADDRESS_LINE1`
   - `ORIGIN_ADDRESS_CITY`
   - `ORIGIN_ADDRESS_STATE`
   - `ORIGIN_ADDRESS_POSTAL_CODE`
   - `ORIGIN_ADDRESS_COUNTRY` (default: "US")
4. (Optional) Configure package weights:
   - `BASE_BOX_WEIGHT_OZ` (default: 11.5)
   - `PER_ITEM_PACKAGING_OZ` (default: 0.65)

### 2. Add Product Weights

Add `weight` property (in ounces) to products in `js/products.js`:

```javascript
'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g': {
  productId: 'ceremonial-cacao-paulo-s-la-do-sitio-farm-200g',
  name: 'Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)',
  price: 25.00,
  weight: 7.05, // 200g = ~7.05 oz
  // ... rest of product data
}
```

### 3. Fallback Configuration (if not using EasyPost)

If EasyPost is not configured, edit the `buildShippingRates()` function in `google-app-script/agroverse_shop_checkout.gs`:

```javascript
// Change standard shipping amount
amount: 500, // $5.00 in cents

// Change express shipping amount
amount: 1500, // $15.00 in cents
```

### Add More Shipping Options

Add additional shipping options to the `rates` array:

```javascript
rates.push({
  shipping_rate_data: {
    type: 'fixed_amount',
    fixed_amount: {
      amount: 2500, // $25.00 in cents
      currency: 'usd'
    },
    display_name: 'Overnight Shipping',
    delivery_estimate: {
      minimum: { unit: 'business_day', value: 1 },
      maximum: { unit: 'business_day', value: 1 }
    }
  }
});
```

### Use Dynamic Shipping Rates

For dynamic shipping rates based on address/weight, you can:

1. Use Stripe's shipping rate calculation callback
2. Integrate with a shipping API (USPS, FedEx, etc.)
3. Calculate rates based on package weight and destination

See `sentiment_importer` for examples of dynamic rate calculation.

## Testing

### Test Standard Shipping

1. Add items to cart
2. Go to checkout
3. Enter shipping address
4. Verify "Standard Shipping ($5.00)" option appears (or EasyPost rates if configured)
5. Verify "Express Shipping ($15.00)" option also appears (or EasyPost rates if configured)
6. Complete checkout
7. Verify shipping cost is included in total

## Notes

- Shipping costs are calculated server-side in Google App Script
- Rates are sent to Stripe as part of checkout session creation
- Customer selects shipping option during Stripe checkout
- Shipping cost is included in the final payment amount
- Shipping information is stored in Stripe session metadata

