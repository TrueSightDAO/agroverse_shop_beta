# Google Merchant Center — key event tracking (Agroverse.shop)

This matches Google’s guide: [Set up key event tracking in Merchant Center](https://support.google.com/merchants/answer/14166401).

## What the site already does

- **Google tag (gtag.js)** loads on production only (`www.agroverse.shop` / `agroverse.shop`) via `js/google-analytics.js`.
- **GA4 Measurement ID:** `G-S6EP25EHF4` (same file).
- **Ecommerce events** in `js/ga4-events.js`: `view_item`, `add_to_cart`, `begin_checkout`, **`purchase`**, etc.
- **`purchase`** fires on the order confirmation flow in `order-status/` after a successful order fetch (`js/order-status.js`), with **one event per order per browser** (sessionStorage guard) so refreshes do not duplicate key events.

## What you do in Merchant Center

1. Sign in to **Merchant Center** → **Settings** (gear) → **General** → **Key event setup**.
2. Turn on **Auto-tagging** (adds `srsltid` on clicks from free listings; see Google’s article).
3. **Add key event source** — choose **one** primary approach:
   - **Link Google Analytics (recommended here):** Link the **GA4 property** that uses measurement ID **`G-S6EP25EHF4`**. Purchases recorded in GA4 can then flow to Merchant Center as key events after linking and processing delays.
   - **Link your website:** Follow the wizard to install/verify the **Google tag**. If Merchant Center gives an **extra** tag/destination ID (e.g. `GT-…`) in addition to your existing GA4 ID, add it to **`ADDITIONAL_GTAG_CONFIG_IDS`** in `js/google-analytics.js` and deploy.

4. If the wizard asks for a **purchase** definition via **thank-you URL**, the confirmation page is **order status** with query param **`session_id`** (see `js/order-status.js` → `getSessionIdFromUrl`), e.g.  
   `https://www.agroverse.shop/order-status/?session_id=<checkout_session_id>`

5. **Privacy / consent:** Ensure your privacy policy and any consent banners match how you use cookies and analytics (Google’s reminder in the same help article).

## Product IDs and reporting

For purchase and item reports to line up with the **Merchant Center product feed**, **`items[].item_id`** in GA4 should match the feed’s **`id`** field. That maps from `productId` in cart/order data — see `docs/PRODUCT_CREATION_CHECKLIST.md` (SKU / URL alignment with Merchant Center).

## Verify

- **GA4** → **Reports** → **Realtime** (or **DebugView** with debug mode): complete a test order and confirm **`purchase`** with `transaction_id` and `items`.
- **Merchant Center** → performance / key event reports after Google has linked and processed data (may take time).

---

## Google Customer Reviews (survey opt-in)

**Full reference (files, API, columns, clasp, testing, privacy):** [`docs/GOOGLE_CUSTOMER_REVIEWS.md`](GOOGLE_CUSTOMER_REVIEWS.md)

Separate from “key events” but part of the same Merchant Center ecosystem: [Google Customer Reviews](https://support.google.com/merchants/topic/7107684) can email buyers a short survey after delivery.

### What we implemented on the site

| Piece | Role |
|--------|------|
| `js/google-customer-reviews.js` | Loads `platform.js`, calls `gapi.surveyoptin.render` once per `order_id` (sessionStorage dedupe). |
| `js/config.js` | `googleCustomerReviewsMerchantId` (`5682641517` on prod + optional localhost), `googleCustomerReviewsEnableLocalTest` ( **`true`** = allow GCR on `localhost` / `127.0.0.1` while testing — set **`false`** when you don’t want it locally), `googleCustomerReviewsEstimatedDeliveryDays` (default **7**). |
| `js/order-status.js` | After a successful load, if `paymentStatus === 'paid'` and merchant id is set, schedules opt-in with **`order_id` = Stripe session id** (`cs_…`), **`email`** = `customerEmail`, **`delivery_country`** from shipping address, **`estimated_delivery_date`** = order date + N days (UTC). |

Estimated delivery is **not** from carrier data — it is **order `date` + configured calendar days** until you add a real ETA field to the order API.

### Prerequisites in Merchant Center

1. Enroll / enable **Google Customer Reviews** for your merchant account (program eligibility and opt-in settings).
2. Keep **`merchant_id`** in `config.js` in sync with the enrolled account.

### Offline / QR sales (product pages)

Retail **product** pages load `js/product-page-tracking.js`, which checks **`?qr=`** or **`?gcr_qr=`** (same value).

1. **Apps Script** (same deployment as checkout — `google-app-script/agroverse_shop_checkout/agroverse_shop_checkout.gs`):  
   **`GET .../exec?action=getGcrContextByQr&qr=<code>`**  
   Looks up **`Agroverse QR codes`** (column **A** = code, **L** = Owner Email, **G** = country, **M** = onboarding email sent date (used for **`orderDateIso`**), **J** = QR creation date (fallback), **I** = product key) and optionally **`Agroverse SKUs`** column **J** (GTIN) when **I** matches SKU **A** or **B**. If dates are empty, **`orderDateIso`** can still be derived from a **`YYYYMMDD`** segment in the qr id. Returns JSON `{ status, gcr: { orderId, email, deliveryCountry, orderDateIso, products? } }`.

2. The page then loads `google-customer-reviews.js` if needed and calls **`scheduleRender`** with that payload (same sessionStorage dedupe as order-status).

Redeploy the web app after changing the script so `getGcrContextByQr` is live (a stale deployment returns “Invalid action”).

**Trial (bags you own):** after deploy, open any product URL with the code, e.g.  
`https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g/?qr=2024SJ_20250508_3`  
(or local server: `http://127.0.0.1:8000/product-page/.../?qr=2024SJ_20250508_3`).  
Confirm **Owner Email** is set on that row in **Agroverse QR codes**; otherwise the API returns an error.

### Privacy

The opt-in shares **email** and order metadata with Google per their program — align with your privacy policy and collection practices.
