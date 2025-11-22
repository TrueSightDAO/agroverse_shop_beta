# Setup Guide - Agroverse Shop Checkout System

## Overview
This guide will help you set up the complete checkout system with environment-aware Stripe integration (development and production).

---

## Step 1: Stripe Setup

### 1.1 Create Stripe Account
1. Go to [https://stripe.com](https://stripe.com)
2. Create an account (or sign in)
3. Complete account setup

### 1.2 Get API Keys

**For Development (Test Mode):**
1. In Stripe Dashboard, toggle to "Test mode"
2. Go to Developers → API keys
3. Copy your **Secret key** (starts with `sk_test_...`)
4. Copy your **Publishable key** (starts with `pk_test_...`) - optional

**For Production (Live Mode):**
1. In Stripe Dashboard, toggle to "Live mode"
2. Go to Developers → API keys
3. Copy your **Secret key** (starts with `sk_live_...`)
4. Copy your **Publishable key** (starts with `pk_live_...`) - optional

### 1.3 Create Products and Prices
1. Go to Products → Add Product
2. Create each product with:
   - Name
   - Price
   - Description
3. Copy the **Price ID** (starts with `price_...`)
4. Update product pages with the Price ID in the `data-stripe-price-id` attribute

### 1.4 Set Up Webhook
1. Go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your Google App Script webhook URL (you'll get this after Step 3)
4. Select event: `checkout.session.completed`
5. Copy the **Webhook signing secret** (starts with `whsec_...`)

---

## Step 2: Google Sheets Setup

### 2.1 Create Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Agroverse Orders"
4. Create a sheet tab named "Orders"

### 2.2 Set Up Columns
In the "Orders" sheet, create these columns in row 1:

| Column | Header | Description |
|--------|--------|-------------|
| A | Session ID | Stripe checkout session ID (unique identifier) |
| B | Email | Customer email address |
| C | Date | Order date (ISO format) |
| D | Status | Order status (Placed, Processing, Shipped, Delivered) |
| E | Items | JSON string of order items |
| F | Shipping Address | JSON string of shipping address |
| G | Tracking Number | Shipping tracking number (empty initially) |
| H | Email Sent | "Yes" or "No" (for tracking email) |
| I | Last Updated | Last update timestamp |

### 2.3 Get Sheet ID
1. Look at the URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
2. Copy the `[SHEET_ID]` part

---

## Step 3: Google App Script Setup

### 3.1 Create Script
1. Go to [Google Apps Script](https://script.google.com)
2. Click "New project"
3. Name it "Agroverse Checkout"

### 3.2 Add Code
1. Copy the contents of `google-app-script/agroverse_shop_checkout.gs`
2. Paste into the script editor
3. Save (Ctrl+S or Cmd+S)

### 3.3 Set Script Properties
1. Go to Project Settings (gear icon)
2. Scroll to "Script properties"
3. Add these properties:

**Required Properties (for single deployment):**

**Development (Test Mode):**
- `STRIPE_TEST_SECRET_KEY`: Your Stripe test secret key (`sk_test_...`)
- `STRIPE_TEST_WEBHOOK_SECRET`: Your Stripe test webhook secret (`whsec_...`)

**Production (Live Mode):**
- `STRIPE_LIVE_SECRET_KEY`: Your Stripe live secret key (`sk_live_...`)
- `STRIPE_LIVE_WEBHOOK_SECRET`: Your Stripe live webhook secret (`whsec_...`)

**Both Environments:**
- `GOOGLE_SHEET_ID`: Your Google Sheet ID (same sheet works for both)

**📋 See `docs/SCRIPT_PROPERTIES_REFERENCE.md` for detailed instructions and where to get each value.**

### 3.4 Deploy as Web App
1. Click **Deploy** → **New deployment**
2. Click the gear icon (⚙️) next to "Select type"
3. Choose **Web app**
4. Configure:
   - **Description**: "Agroverse Checkout API" (optional)
   - **Execute as**: Me
   - **Who has access**: Anyone (or "Anyone with link" for testing)
5. Click **Deploy**
6. **Copy the Web app URL** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
7. **IMPORTANT**: Save this URL - you'll need it for the next step!

### 3.5 Update Website Configuration
1. Open `js/config.js` in your project
2. Replace `YOUR_LOCAL_DEV_SCRIPT_URL` with your Web app URL (for local testing)
3. Replace `YOUR_PRODUCTION_SCRIPT_URL` with your Web app URL (for production)
4. Save the file

**Example:**
```javascript
const GOOGLE_SCRIPT_URL = isLocal
  ? 'https://script.google.com/macros/s/AKfycb.../exec' // Your actual URL
  : 'https://script.google.com/macros/s/AKfycb.../exec'; // Same or different URL
```

**Note:** You can have separate scripts for dev and prod, or use environment detection in the script.

### 3.4 Deploy as Web App
1. Click "Deploy" → "New deployment"
2. Click the gear icon ⚙️ next to "Select type"
3. Choose "Web app"
4. Settings:
   - **Description**: "Agroverse Checkout API"
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Click "Deploy"
6. **Copy the Web App URL** - you'll need this for Step 4

### 3.5 Set Up Time-Driven Trigger (for tracking emails)
1. Click the clock icon (Triggers)
2. Click "Add Trigger"
3. Settings:
   - **Function**: `sendTrackingEmails`
   - **Event source**: Time-driven
   - **Type**: Hour timer
   - **Hour interval**: Every hour
4. Click "Save"

---

## Step 4: Configure Frontend

### 4.1 Update `js/config.js`
Open `js/config.js` and update these lines:

```javascript
const GOOGLE_SCRIPT_URL = isLocal
  ? 'YOUR_LOCAL_DEV_SCRIPT_URL' // Your dev Google App Script Web App URL
  : 'YOUR_PRODUCTION_SCRIPT_URL'; // Your prod Google App Script Web App URL
```

Replace:
- `YOUR_LOCAL_DEV_SCRIPT_URL` with your development Google App Script Web App URL
- `YOUR_PRODUCTION_SCRIPT_URL` with your production Google App Script Web App URL

### 4.2 Update Product Pages
For each product page, update the "Add to Cart" button with the correct Stripe Price ID:

```html
<button class="cta-button add-to-cart-btn" 
        data-product-id="product-slug"
        data-product-name="Product Name"
        data-product-price="25.00"
        data-product-image="path/to/image.jpg"
        data-stripe-price-id="price_xxxxx"> <!-- Replace with actual Price ID -->
  Add to Cart - $25.00
</button>
```

---

## Step 5: Environment Configuration

### Development (Local)
- **Stripe Mode**: Test mode
- **Stripe Keys**: Test keys (`sk_test_...`, `pk_test_...`)
- **Google App Script**: Development deployment URL
- **Base URL**: `http://localhost:8000` (or your local server)

### Production
- **Stripe Mode**: Live mode
- **Stripe Keys**: Live keys (`sk_live_...`, `pk_live_...`)
- **Google App Script**: Production deployment URL
- **Base URL**: `https://www.agroverse.shop`

The system automatically detects the environment based on the hostname:
- `localhost` or `127.0.0.1` → Development
- `www.agroverse.shop` or `agroverse.shop` → Production

---

## Step 6: Testing

### 6.1 Test Development Flow
1. Start local server: `python -m http.server 8000` (or your preferred method)
2. Visit `http://localhost:8000`
3. Add item to cart
4. Go to checkout
5. Use Stripe test card: `4242 4242 4242 4242`
6. Complete checkout
7. Verify order appears in Google Sheet
8. Check order status page

### 6.2 Test Production Flow
1. Deploy to GitHub Pages
2. Visit `https://www.agroverse.shop`
3. Repeat the same flow
4. Use real payment method (or Stripe test mode if testing)

### 6.3 Test Tracking Email
1. Add tracking number to Google Sheet (column G)
2. Wait for scheduled trigger (or run `sendTrackingEmails` manually)
3. Verify email is sent
4. Check "Email Sent" column is updated

---

## Step 7: Admin Workflow

### Adding Tracking Numbers
1. Open Google Sheet
2. Find order by Session ID (column A)
3. Enter tracking number in column G
4. Save
5. Email will be sent automatically (within 1 hour)

### Manual Email Trigger
If you need to send emails immediately:
1. Open Google App Script
2. Run `sendTrackingEmails` function manually
3. Check execution log for results

---

## Troubleshooting

### Cart not working
- Check browser console for errors
- Verify `js/config.js` is loaded
- Check localStorage is enabled

### Checkout fails
- Verify Google App Script URL is correct
- Check Script Properties are set
- Review execution log in Google App Script
- Verify Stripe keys are correct

### Orders not saving
- Check Google Sheet permissions
- Verify Sheet ID is correct
- Check execution log in Google App Script
- Ensure webhook is configured correctly

### Tracking emails not sending
- Verify trigger is set up
- Check email permissions in Google App Script
- Review execution log
- Ensure "Email Sent" column logic is working

---

## Security Notes

1. **Never commit API keys to Git**
   - Use Script Properties in Google App Script
   - Keep keys out of frontend code

2. **Webhook Verification**
   - The current implementation has simplified verification
   - For production, implement proper Stripe webhook signature verification

3. **CORS Configuration**
   - Google App Script Web App should allow your domain
   - Configure in deployment settings

---

## Support

For issues or questions:
- Check execution logs in Google App Script
- Review browser console for frontend errors
- Verify all configuration steps are completed
- Test with Stripe test mode first

---

## Next Steps

1. ✅ Complete all setup steps
2. ✅ Test development flow
3. ✅ Test production flow
4. ✅ Set up monitoring
5. ✅ Train admin on tracking workflow

