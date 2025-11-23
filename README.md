# Agroverse Shop - E-Commerce Platform

A static HTML e-commerce website for Agroverse, migrated from Wix to GitHub Pages. Features a complete checkout system with Stripe integration, shopping cart, order management, and wholesale quote requests.

## 🏗️ Architecture Overview

### Frontend (Static Site)
- **Hosting**: GitHub Pages (free)
- **Technology**: Vanilla JavaScript, HTML5, CSS3
- **Cart Storage**: Browser localStorage
- **Payment**: Stripe Checkout (hosted)
- **Address Autocomplete**: Google Places API

### Backend (Serverless)
- **Platform**: Google App Script (free)
- **Functions**: 
  - Stripe checkout session creation
  - Order polling from Stripe
  - Shipping rate calculation (EasyPost API)
  - Google Sheets integration
  - Email notifications
- **Database**: Google Sheets (order storage)

### Key Features
- ✅ Shopping cart (localStorage-based)
- ✅ Stripe checkout integration
- ✅ Real-time shipping rate calculation (EasyPost/USPS)
- ✅ Order status tracking
- ✅ Order history (browser-based)
- ✅ Wholesale quote request system
- ✅ Universal navigation (cart icon on all pages)
- ✅ Address autocomplete (Google Places)
- ✅ Form data persistence
- ✅ Environment-aware configuration (dev/prod)
- ✅ Legacy URL redirects (GitHub Pages 404 handler)

## 📁 Project Structure

```
agroverse_shop/
├── index.html                          # Main landing page
├── 404.html                            # Legacy URL redirect handler
├── checkout/
│   └── index.html                      # Checkout page (shipping form)
├── order-status/
│   └── index.html                      # Order status page
├── order-history/
│   └── index.html                      # Order history page
├── quote-request/
│   └── index.html                      # Wholesale quote request form
├── js/
│   ├── config.js                       # Environment configuration
│   ├── products.js                     # Product catalog (centralized)
│   ├── cart.js                         # Cart management (localStorage)
│   ├── cart-ui.js                      # Cart UI (icon, sidebar)
│   ├── add-to-cart.js                  # Add to cart handlers
│   ├── checkout.js                     # Checkout form handling
│   ├── checkout-form-storage.js       # Form data persistence
│   ├── checkout-places-autocomplete.js # Google Places integration
│   ├── checkout-shipping-calculator.js # Shipping rate display
│   ├── order-status.js                 # Order status fetching
│   ├── order-history.js                # Order history management
│   ├── quote-request.js                # Quote request handling
│   ├── universal-nav.js                # Universal navigation (cart icon, order history link)
│   ├── image-url-helper.js             # Image URL conversion (relative → absolute)
│   └── legacy-redirects.js             # Legacy URL redirect map
├── css/
│   └── cart.css                        # Cart styles
├── google-app-script/
│   └── agroverse_shop_checkout.gs      # Backend script (Stripe + Sheets)
├── scripts/
│   └── generate_redirects.py           # Script to generate redirect map from CSV
└── assets/
    └── images/
        ├── products/                   # Product images
        └── farms/                      # Farm images
```

## 🚀 Quick Start

### Local Development

**Option 1: Startup Script (Recommended)**
```bash
chmod +x start-local-server.sh
./start-local-server.sh
```

The script automatically:
- Detects if Node.js or Python is installed
- Installs dependencies if needed
- Starts a local server on `http://127.0.0.1:8000`

**Option 2: Python**
```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

**Option 3: Node.js**
```bash
npm install
npm run dev
```

Then visit: `http://127.0.0.1:8000`

**Why 127.0.0.1 instead of file://?**
- ✅ Full HTTP protocol support
- ✅ CORS works properly (Google Places API, fetch requests)
- ✅ All browser APIs function correctly
- ✅ Proper MIME types for files
- ✅ Matches production environment better

