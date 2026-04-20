# Agroverse Shop - E-Commerce Platform

A static HTML e-commerce website for Agroverse, migrated from Wix to GitHub Pages. Features a complete checkout system with Stripe integration, shopping cart, order management, wholesale quote requests, blog content, and farm/shipment pages.

## 📚 Context

This repository contains the complete Agroverse Shop website, including:

### SEO & keyword performance (human hub)

**Track and operate SEO work in one place:**

- **Live workbook:** [20260402 — Agroverse SEO performance monitoring](https://docs.google.com/spreadsheets/d/1qRlufSUQusQbJc3AwonIvHtfiAQjwhnMtl79FFkGBt8/edit) — keyword targets, change log, weekly Search Console snapshots (after Apps Script is deployed).
- **How we run it:** [agentic_ai_context / **SEO_MONITORING_SHEET_WORKFLOW.md**](https://github.com/TrueSightDAO/agentic_ai_context/blob/main/SEO_MONITORING_SHEET_WORKFLOW.md) (clone locally: `agentic_ai_context/SEO_MONITORING_SHEET_WORKFLOW.md`).  
  **Rule:** When you ship **SEO / keyword optimization** on this site (titles, meta, new landing URLs, IA, internal links, structured data), **update that workflow doc** if the process changes, log changes in the Sheet **Change_log** (**one row per shipped HTML URL**—not one merged row per batch), and adjust **Keywords_targets** as needed. Use `market_research/scripts/seo_workbook_append.py` or `append_brazil_cocoa_series_to_seo_sheet.py` from the **market_research** repo when automating.
- **Apps Script source (weekly GSC):** In the multi-repo workspace, `market_research/google_app_scripts/seo_monitoring_gsc/` (same tree as [content_schedule / market_research](https://github.com/TrueSightDAO/content_schedule)). Deploy with **clasp** or paste into the bound project; **not** auto-synced from git until someone pushes.

---

- **E-Commerce Platform**: Full shopping cart, checkout, and order management system
- **Content Pages**: Blog posts, farm profiles, shipment pages, and product pages
- **Inventory Management**: Real-time inventory tracking linked to Google Sheets
- **Google Apps Scripts**: Backend services for checkout, inventory updates, and order processing

### Blog Content

The site includes blog posts in the `/post/` directory. **Bahia trip photography (web JPEGs + catalog):** see **`assets/images/blog/bahia-photo-library/README.md`** — optimized images from iPhone HEIC masters, descriptive filenames, and a table of contents / suggested uses for blog cards and post heroes.

Blog posts feature:
- Responsive image layouts with side-by-side display on desktop
- Image pairs and groups automatically wrap multiple consecutive images
- Text-to-speech functionality with highlighting and auto-scrolling
- Embedded taste profile charts using D3.js
- Links to related shipments, farms, and products

### Taste Profile Charts (Shipments + PDPs)

Taste profile charts are rendered with **D3.js** and the shared helper:

- `js/agroverse-taste-profile-chart.js`

Use this helper for both shipment pages and product pages so chart behavior stays consistent.

**Rendering behavior**
- Desktop: radial wheel segments
- Mobile (`<=768px`): horizontal intensity bars
- Scale: `0-10` intensity per flavor dimension

**Recommended implementation pattern**

1. Add a chart container where the profile should appear:
   - `<div id="taste-profile-chart" class="taste-chart"></div>`
2. Load scripts near page bottom (before inline render call):
   - `https://d3js.org/d3.v7.min.js`
   - `../../js/agroverse-taste-profile-chart.js` (adjust depth as needed)
3. Render on `DOMContentLoaded` with double `requestAnimationFrame`:
   - Prevents early zero-width layout issues.
4. Pass `batchId`, unique `tooltipClass`, and `profiles` object.

**Profile data shape**
```js
window.AgroverseTasteProfileChart.render('#taste-profile-chart', {
  batchId: 'AGL2',
  tooltipClass: 'taste-tooltip--agl2-example',
  profiles: {
    nutty: { intensity: 8, notes: ['Roasted', 'Structured'], color: '#A67C52' },
    bright: { intensity: 7, notes: ['Lifted', 'Non-citrus'], color: '#D8B26E' },
    earthy: { intensity: 6, notes: ['Grounded', 'Cacao-forward'], color: '#6B4423' },
    smooth: { intensity: 10, notes: ['No astringency', 'Silky'], color: '#C9A961' },
    mocha: { intensity: 7, notes: ['Coffee', 'Cocoa mocha'], color: '#5C4033' },
    finish: { intensity: 4, notes: ['Short', 'Clean close'], color: '#B39B82' }
  }
});
```

**Framework guidance for flavor dimensions**
- Use one canonical profile per shipment, then reuse it across related PDPs.
- Keep dimensions to 5-7 for readability.
- Prefer framework-aligned terms from existing content:
  - Core buckets: fruity, floral, nutty, earthy/woody, caramel/roasted, acidity/brightness, bitterness/astringency, mouthfeel/smoothness, finish.
- If brightness is present but not citrus, encode that in `notes` (e.g., `"Non-citrus"`).
- Use shipment copy for temporal flavor movement; use chart axes for structural intensity.

#### Sitemap (`sitemap.xml`) and new blog posts

Individual post URLs under `https://agroverse.shop/post/<slug>` are listed in `sitemap.xml` inside the `<!-- BEGIN_AUTO_BLOG_POSTS -->` … `<!-- END_AUTO_BLOG_POSTS -->` block, which is **regenerated by script** from every `post/<slug>/index.html`.

**When you add or remove a blog post:**

1. Create the folder `post/your-slug/index.html` (and update `blog/index.html` as usual).
2. From the repo root, run **`npm run sitemap`** — this refreshes `sitemap.xml`, sets each post’s `<lastmod>` from the file’s modification time, and sets the `/blog` index `<lastmod>` to the newest post date.
3. Commit the updated `sitemap.xml` with your post.

CI runs **`npm run sitemap:check`** so a push fails if `sitemap.xml` is missing any `post/` directory that has an `index.html`.

### Image Layout System

Blog posts use a flexible image layout system:
- **Desktop**: Consecutive images display side-by-side using flexbox
- **Mobile**: Images stack vertically for better readability
- **Pairs**: 2 images display side-by-side with equal width
- **Groups**: 3+ images automatically wrap to multiple rows
- **Sizing**: Images respect max-width and max-height constraints
- **Responsive**: Automatically adapts based on screen size

Images are wrapped in `.image-pair` containers to enable the side-by-side layout on desktop views.

### Video Management

All videos on the website are hosted on YouTube and embedded using YouTube iframes. This approach provides:
- **Repository size reduction**: Videos are not stored in the repository (~500MB+ saved)
- **Better performance**: YouTube CDN with adaptive streaming
- **SEO benefits**: Videos discoverable in YouTube search
- **Traffic generation**: Links in video descriptions drive traffic back to agroverse.shop
- **Analytics**: YouTube provides views, engagement, and watch time data

#### Incoming phone / AirDrop videos (analyze + dedupe before YouTube)

1. Stage MP4/MOV locally (e.g. `Downloads/`). **Do not** rely on identical filenames across exports—use hashes.
2. Run **`python3 scripts/analyze_incoming_videos.py --input <folder> --output docs/incoming_videos_<batch>`** (see `scripts/requirements-video-analysis.txt` for pip deps). This emits **`manifest.json`**: **SHA-256**, sampled-frame **perceptual hashes** (anchor + timeline), **faster-whisper** transcripts, and **`youtube_upload_recommended`** (canonical file per near-duplicate group).
3. Upload only recommended rows unless you override after a quick watch—then add entries to **`scripts/video_metadata.json`** and use **`batch_upload_videos.py`**; keep **`youtube_videos.json`** in sync with what is live.
4. Still images (HEIC→JPEG): **`assets/images/blog/bahia-photo-library/README.md`**.

#### Adding a New Video

1. **Prepare the video file**:
   - Place the video file in `assets/videos/` (temporarily, for upload)
   - Recommended format: MP4, 1080p or higher
   - Keep file size reasonable (under 500MB recommended)

2. **Add video metadata**:
   - Open `scripts/video_metadata.json`
   - Add a new entry with:
     - `filename`: The video filename (e.g., `"new-farm-video.mp4"`)
     - `title`: SEO-optimized title (e.g., `"Farm Name - Video Description | Agroverse"`)
     - `description`: Detailed description with:
       - Context about the video content
       - Links back to relevant agroverse.shop pages (farm, product, shipment)
       - Relevant hashtags for discoverability
     - `tags`: Array of relevant tags for YouTube search
     - `pages`: Array of page paths where this video will appear
     - `privacy`: `"public"` (for SEO) or `"unlisted"` (if needed)

   Example:
   ```json
   {
     "filename": "new-farm-video.mp4",
     "title": "Farm Name - Video Description | Agroverse",
     "description": "Description text...\n\n🌳 Learn more: https://www.agroverse.shop/farms/farm-name\n📦 View products: https://www.agroverse.shop/product-page/product\n\n#cacao #Brazil #regenerativeagriculture",
     "tags": ["cacao", "Brazil", "farming", "regenerative agriculture"],
     "pages": [
       "farms/farm-name/index.html",
       "product-page/product/index.html"
     ],
     "privacy": "public"
   }
   ```

3. **Upload to YouTube**:
   ```bash
   cd /Users/garyjob/Applications/agroverse_shop
   python3 scripts/batch_upload_videos.py --upload-only
   ```
   - The script will:
     - Read metadata from `video_metadata.json`
     - Upload videos with proper titles, descriptions, and tags
     - Store YouTube video IDs in `youtube_videos.json`
     - Skip videos that are already uploaded

4. **Update HTML pages**:
   - Add the video to the relevant HTML pages using a `<video>` tag:
     ```html
     <div class="farm-video-container">
       <video class="farm-video" controls loop muted playsinline>
         <source src="../../assets/videos/new-farm-video.mp4" type="video/mp4"/>
         Your browser does not support the video tag.
       </video>
     </div>
     ```
   - Then run the update script:
     ```bash
     python3 scripts/update_html_with_youtube_embeds.py
     ```
   - The script will:
     - Find all `<video>` tags referencing `assets/videos/`
     - Replace them with YouTube iframe embeds
     - Maintain existing CSS classes and structure

5. **Verify and clean up**:
   - Test the pages to ensure videos display correctly
   - The video files in `assets/videos/` can remain (they're not tracked in git)
   - Or add `assets/videos/*.mp4` to `.gitignore` if you want to exclude them

#### Video File Structure

- **Metadata**: `scripts/video_metadata.json`
  - Contains titles, descriptions, tags, and page mappings
  - Used by the upload script

- **YouTube Mappings**: `scripts/youtube_videos.json`
  - Maps video filenames to YouTube video IDs
  - Automatically created/updated by the upload script
  - Used by the HTML update script

- **Upload Script**: `scripts/batch_upload_videos.py`
  - Uploads videos to YouTube with metadata
  - Stores video IDs in `youtube_videos.json`

- **HTML Update Script**: `scripts/update_html_with_youtube_embeds.py`
  - Replaces `<video>` tags with YouTube iframe embeds
  - Maintains responsive design and CSS classes

#### Best Practices

1. **Video Titles**: Include farm name, location, and key topic. End with "| Agroverse" for branding.

2. **Descriptions**: Always include:
   - Context about the video
   - Links to relevant agroverse.shop pages (farm, product, shipment)
   - Relevant hashtags for discoverability

3. **Tags**: Use relevant, searchable tags (e.g., "cacao", "Brazil", "regenerative agriculture", "ceremonial cacao")

4. **Privacy**: Use `"public"` for SEO benefits. Videos are discoverable in YouTube search.

5. **Page Placement**: Add videos to relevant pages (farm pages, product pages, shipment pages) using the standard video container structure.

6. **CSS Classes**: Use existing classes:
   - `.farm-video-container` - Container for responsive video
   - `.farm-video` - Video element (becomes iframe)
   - `.farm-video-section` - Section wrapper with heading and description

#### Troubleshooting

- **Video not uploading**: Check that `scripts/youtube_credentials.json` exists and is valid
- **Video not appearing on page**: Run `update_html_with_youtube_embeds.py` after uploading
- **Video ID not found**: Ensure the filename in `video_metadata.json` matches the actual file name
- **CSS issues**: Check that `css/cards.css` has the YouTube iframe styles (`.farm-video-container iframe.farm-video`)

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
│   ├── agroverse_shop_checkout/        # Checkout Apps Script (clasp) + agroverse_shop_checkout.gs
│   ├── update_store_inventory.gs       # Store inventory calculation and update
│   └── README.md                       # Google Apps Scripts documentation
├── scripts/
│   └── generate_redirects.py           # Script to generate redirect map from CSV
└── assets/
    └── images/
        ├── products/                   # Product images
        └── farms/                      # Farm images
```

## 🧪 Testing

Playwright visual consistency tests. See [tests/README.md](./tests/README.md) for full details.

```bash
npm test              # Run tests (starts local server)
npm run test:headed   # Run with browser visible
npm run test:resume   # Resume from last failure (smart runner)
```

- **CI**: `.github/workflows/visual-consistency.yml` runs on push/PR to main
- **Scope**: Header/footer, nav, cart, mobile menu, SEO content
- **Local**: Uses `localhost:8000`; CI uses `beta.agroverse.shop` or `www.agroverse.shop` depending on repo

## 🚀 Quick Start

### Local Development

**Option 1: Startup Script (Recommended)**
```bash
chmod +x start_local.sh
./start_local.sh
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

**Scripts Available:**
- `agroverse_shop_checkout/agroverse_shop_checkout.gs` - Stripe checkout, order management, shipping calculation ([clasp](google-app-script/agroverse_shop_checkout/CLASP.md))
- `update_store_inventory.gs` - Calculates and updates store inventory for SKUs (see [google-app-script/README.md](google-app-script/README.md) for details)

For detailed documentation on all Google Apps Scripts, see: [google-app-script/README.md](google-app-script/README.md)

1. **Create/Open Script:**
   - Go to [Google App Script](https://script.google.com)
   - Create new project or open existing
   - Copy code from `google-app-script/agroverse_shop_checkout/agroverse_shop_checkout.gs` (or `npm run clasp:checkout:push` after [CLASP.md](google-app-script/agroverse_shop_checkout/CLASP.md))

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

## 📊 Analytics Setup

The site includes comprehensive analytics tracking with **Google Analytics 4 (GA4)** and **Facebook Pixel**. All tracking is automatically integrated into the e-commerce flow.

### Google Analytics 4 (GA4)

**Tracking ID**: `G-S6EP25EHF4`

**Implementation:**
- Base code included in all HTML pages (via `gtag.js`)
- E-commerce events automatically tracked
- Events integrated with cart, checkout, and purchase flows

**Files:**
- `js/ga4-events.js` - Core GA4 events tracking library
- `js/product-page-tracking.js` - Auto-tracks `view_item` on product pages
- `js/category-page-tracking.js` - Auto-tracks `view_item_list` on category pages

**Events Tracked:**
- ✅ `view_item` - Product page views
- ✅ `view_item_list` - Category page views
- ✅ `select_item` - Product selection from lists
- ✅ `add_to_cart` - Items added to cart
- ✅ `remove_from_cart` - Items removed from cart
- ✅ `view_cart` - Cart page views
- ✅ `begin_checkout` - Checkout initiation
- ✅ `add_shipping_info` - Shipping option selection
- ✅ `add_payment_info` - Payment info added
- ✅ `purchase` - Order completion
- ✅ `generate_lead` - Quote request submissions
- ✅ `search` - Site searches (if implemented)

**Verification:**
- Check GA4 Realtime reports: [Google Analytics](https://analytics.google.com)
- Use GA4 DebugView for testing
- Events appear in the Events report within 24-48 hours

### Facebook Pixel

**Pixel ID**: `2896386767418228` (configured in `js/config.js`)

**Implementation:**
- Base Pixel code included in all HTML pages
- E-commerce events automatically tracked
- Events integrated with cart, checkout, and purchase flows
- Includes noscript fallback for users with JavaScript disabled

**Files:**
- `js/facebook-pixel.js` - Base Pixel initialization
- `js/facebook-pixel-events.js` - E-commerce event tracking functions

**Events Tracked:**
- ✅ `PageView` - Automatic on all pages
- ✅ `ViewContent` - Product page views
- ✅ `AddToCart` - Items added to cart
- ✅ `RemoveFromCart` - Items removed from cart
- ✅ `InitiateCheckout` - Checkout initiation
- ✅ `AddPaymentInfo` - Payment info added
- ✅ `Purchase` - Order completion
- ✅ `Lead` - Quote request submissions

**Configuration:**
The Pixel ID is set in `js/config.js`:
```javascript
const FACEBOOK_PIXEL_ID = '2896386767418228';
```

**Verification:**
- Install [Facebook Pixel Helper](https://chrome.google.com/webstore/detail/facebook-pixel-helper/fdgfkebogiimcoedlicjlajpkdmockpc) browser extension
- Visit your site and check the extension icon
- View events in [Facebook Events Manager](https://business.facebook.com/events_manager)
- Use Test Events to see real-time tracking

### Adding Analytics to New Pages

**IMPORTANT**: When creating new HTML pages, always include the analytics scripts in the `<head>` section:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S6EP25EHF4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-S6EP25EHF4');
</script>
<!-- Facebook Pixel Code -->
<script src="js/config.js"></script>
<script src="js/facebook-pixel.js"></script>
<script src="js/facebook-pixel-events.js"></script>
```

**For pages in subdirectories**, adjust the script paths:
- 1 level deep (e.g., `checkout/index.html`): Use `../js/...`
- 2 levels deep (e.g., `product-page/name/index.html`): Use `../../js/...`
- 3 levels deep: Use `../../../js/...`

**Script Loading Order:**
1. `config.js` (must load first - provides configuration)
2. `facebook-pixel.js` (base Pixel initialization)
3. `facebook-pixel-events.js` (event tracking functions)
4. Other page-specific scripts

**Automatic Event Tracking:**
- Product pages: Automatically track `view_item` / `ViewContent` if product data is available
- Category pages: Automatically track `view_item_list` if product cards are present
- Cart operations: Automatically tracked via `cart.js` and `add-to-cart.js`
- Checkout: Automatically tracked via `checkout.js`
- Purchase: Automatically tracked via `order-status.js`

**Testing:**
- Use browser developer tools console to verify events are firing
- Check for console logs: "GA4 event sent:" and "Facebook Pixel event sent:"
- Use browser extensions (GA4 DebugView, Facebook Pixel Helper) for visual verification

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

## ➕ Adding a New SKU Product

When adding a new product SKU to the Agroverse Shop, follow these steps to ensure proper integration across the site and exposure to Facebook Commerce Manager and Google Merchant Center:

### 1. Add Product Entry to `js/products.js`

Add the product data to the `window.PRODUCTS` object:

```javascript
'ceremonial-cacao-fazenda-santa-ana-2023-200g': {
  productId: 'ceremonial-cacao-fazenda-santa-ana-2023-200g',
  name: 'Ceremonial Cacao – Fazenda Santa Ana, Bahia Brazil, 2023 (200g)',
  price: 25.00,
  weight: 7.05, // 200g = ~7.05 oz (for shipping calculation)
    image: '/assets/images/products/fazenda-santa-ana-product.jpg',
  stripePriceId: '', // Not needed - using price_data instead
  category: 'retail',
  shipment: 'AGL2',
  farm: 'Fazenda Santa Ana, Bahia'
}
```

**Required Fields:**
- `productId`: URL-friendly unique identifier (lowercase, hyphens)
- `name`: Full product display name
- `price`: Price in USD (number, not string)
- `weight`: Weight in ounces (required for shipping)
- `image`: Path to product image (relative from site root)
- `category`: Either `'retail'` or `'wholesale'`
- `shipment`: Shipment ID (e.g., `'AGL2'`)
- `farm`: Farm name (used for linking and display)

### 2. Create Product Page HTML

Create a new directory in `product-page/` following the naming convention:
- Directory name should match `productId` (e.g., `product-page/ceremonial-cacao-fazenda-santa-ana-2023-200g/`)
- Create `index.html` inside that directory
- Use an existing product page as a template (e.g., `product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g/index.html`)

**Product Page Must Include:**
- Product title, price, description
- Product details (weight, origin, harvest, farm, etc.)
- "Add to Cart" button with correct `data-product-id`
- Inventory display section (`<div id="inventory-display">`)
- Shipment highlight card (if applicable)
- "Meet the Farmer" preview card (if applicable)
- Taste profile section and chart (if applicable)
- Traceability section
- All required scripts (`inventory-service.js`, `add-to-cart.js`, etc.)

**Template Structure:**
```html
<div class="product-page">
  <div class="product-header">
    <!-- Product image and basic info -->
    <div id="inventory-display"></div>
    <button class="add-to-cart-btn" data-product-id="...">Add to Cart</button>
  </div>
  
  <div class="product-details">
    <!-- Product specifications -->
  </div>
  
  <!-- Shipment Highlight Card -->
  <!-- Meet the Farmer Preview -->
  <!-- Taste Profile Section -->
  <!-- Traceability Section -->
</div>
```

### 3. Update Related Pages

**Farm Page (`farms/[farm-name]/index.html`):**
- Add product card to "Products from This Farm" section
- Link to the new product page

**Shipment Page (`shipments/[shipment-id]/index.html`):**
- Add product card to "Products from This Shipment" section (or "Purchase This Cacao" section for retail products)
- Link to the new product page
- Include wholesale products if applicable

**Landing Page (`index.html`):**
- Add product card to the products section (if retail product)
- Include inventory display div: `<div id="inventory-display-[product-id]" class="product-inventory-count"></div>`

**Category Page (`category/retail-packs/index.html` or `category/wholesale-bulk/index.html`):**
- Add product card to the appropriate category listing
- Include inventory display div for retail products

### 4. Add SKU Entry to Google Sheet

Use the helper script to add the product to the "Agroverse SKUs" Google Sheet:

```bash
cd /Users/garyjob/Applications/agroverse_shop
python3 scripts/add_fazenda_santa_ana_sku.py
```

**Note:** You'll need to modify the script's `NEW_PRODUCT` dictionary with your product data, or create a generic script that accepts product data as parameters.

**Google Sheet Columns:**
- Column A: Product ID (matches `productId` in `products.js`)
- Column B: Product Name
- Column C: Price (USD)
- Column D: Weight (oz)
- Column E: Category (`retail` or `wholesale`)
- Column F: Shipment ID
- Column G: Farm name
- Column H: Image Path (full URL)
- Column I: Store inventory (automatically calculated by `update_store_inventory.gs`)

**Alternative: Manual Entry**
If you prefer to add the SKU manually, open the "Agroverse SKUs" sheet:
- URL: `https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit?gid=98293503#gid=98293503`
- Add a new row with all the product information
- Ensure the Product ID in Column A matches the `productId` in `products.js`

### 5. Verify Inventory Integration

**Automatic Inventory Calculation:**
- The `update_store_inventory.gs` script will automatically calculate and populate Column I ("Store inventory") when it runs
- This script aggregates inventory from:
  - Main ledger ("offchain asset location" sheet)
  - Managed ledgers (from "Shipment Ledger Listing")
  - Filters by store managers and maps currencies to SKUs

**Inventory Display:**
- Product pages automatically display inventory count via `inventory-service.js`
- "Add to Cart" buttons are disabled when inventory is 0
- Inventory counts are cached and refreshed periodically

### 6. Regenerate Product Feed

After adding a new product, you must regenerate the product feed so it's available in Facebook Commerce Manager and Google Merchant Center.

**Generate the Feed:**
```bash
cd /Users/garyjob/Applications/agroverse_shop
python3 scripts/generate_facebook_feed.py
```

This will:
- Read products from `js/products.js`
- Generate `facebook_product_feed.xml` with all retail products
- Include the new product in the feed

**Commit and Push the Feed:**
```bash
git add facebook_product_feed.xml
git commit -m "Add [product-name] to product feed"
git push origin main
```

**Platform Updates:**
- **Facebook Commerce Manager**: Will automatically fetch the updated feed on the next scheduled update, or you can manually trigger a refresh in Commerce Manager → Catalog → Data Sources
- **Google Merchant Center**: Will automatically fetch the updated feed on the next scheduled update, or you can manually trigger a fetch in Merchant Center → Products → Feeds

**Feed URL:** `https://agroverse.shop/facebook_product_feed.xml`

**Note:** The feed only includes retail products (price > $0). Wholesale products are automatically excluded to prevent Google Merchant Center rejection. If you need to include wholesale products, use the `--include-wholesale` flag (not recommended for Google).

### 7. Test the Integration

**Checklist:**
- ✅ Product appears in `js/products.js`
- ✅ Product page loads correctly at `/product-page/[product-id]/`
- ✅ "Add to Cart" button works and validates inventory
- ✅ Product card appears on landing page (if retail)
- ✅ Product card appears on category page
- ✅ Product links from farm page (if applicable)
- ✅ Product links from shipment page
- ✅ Inventory displays correctly
- ✅ SKU entry exists in Google Sheet
- ✅ Product appears in inventory web service response
- ✅ Product feed regenerated and includes new product
- ✅ Feed file committed and pushed to GitHub

**Testing Commands:**
```bash
# Start local server
./start_local.sh

# Visit product page
open http://127.0.0.1:8000/product-page/[product-id]/

# Check inventory service (replace with actual script URL)
curl "https://script.google.com/macros/s/[SCRIPT_ID]/exec?action=getInventory&sku=[product-id]"

# Verify product in feed
curl "https://agroverse.shop/facebook_product_feed.xml" | grep "[product-id]"
```

### Example: Fazenda Santa Ana Product

For reference, see how the Fazenda Santa Ana ceremonial cacao (2023) was added:
- **Product ID**: `ceremonial-cacao-fazenda-santa-ana-2023-200g`
- **Product Page**: `product-page/ceremonial-cacao-fazenda-santa-ana-2023-200g/index.html`
- **Farm Page**: `farms/fazenda-santa-ana-bahia/index.html`
- **Shipment Page**: `shipments/agl2/index.html`
- **Google Sheet**: Row 10 in "Agroverse SKUs"
- **Script Used**: `scripts/add_fazenda_santa_ana_sku.py` (can be adapted for future products)

This example demonstrates the complete workflow for adding a new SKU product.

## 📱 Product Feed (Facebook & Google Merchant Center)

The site generates a Google Shopping-compatible product feed XML file that works with both **Facebook Commerce Manager** and **Google Merchant Center**.

### Feed URL
- **Production**: `https://agroverse.shop/facebook_product_feed.xml`
- **File Location**: `facebook_product_feed.xml` (root directory)
- **Format**: RSS 2.0 with Google Shopping namespace (compatible with both platforms)

### Merchant Feed Safety Rules (Do Not Regress)

When editing product pages or regenerating the feed, keep these rules to avoid Google/Facebook ingestion issues:

1. **Use feed category field, not page JSON-LD freeform category**
   - Keep `g:google_product_category` in `facebook_product_feed.xml` using a **valid** taxonomy ID from [Google’s list](https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt) (e.g. **`4748`** Candy & Chocolate — do not use invalid IDs like `357`).
   - Do **not** add or re-add freeform `Product.category` strings in product page JSON-LD if Merchant diagnostics flags them.

2. **Use canonical, non-redirecting feed URLs**
   - Prefer `https://agroverse.shop/...` consistently for `link` and `image_link` in the feed.
   - Avoid unnecessary domain redirects in feed URLs.

3. **Ensure clean XML escaping**
   - XML must parse cleanly.
   - Avoid double-escaped entities (bad: `&amp;apos;`, good: `&apos;` or plain apostrophe where valid).

4. **Validate after each feed update**
   - Regenerate feed.
   - Confirm feed parses and all item links return HTTP 200.
   - Re-fetch in Merchant Center / Commerce Manager after publishing.

### Generating the Feed

**Script**: `scripts/generate_facebook_feed.py`

**Usage:**
```bash
cd /Users/garyjob/Applications/agroverse_shop
python3 scripts/generate_facebook_feed.py
```

**What it does:**
- Reads products from `js/products.js`
- Generates Google Shopping-compatible XML feed (works for Facebook and Google)
- Outputs to `facebook_product_feed.xml`
- Includes all required fields for both platforms (id, title, description, link, image_link, availability, condition, price, brand, google_product_category, etc.)

**When to regenerate:**
- After adding new products
- After updating product information (name, price, images)
- After changing product availability

**Note on Wholesale Products:**
- By default, wholesale products (price: $0) are **excluded** from the feed
- Google Merchant Center rejects products with $0.00 price
- Only retail products with valid prices are included
- To include wholesale products, run: `python3 scripts/generate_facebook_feed.py --include-wholesale`

### Setting Up in Facebook Commerce Manager

1. **Go to Facebook Commerce Manager**
   - Visit [Facebook Commerce Manager](https://business.facebook.com/commerce)
   - Navigate to your catalog

2. **Add Data Source**
   - Go to **Catalog** → **Data Sources**
   - Click **Add Data Source**
   - Select **Upload feed file** or **Use a data feed**

3. **Configure Feed**
   - **Feed URL**: `https://agroverse.shop/facebook_product_feed.xml`
   - **Update Schedule**: Set to daily or weekly (Facebook will automatically fetch updates)
   - **Feed Format**: XML (RSS 2.0 with Google Shopping namespace)

4. **Verify Feed**
   - Facebook will validate the feed
   - Check for any errors or warnings
   - Products should appear in your catalog within a few minutes

### Setting Up in Google Merchant Center

1. **Create Google Merchant Center Account**
   - Visit [Google Merchant Center](https://www.google.com/retail/solutions/merchant-center/)
   - Sign up or log in with your Google account
   - Complete the account setup and verify your website

2. **Add Product Feed**
   - Go to **Products** → **Feeds**
   - Click the **+** button to add a new feed
   - Select your target country and language

3. **Configure Feed**
   - **Input method**: Select **Scheduled fetch**
   - **Feed name**: Enter a name (e.g., "Agroverse Shop Products")
   - **File URL**: `https://agroverse.shop/facebook_product_feed.xml`
   - **Fetch frequency**: Set to daily or weekly
   - **Fetch time**: Choose a time (e.g., 2:00 AM)

4. **Verify and Submit**
   - Click **Save** to create the feed
   - Google will fetch and validate the feed
   - Check **Diagnostics** for any errors or warnings
   - Products should appear in your Merchant Center within 24-48 hours

5. **Link to Google Ads (Optional)**
   - To run Shopping ads, link your Merchant Center to Google Ads
   - Go to **Settings** → **Linked accounts** → **Google Ads**
   - Follow the linking process

### Troubleshooting

**Feed not updating:**
- Ensure the XML file is committed and pushed to GitHub
- Verify the feed URL is accessible (try opening it in a browser)
- Check that GitHub Pages is serving the file correctly

**Products missing:**
- Check that product images are accessible (absolute URLs required)
- Verify all required fields are present in the feed
- Review platform-specific requirements

**Validation errors:**
- **Facebook**: Check Commerce Manager diagnostics for specific errors
- **Google**: Review Merchant Center diagnostics and fix any issues
- Common issues: missing images, invalid prices, incorrect availability status

**Wholesale products:**
- Wholesale products ($0.00 price) are **automatically excluded** from the feed
- This prevents Google Merchant Center rejection
- The feed only includes retail products with valid prices ($25.00)
- If you need to include wholesale products, use the `--include-wholesale` flag (not recommended for Google)

### Feed Contents

The feed includes:
- ✅ **Retail products only** (products with valid prices > $0)
- ✅ Complete product information (titles, descriptions, prices)
- ✅ Product images (absolute URLs)
- ✅ Product page links
- ✅ Availability status
- ✅ Custom labels (farm name, shipment ID)
- ✅ Product categories

**Current feed**: 4 retail products, all priced at $25.00 USD

**Note**: Wholesale products ($0.00 price) are automatically excluded to prevent Google Merchant Center rejection. To include them, use the `--include-wholesale` flag (not recommended for Google).

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
chmod +x start_local.sh
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

**Last Updated**: 2025-12-12  
**Version**: 1.2.0
