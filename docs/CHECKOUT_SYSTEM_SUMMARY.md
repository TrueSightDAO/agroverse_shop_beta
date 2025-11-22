# Checkout System Summary

## Overview

The Agroverse Shop now has **two distinct checkout flows**:

1. **Retail Products** → Direct Stripe Checkout
2. **Wholesale Products** → Quote Request System

This separation handles the different needs of B2C (retail) and B2B (wholesale) customers.

---

## Retail Products (Direct Checkout)

### Products
- 4 retail products at $25.00 each
- Fixed pricing, no variable costs
- Standard e-commerce flow

### User Flow
1. User adds product to cart (from any page)
2. Clicks cart icon → Reviews cart
3. Clicks "Checkout"
4. Fills shipping address form
5. Redirected to Stripe
6. Completes payment
7. Redirected to order status page
8. Can view order status anytime

### Where "Add to Cart" Appears
- ✅ Individual product pages
- ✅ Category page (`/category/retail-packs/`)
- ✅ Main page product gallery

---

## Wholesale Products (Quote Request)

### Products
- 4 wholesale products (per kg pricing)
- Variable costs: freight + customs
- Requires custom pricing

### User Flow
1. User clicks "Request Quote" on wholesale product
2. Fills quote request form:
   - Select products and quantities
   - Business information
   - Shipping address
   - Expected order frequency
   - Special requirements
3. Form submitted to Google App Script
4. Data saved to Google Sheet
5. Admin receives email notification
6. Admin provides custom quote
7. Admin sends quote to customer
8. If accepted, admin creates Stripe Payment Link or processes manually

### Where "Request Quote" Appears
- ✅ Individual wholesale product pages
- ✅ Wholesale category page (`/category/wholesale-bulk/`)

---

## Why This Approach?

### Retail Products
- ✅ Simple, instant checkout
- ✅ Fixed pricing known upfront
- ✅ Standard e-commerce experience
- ✅ No admin intervention needed

### Wholesale Products
- ✅ Handles variable freight/customs costs
- ✅ Allows negotiation and custom terms
- ✅ Professional B2B experience
- ✅ Accurate pricing for customers
- ✅ Admin maintains control

---

## Technical Implementation

### Retail Checkout
- **Cart**: localStorage-based
- **Checkout**: Custom form → Stripe Checkout Session
- **Payment**: Stripe (hosted checkout)
- **Order Storage**: Google Sheets
- **Order Status**: Fetched from Google Sheets

### Wholesale Quote Requests
- **Form**: Custom quote request page
- **Submission**: Google App Script
- **Storage**: Google Sheets ("Quote Requests" tab)
- **Notification**: Email to admin
- **Follow-up**: Admin-managed

---

## Files Structure

```
agroverse_shop/
├── checkout/
│   └── index.html              # Retail checkout (shipping form)
├── order-status/
│   └── index.html              # Order status page
├── quote-request/
│   └── index.html              # Wholesale quote request form
├── js/
│   ├── config.js              # Environment config
│   ├── cart.js                # Cart management
│   ├── cart-ui.js             # Cart UI components
│   ├── checkout.js            # Checkout logic
│   ├── order-status.js        # Order status fetching
│   ├── add-to-cart.js         # Add to cart handler
│   └── quote-request.js       # Quote request handler
├── css/
│   └── cart.css               # Cart styles
└── google-app-script/
    └── agroverse_shop_checkout.gs  # Backend (Stripe + Quotes)
```

---

## Google Sheets Structure

### "Orders" Sheet (Retail)
- Session ID, Email, Date, Status
- Items (JSON), Shipping Address (JSON)
- Tracking Number, Email Sent, Last Updated

### "Quote Requests" Sheet (Wholesale)
- Date, Business Name, Contact Info
- Products (JSON), Shipping Address
- Status, Quote Provided, Quote Amount
- Last Updated

---

## Admin Workflows

### Retail Orders
1. Order appears in "Orders" sheet
2. Admin fulfills order
3. Admin adds tracking number
4. Automated email sent to customer

### Wholesale Quotes
1. Quote request appears in "Quote Requests" sheet
2. Admin gets freight quote
3. Admin calculates total
4. Admin updates sheet with quote
5. Admin emails quote to customer
6. If accepted, admin creates Stripe Payment Link

---

## Next Steps

1. ✅ Retail checkout implemented
2. ✅ Wholesale quote system implemented
3. ⏳ Create Stripe products and get Price IDs
4. ⏳ Set up Google Sheets with both tabs
5. ⏳ Configure Google App Script
6. ⏳ Test both flows
7. ⏳ Deploy to production

---

## Key Benefits

- **Clear Separation**: Retail vs Wholesale handled appropriately
- **Professional**: Industry-standard B2B quote process
- **Flexible**: Handles variable costs properly
- **Scalable**: Easy to add more products or fields
- **Trackable**: All data in Google Sheets
- **Cost-Effective**: No backend server needed