### Production Deployment

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Update site"
   git push origin main
   ```

2. **Enable GitHub Pages:**
   - Repository Settings → Pages
   - Source: Deploy from branch
   - Branch: `main`, Folder: `/ (root)`

3. **Custom Domain (Optional):**
   - Add `CNAME` file with your domain
   - Configure DNS records

## ⚙️ Configuration

### Environment Detection

The site automatically detects the environment:
- **Local Development**: `localhost` or `127.0.0.1`
- **Beta/Dev**: `beta.agroverse.shop`
- **Production**: `www.agroverse.shop` or `agroverse.shop`

Configuration is in `js/config.js`:

```javascript
window.AGROVERSE_CONFIG = {
  isLocal: true/false,
  isDevelopment: true/false,
  isProduction: true/false,
  baseUrl: 'http://127.0.0.1:8000' or 'https://www.agroverse.shop',
  googleScriptUrl: 'https://script.google.com/macros/s/.../exec',
  googlePlacesApiKey: 'AIzaSyCJvOEQgMAqLPzQnTkFfH-wWMhusNTpWaE',
  environment: 'development' or 'production'
};
```

### Google App Script Setup

1. **Create/Open Script:**
   - Go to [Google App Script](https://script.google.com)
   - Create new project or open existing
   - Copy code from `google-app-script/agroverse_shop_checkout.gs`

2. **Set Script Properties** (Project Settings → Script Properties):
   - Click the **gear icon** (⚙️) in the left sidebar
   - Scroll down to **"Script properties"**
   - Click **"Add script property"** for each property below

   **Required Properties:**
   - `STRIPE_TEST_SECRET_KEY` - Stripe test secret key (`sk_test_...`)
   - `STRIPE_LIVE_SECRET_KEY` - Stripe live secret key (`sk_live_...`)
   - `GOOGLE_SHEET_ID` - Google Sheet ID (from URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`)
   - `GOOGLE_SHEET_NAME` - Sheet name (default: "Stripe Social Media Checkout ID")

   **Optional Properties (for real shipping rates):**
   - `EASYPOST_API_KEY` - EasyPost API key (for shipping rates)
   - `ORIGIN_ADDRESS_LINE1` - Warehouse street address
   - `ORIGIN_ADDRESS_CITY` - Warehouse city
   - `ORIGIN_ADDRESS_STATE` - Warehouse state (e.g., "CA")
   - `ORIGIN_ADDRESS_POSTAL_CODE` - Warehouse ZIP code
   - `ORIGIN_ADDRESS_COUNTRY` - Warehouse country (default: "US")
   - `BASE_BOX_WEIGHT_OZ` - Base box weight in ounces (default: 11.5)
   - `PER_ITEM_PACKAGING_OZ` - Per-item packaging weight (default: 0.65)

   **Complete Property Reference:**

   | Property Name | Required For | Required? | Format | Example |
   |--------------|--------------|-----------|--------|---------|
   | `STRIPE_TEST_SECRET_KEY` | Development | ✅ Yes | `sk_test_...` | From Stripe Dashboard |
   | `STRIPE_LIVE_SECRET_KEY` | Production | ✅ Yes | `sk_live_...` | From Stripe Dashboard |
   | `GOOGLE_SHEET_ID` | Both | ✅ Yes | Alphanumeric | From Sheet URL |
   | `GOOGLE_SHEET_NAME` | Both | ⚠️ Optional | String | `Stripe Social Media Checkout ID` |
   | `EASYPOST_API_KEY` | Real Shipping Rates | ❌ No | `EZTK...` or `EZAK...` | From EasyPost Dashboard |
   | `ORIGIN_ADDRESS_LINE1` | EasyPost | ⚠️ If using EasyPost | String | `123 Main Street` |
   | `ORIGIN_ADDRESS_CITY` | EasyPost | ⚠️ If using EasyPost | String | `San Francisco` |
   | `ORIGIN_ADDRESS_STATE` | EasyPost | ⚠️ If using EasyPost | String (2-letter) | `CA` |
   | `ORIGIN_ADDRESS_POSTAL_CODE` | EasyPost | ⚠️ If using EasyPost | String | `94102` |
   | `ORIGIN_ADDRESS_COUNTRY` | EasyPost | ⚠️ If using EasyPost | String (2-letter) | `US` |
   | `BASE_BOX_WEIGHT_OZ` | Package Weight | ❌ No | Number | `11.5` |
   | `PER_ITEM_PACKAGING_OZ` | Package Weight | ❌ No | Number | `0.65` |

   **Where to Get Keys:**
   - **Stripe Keys**: [Stripe Dashboard](https://dashboard.stripe.com) → Developers → API keys
   - **Google Sheet ID**: From URL: `https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit`
   - **EasyPost Key**: [EasyPost Dashboard](https://www.easypost.com/dashboard) → Settings → API Keys

3. **Deploy as Web App:**
   - Click "Deploy" → "New deployment"
   - Type: Web app
   - Execute as: Me
   - Who has access: Anyone
   - Copy the Web App URL

4. **Update Frontend Config:**
   - Edit `js/config.js`
   - Set `GOOGLE_SCRIPT_URL` to your deployment URL

5. **Set Up Time-Driven Trigger** (Optional, for automatic order polling):
   - Triggers → Add Trigger
   - Function: `syncStripeOrders`
   - Event source: Time-driven
   - Type: Minutes timer
   - Interval: Every 5-15 minutes

**How It Works:**
The script automatically selects the correct keys based on the environment:
- **Development** (`localhost`, `127.0.0.1`): Uses `STRIPE_TEST_*` keys
- **Production** (`www.agroverse.shop`): Uses `STRIPE_LIVE_*` keys

This means you only need **one deployment** that works for both environments!

## 🛒 E-Commerce Features

### Retail Products (Direct Checkout)

**Products:**
- Centralized in `js/products.js`
- Each product has: `productId`, `name`, `price`, `weight`, `image`, `stripePriceId` (optional)
- Uses Stripe `price_data` for dynamic pricing (no pre-created Price IDs needed)

**User Flow:**
1. User adds product to cart (from any page)
2. Cart icon shows item count (universal navigation)
3. User clicks cart icon → Reviews cart in sidebar
4. Clicks "Checkout" → Goes to checkout page
5. Fills shipping address (with Google Places autocomplete)
6. Shipping rates calculated and displayed (EasyPost/USPS)
7. User selects shipping option
8. Clicks "Continue to Payment" → Redirected to Stripe
9. Completes payment on Stripe
10. Redirected to order status page
11. Order saved to Google Sheets
12. Can view order history anytime

**Where "Add to Cart" Appears:**
- ✅ Individual product pages
- ✅ Category page (`/category/retail-packs/`)
- ✅ Main page product gallery

**Cart Management:**
- Stored in `localStorage` (key: `agroverse_cart`)
- Persists across page refreshes
- Cleared after successful checkout

### Wholesale Products (Quote Request)

**Why Quote Requests?**
- Variable freight costs (depends on quantity/destination)
- Variable customs/duties (depends on country)
- May require negotiation
- Professional B2B experience

**User Flow:**
1. User clicks "Request Quote" on wholesale product
2. Fills quote request form:
   - Products and quantities
   - Business information
   - Shipping address
   - Expected order frequency
   - Special requirements
3. Form submitted to Google App Script
4. Saved to Google Sheet ("Quote Requests" tab)
5. Admin receives email notification
6. Admin provides custom quote
7. Admin sends quote to customer
8. If accepted, admin creates Stripe Payment Link

**Where "Request Quote" Appears:**
- ✅ Individual wholesale product pages
- ✅ Wholesale category page (`/category/wholesale-bulk/`)

### Order Management

**Order Status Page:**
- Shows order details from Stripe
- Displays items, shipping address, tracking info
- Fetches from Google App Script (which pulls from Stripe + Sheets)
- Automatically saves to order history

**Order History:**
- Stored in `localStorage` (key: `agroverse_order_history`)
- Accessible from any page (if orders exist)
- Shows recent orders with quick links to order status

**Admin Workflow:**
1. Orders appear in Google Sheet
2. Admin fulfills order
3. Admin adds tracking number to sheet
4. Automated email sent to customer (via Google App Script)

## 🔧 Technical Details

### Cart System
- **Storage**: `localStorage` (key: `agroverse_cart`)
- **Structure**: `{ sessionId, items[], createdAt, updatedAt }`
- **Persistence**: Survives page refreshes
- **Clearing**: After successful checkout

### Shipping Calculation
- **API**: EasyPost (USPS rates)
- **Trigger**: When user enters shipping address on checkout page
- **Display**: Real-time rate options with user selection
- **Integration**: Google App Script calls EasyPost API
- **Fallback**: Fixed rates if EasyPost not configured

### Stripe Integration
- **Checkout**: Stripe Checkout (hosted)
- **Products**: Dynamic `price_data` (no pre-created Price IDs needed)
- **Order Polling**: Google App Script periodically checks Stripe for completed sessions
- **Webhooks**: Not used (polling instead, simpler setup)

### Google Sheets Integration
- **Sheet Name**: "Stripe Social Media Checkout ID" (configurable)
- **Columns**: Timestamp, Customer Name, Stripe Session ID, Items, Shipping Address, Tracking Number, etc.
- **Idempotency**: Prevents duplicate entries
- **Updates**: Both from Stripe polling and direct order status requests

### Universal Navigation
- **Script**: `js/universal-nav.js`
- **Features**:
  - Dynamically loads cart scripts on all pages
  - Adds cart icon to header navigation
  - Adds "Order History" link (if orders exist)
  - Handles different directory depths automatically
- **Included**: On all HTML pages via `<script src=".../js/universal-nav.js"></script>`

### Image URL Handling
- **Helper**: `js/image-url-helper.js`
- **Purpose**: Converts relative image paths to absolute URLs
- **Reason**: Ensures images load correctly regardless of page depth
- **Usage**: Used by cart UI, order status, order history

### Legacy URL Redirects

**How It Works:**
1. User visits legacy URL (e.g., `agroverse.shop/old-product`)
2. GitHub Pages automatically serves `404.html` for any missing pages
3. `404.html` loads `js/legacy-redirects.js` and checks `LEGACY_REDIRECTS` map
4. If match found → redirects to new URL (301 permanent via meta refresh + JavaScript)
5. If no match → shows friendly 404 page

**Regenerating Redirects:**
If the CSV file is updated, regenerate the redirect map:
```bash
python3 scripts/generate_redirects.py assets/raw/legacy_agroverse_shop_URL_Redirects_Export.csv
```

This will update `js/legacy-redirects.js` with the latest redirects.

**Wildcard Patterns:**
- `/recipes/{title}` → `/recipes` (then to `/cacao-espresso`)
- `/recipes-1/{title}` → `/recipes-1` (then to `/breakfast-cacao-smoothie`)

These are handled automatically in `404.html`.

## 📝 Product Management

Products are centralized in `js/products.js`:

```javascript
const PRODUCTS = {
  'product-id': {
    productId: 'product-id',
    name: 'Product Name',
    price: 25.00,
    weight: 7.05, // in ounces
    image: 'assets/images/products/image.jpg',
    stripePriceId: 'price_xxxxx' // optional, not required
  }
};
```

**Adding Products:**
1. Add product data to `js/products.js`
2. Add product image to `assets/images/products/`
3. Product automatically available for "Add to Cart"

**Product Weights:**
- Required for shipping calculation
- In ounces (converted automatically)
- Displayed on product pages (optional)

## 🐛 Troubleshooting

### Cart Icon Not Showing
- Check browser console for errors
- Ensure `js/config.js` and `js/universal-nav.js` are loaded
- Verify navigation structure has `.nav-links` class

### Shipping Rates Not Loading
- Check EasyPost API key in Google App Script properties
- Verify origin address is set correctly
- Check browser console for API errors

### Order Status Not Found
- Verify Google App Script URL in `js/config.js`
- Check Google Sheet ID and name in Script Properties
- Ensure Stripe session ID is correct

### Images Not Loading
- Check if using relative paths (should use `image-url-helper.js`)
- Verify image files exist in `assets/images/`
- Check browser console for 404 errors

### Local Development Issues

**"Port 8000 already in use"**
```bash
# Use a different port
http-server -p 8001 -a 127.0.0.1
# Don't forget to update js/config.js with the new port!
```

**"Cannot find module http-server"**
```bash
npm install
```

**"Permission denied" (macOS/Linux)**
```bash
chmod +x start-local-server.sh
```

**Google Places API not working**
- Make sure you're using `http://127.0.0.1:8000` (not `file://`)
- Check browser console for CORS errors
- Verify your API key allows `127.0.0.1` as an origin

### Script Properties Issues

**"Stripe development secret key not configured"**
- Make sure you set `STRIPE_TEST_SECRET_KEY` (not `STRIPE_SECRET_KEY`)

**"Stripe production secret key not configured"**
- Make sure you set `STRIPE_LIVE_SECRET_KEY` (not `STRIPE_SECRET_KEY`)

**"Google Sheet ID not configured"**
- Make sure you set `GOOGLE_SHEET_ID` with the correct Sheet ID

**Wrong keys being used?**
- Check that the property names match exactly (case-sensitive)
- Verify you're using the correct keys for test vs live mode

## 🔐 Security Notes

- **Stripe Keys**: Never commit Stripe secret keys to repository
- **API Keys**: Google Places API key is public (safe for client-side use)
- **EasyPost Key**: Stored in Google App Script properties (server-side only)
- **CORS**: Google App Script Web App handles CORS automatically
- **Script Properties**: Encrypted by Google, only people with edit access can see them

## 🌐 URLs

- **Production**: `https://www.agroverse.shop`
- **Beta/Dev**: `https://beta.agroverse.shop`
- **Local**: `http://127.0.0.1:8000`

## 📞 Support

For issues or questions:
- Check browser console for errors
- Review Google App Script execution logs
- Verify all Script Properties are set correctly
- Ensure Google Sheet permissions are correct

---

**Last Updated**: 2025-01-22  
**Version**: 1.0.0
