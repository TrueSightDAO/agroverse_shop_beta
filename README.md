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

## 📁 Project Structure

```
agroverse_shop/
├── index.html                          # Main landing page
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
│   └── image-url-helper.js             # Image URL conversion (relative → absolute)
├── css/
│   └── cart.css                        # Cart styles
├── google-app-script/
│   └── agroverse_shop_checkout.gs      # Backend script (Stripe + Sheets)
├── assets/
│   └── images/
│       ├── products/                   # Product images
│       └── farms/                      # Farm images
└── docs/                               # Documentation
```

## 🚀 Quick Start

### Local Development

**Option 1: Startup Script (Recommended)**
```bash
chmod +x start-local-server.sh
./start-local-server.sh
```

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
   - `STRIPE_TEST_SECRET_KEY` - Stripe test secret key (`sk_test_...`)
   - `STRIPE_LIVE_SECRET_KEY` - Stripe live secret key (`sk_live_...`)
   - `GOOGLE_SHEET_ID` - Google Sheet ID (from URL)
   - `GOOGLE_SHEET_NAME` - Sheet name (default: "Stripe Social Media Checkout ID")
   - `EASYPOST_API_KEY` - EasyPost API key (for shipping rates)
   - `ORIGIN_ADDRESS_LINE1` - Warehouse street address
   - `ORIGIN_ADDRESS_CITY` - Warehouse city
   - `ORIGIN_ADDRESS_STATE` - Warehouse state (e.g., "CA")
   - `ORIGIN_ADDRESS_POSTAL_CODE` - Warehouse ZIP code
   - `ORIGIN_ADDRESS_COUNTRY` - Warehouse country (default: "US")
   - `BASE_BOX_WEIGHT_OZ` - Base box weight in ounces (default: 11.5)
   - `PER_ITEM_PACKAGING_OZ` - Per-item packaging weight (default: 0.65)

   See `docs/SCRIPT_PROPERTIES_REFERENCE.md` for detailed instructions.

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
- **Fallback**: None (only EasyPost rates shown)

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

## 📚 Documentation

### Essential Docs
- **`docs/SCRIPT_PROPERTIES_REFERENCE.md`** ⭐ - Complete guide to all Google App Script properties (required for setup)
- **`docs/LOCAL_DEVELOPMENT.md`** - Detailed local development setup instructions
- **`docs/CHECKOUT_SYSTEM_SUMMARY.md`** - Detailed checkout system overview (retail vs wholesale flows)

### Documentation Index
See `docs/README.md` for a complete list of all documentation files and which ones are essential vs historical.

## 🔐 Security Notes

- **Stripe Keys**: Never commit Stripe secret keys to repository
- **API Keys**: Google Places API key is public (safe for client-side use)
- **EasyPost Key**: Stored in Google App Script properties (server-side only)
- **CORS**: Google App Script Web App handles CORS automatically

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
