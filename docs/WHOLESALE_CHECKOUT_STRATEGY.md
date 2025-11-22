# Wholesale Checkout Strategy

## Problem Statement

Wholesale products have variable costs that can't be determined upfront:
- **Freighting costs** vary by:
  - Quantity ordered
  - Destination
  - Shipping method
  - Current freight rates
- **Customs/duties** vary by:
  - Destination country
  - Product classification
  - Current trade agreements
  - Declared value
- **Pricing** may be:
  - Negotiated based on volume
  - Subject to minimum order quantities
  - Dependent on payment terms

## Recommended Approach: Quote Request System

Instead of direct checkout, implement a **Quote Request** flow for wholesale products.

### Option 1: Quote Request Form (Recommended)

**Flow:**
1. User clicks "Request Quote" on wholesale product
2. Form collects:
   - Product(s) of interest
   - Desired quantity
   - Shipping address
   - Business information
   - Contact details
3. Submission goes to:
   - Google Sheet (for admin tracking)
   - Email notification to admin
4. Admin reviews and provides custom quote
5. Admin can then:
   - Create custom Stripe checkout link
   - Or process order manually

**Pros:**
- ✅ Handles variable costs properly
- ✅ Allows negotiation
- ✅ Professional B2B experience
- ✅ No false pricing expectations
- ✅ Admin maintains control

**Cons:**
- ❌ Not instant checkout
- ❌ Requires admin follow-up

### Option 2: Hybrid - Add to Cart with Quote Request

**Flow:**
1. User adds wholesale product to cart
2. Cart shows: "Quote Required - Contact for Pricing"
3. At checkout, instead of Stripe:
   - Show quote request form
   - Collect additional info (quantity, shipping, etc.)
   - Submit to admin
4. Admin provides quote
5. Admin creates custom Stripe checkout or processes manually

**Pros:**
- ✅ Users can build a cart with multiple wholesale items
- ✅ Still requires quote before payment
- ✅ Familiar shopping cart experience

**Cons:**
- ❌ More complex implementation
- ❌ May confuse users expecting instant checkout

### Option 3: Remove Checkout Entirely

**Flow:**
1. Remove "Add to Cart" buttons from wholesale products
2. Show only "Contact for Wholesale Pricing" button
3. Direct to email or contact form

**Pros:**
- ✅ Simplest implementation
- ✅ Clear expectations
- ✅ No confusion

**Cons:**
- ❌ Users can't build a cart
- ❌ Less modern UX

## ✅ IMPLEMENTED: Option 1 (Quote Request Form)

This is the most professional approach for B2B wholesale. Here's why:

1. **Industry Standard**: Most B2B wholesale operations use quote requests
2. **Accurate Pricing**: Ensures customers get correct freight/customs costs
3. **Flexibility**: Allows negotiation and custom terms
4. **Professional**: Shows you handle wholesale properly

**Status:** ✅ Fully implemented - See `docs/WHOLESALE_QUOTE_SYSTEM.md` for details

## Implementation Plan

### Phase 1: Replace "Add to Cart" with "Request Quote"

1. Update wholesale product pages
2. Update wholesale category page
3. Create quote request form page
4. Integrate with Google Sheets (via Google App Script)
5. Send email notifications

### Phase 2: Quote Request Form Features

**Form Fields:**
- Product(s) interested in (multi-select)
- Desired quantity per product
- Shipping address
- Business name
- Contact name
- Email
- Phone
- Company type (retailer, manufacturer, etc.)
- Expected order frequency
- Special requirements/notes

**Backend:**
- Google App Script receives form submission
- Writes to Google Sheet (Quote Requests tab)
- Sends email to admin with quote request details
- Optionally sends confirmation email to customer

### Phase 3: Admin Workflow

1. Admin receives quote request notification
2. Admin reviews request in Google Sheet
3. Admin contacts freight company for quote
4. Admin calculates total (product + freight + customs)
5. Admin updates Google Sheet with quote
6. Admin sends quote to customer via email
7. If customer accepts:
   - Admin creates custom Stripe checkout session
   - Or processes order manually

## Alternative: Stripe Payment Links

For accepted quotes, admin can:
1. Create Stripe Payment Link with custom amount
2. Send link to customer
3. Customer pays via link
4. Order processes normally

This keeps everything in Stripe while allowing custom pricing.

## Comparison Table

| Approach | Implementation | User Experience | Admin Work | Best For |
|----------|---------------|-----------------|------------|----------|
| **Quote Request Form** | Medium | Professional | Medium | B2B Wholesale |
| **Hybrid Cart** | Complex | Familiar | Medium | Mixed B2B/B2C |
| **Contact Only** | Simple | Basic | High | Small Volume |
| **Stripe Payment Links** | Medium | Modern | Low | After Quote |

## Recommendation Summary

**For Wholesale Products:**
- ✅ Remove "Add to Cart" buttons
- ✅ Add "Request Quote" buttons
- ✅ Create quote request form
- ✅ Integrate with Google Sheets
- ✅ Email notifications

**For Retail Products:**
- ✅ Keep "Add to Cart" buttons
- ✅ Direct Stripe checkout
- ✅ Standard e-commerce flow

This gives you:
- Professional B2B experience for wholesale
- Simple B2C experience for retail
- Proper handling of variable costs
- Clear customer expectations

