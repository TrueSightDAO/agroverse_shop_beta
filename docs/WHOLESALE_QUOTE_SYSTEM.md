# Wholesale Quote Request System

## Overview

Wholesale products now use a **Quote Request** system instead of direct checkout. This handles the variable costs (freight, customs) that can't be determined upfront.

## Why Quote Requests?

**Problem with Direct Checkout:**
- ❌ Freight costs vary by quantity and destination
- ❌ Customs/duties vary by country and current rates
- ❌ Pricing may be negotiated based on volume
- ❌ Can't provide accurate total cost upfront

**Solution: Quote Request System**
- ✅ Collects all necessary information
- ✅ Admin can get accurate freight quotes
- ✅ Admin can provide custom pricing
- ✅ Professional B2B experience
- ✅ No false pricing expectations

## User Flow

### 1. User Clicks "Request Quote"
- From wholesale product page
- From wholesale category page
- Button: "Request Wholesale Quote"

### 2. Quote Request Form
- Pre-selects product if coming from product page
- User fills out:
  - Products of interest (multi-select with quantities)
  - Business information
  - Contact details
  - Shipping address
  - Expected order frequency
  - Special requirements

### 3. Form Submission
- Data sent to Google App Script
- Saved to Google Sheet ("Quote Requests" tab)
- Email notification sent to admin
- Confirmation shown to user

### 4. Admin Workflow
1. Admin receives email notification
2. Admin reviews request in Google Sheet
3. Admin contacts freight company for quote
4. Admin calculates total (product + freight + customs)
5. Admin updates Google Sheet with quote
6. Admin sends quote to customer via email

### 5. After Quote Accepted
- Admin can create custom Stripe Payment Link
- Or process order manually
- Customer pays via provided link

## Implementation Details

### Files Created
- `quote-request/index.html` - Quote request form page
- `js/quote-request.js` - Form handling and submission
- Updated `google-app-script/agroverse_shop_checkout.gs` - Added `submitQuoteRequest()` function

### Google Sheets Structure

**"Quote Requests" Sheet:**
| Column | Header | Description |
|--------|--------|-------------|
| A | Date | Request submission date |
| B | Business Name | Customer's business name |
| C | Contact Name | Primary contact |
| D | Email | Contact email |
| E | Phone | Contact phone |
| F | Company Type | Retailer, Manufacturer, etc. |
| G | Shipping Address | Full shipping address |
| H | Expected Frequency | Order frequency |
| I | Products (JSON) | Selected products with quantities |
| J | Notes | Additional requirements |
| K | Status | Pending, Quoted, Accepted, etc. |
| L | Quote Provided | Yes/No |
| M | Quote Amount | Final quoted price |
| N | Last Updated | Last update timestamp |

### Google App Script Function

**`submitQuoteRequest(data)`**
- Receives quote request data
- Writes to "Quote Requests" sheet
- Sends email notification to admin
- Returns success/error response

## Admin Workflow

### Step 1: Receive Quote Request
- Email notification arrives
- Or check Google Sheet for new "Pending" requests

### Step 2: Get Freight Quote
- Contact freight company with:
  - Product details
  - Quantity
  - Shipping address
  - Get freight quote

### Step 3: Calculate Total
- Product cost (may be negotiated)
- Freight cost
- Customs/duties (if applicable)
- Total = Product + Freight + Customs

### Step 4: Update Google Sheet
- Update "Quote Provided" to "Yes"
- Enter "Quote Amount"
- Update "Status" to "Quoted"
- Add notes if needed

### Step 5: Send Quote to Customer
- Email customer with:
  - Itemized breakdown
  - Total price
  - Payment terms
  - Validity period

### Step 6: Process Accepted Quote
**Option A: Stripe Payment Link**
1. Create Stripe Payment Link with custom amount
2. Send link to customer
3. Customer pays
4. Order processes normally

**Option B: Manual Processing**
1. Customer confirms acceptance
2. Process payment manually
3. Create order in system
4. Fulfill order

## URL Parameters

The quote request form supports pre-selecting products:

```
/quote-request/index.html?product=organic-criollo-cacao-beans-oscar-farm
```

This automatically:
- Checks the product checkbox
- Enables quantity input
- Sets default quantity to 1
- Scrolls to product selection

## Email Notifications

### Admin Notification
Sent when quote request is submitted:
- Subject: "New Wholesale Quote Request - [Business Name]"
- Contains all request details
- Link to Google Sheet

### Customer Confirmation (Future Enhancement)
Could send confirmation email to customer:
- Thank you message
- Expected response time
- Contact information

## Integration with Existing System

### Retail Products
- ✅ Keep "Add to Cart" buttons
- ✅ Direct Stripe checkout
- ✅ Standard e-commerce flow

### Wholesale Products
- ✅ "Request Quote" buttons
- ✅ Quote request form
- ✅ Admin-managed pricing
- ✅ Custom checkout after quote

## Benefits

1. **Accurate Pricing**: No guesswork on freight/customs
2. **Professional**: Industry-standard B2B approach
3. **Flexible**: Allows negotiation and custom terms
4. **Trackable**: All requests in Google Sheet
5. **Scalable**: Easy to add more fields or automation

## Future Enhancements

1. **Automated Email to Customer**: Confirmation email on submission
2. **Quote Expiry Tracking**: Auto-expire quotes after X days
3. **Quote Templates**: Pre-filled templates for common scenarios
4. **Integration with Freight APIs**: Auto-fetch freight quotes
5. **Customer Portal**: Let customers view their quote requests
6. **Stripe Payment Link Generation**: Auto-generate payment links from quotes

## Testing

1. Submit quote request from product page
2. Submit quote request from category page
3. Submit quote request with multiple products
4. Verify data appears in Google Sheet
5. Verify admin receives email
6. Test form validation
7. Test pre-selection from URL parameter

