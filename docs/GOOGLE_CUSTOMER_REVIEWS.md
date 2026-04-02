# Google Customer Reviews (GCR) — implementation reference

**For:** engineers, operators, and AI assistants maintaining `agroverse.shop`.  
**Program docs:** [Google Customer Reviews](https://support.google.com/merchants/topic/7107684) (Merchant Center).

This document describes **what is baked into the repo and runtime** (survey **opt-in** on the site, backend lookup for QR/offline orders). It does **not** replace Merchant Center enrollment or Google’s eligibility rules.

---

## Quick facts

| Item | Value / location |
|------|------------------|
| Merchant Center **merchant_id** (in code) | `5682641517` in `js/config.js` when host is prod or local GCR test is on |
| Opt-in mechanism | `gapi.surveyoptin.render` via `https://apis.google.com/js/platform.js` |
| Dedupe | `sessionStorage` key `agroverse_gcr_optin_<orderId>` after a successful render |
| Stripe checkout orders | `order_id` = Stripe Checkout **session id** (`cs_…`) |
| QR / offline-style orders | `order_id` = **qr_code** string from sheet column **A** |

---

## Frontend files

| File | Role |
|------|------|
| [`js/google-customer-reviews.js`](../js/google-customer-reviews.js) | Loads `platform.js`, `scheduleRender()`, `normalizeDeliveryCountry`, `addDaysYyyyMmDd`. Host allowlist: `www.agroverse.shop`, `agroverse.shop`, or **local** + `googleCustomerReviewsEnableLocalTest`. Debug: logs `[GCR] Calling surveyoptin.render` / skip when `AGROVERSE_CONFIG.debug` |
| [`js/config.js`](../js/config.js) | `googleCustomerReviewsMerchantId`, `googleCustomerReviewsEnableLocalTest`, `googleCustomerReviewsEstimatedDeliveryDays` (default **7**) |
| [`js/order-status.js`](../js/order-status.js) | After successful order load, if `paymentStatus === 'paid'` and merchant id set → `scheduleRender` with session id, email, shipping country, `orderDateIso`, estimated delivery = order date + N days |
| [`js/product-page-tracking.js`](../js/product-page-tracking.js) | If URL has **`?qr=`** or **`?gcr_qr=`** → `fetch(googleScriptUrl + '?action=getGcrContextByQr&qr=…')` → `scheduleRender` with returned `gcr` payload; dynamically loads `google-customer-reviews.js` if needed |

**Product pages** that include `product-page-tracking.js` participate in the QR flow (all under `product-page/*/`).

---

## Backend (Google Apps Script)

| Item | Detail |
|------|--------|
| Source (repo) | [`google-app-script/agroverse_shop_checkout/agroverse_shop_checkout.gs`](../google-app-script/agroverse_shop_checkout/agroverse_shop_checkout.gs) |
| Deploy | Web app URL in `js/config.js` → `GOOGLE_SCRIPT_URL` / `googleScriptUrl` |
| Clasp | Project folder [`google-app-script/agroverse_shop_checkout/`](../google-app-script/agroverse_shop_checkout/) — see [`CLASP.md`](../google-app-script/agroverse_shop_checkout/CLASP.md); `npm run clasp:checkout:push` (use `--force` if clasp skips) |
| Endpoint | **`GET …/exec?action=getGcrContextByQr&qr=<CODE>`** |
| Spreadsheet | Main ledger: `1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU` (override with Script Property `GCR_LEDGER_SPREADSHEET_ID` if needed) |
| Sheet tab | **`Agroverse QR codes`** |

### `getGcrContextByQr` column mapping (1-based letters → usage)

Reads rows **A–M** for the matching **A = qr_code**.

| Column | Use |
|--------|-----|
| **A** | `orderId` |
| **G** | `deliveryCountry` (normalized to ISO-2 where possible) |
| **I** | Product key → match **Agroverse SKUs** col **A** or **B** → optional **GTIN** (SKU col **J**) for `products: [{ gtin }]` |
| **J** | Fallback for `orderDateIso` if **M** empty |
| **L** | **Owner Email** → `email` (required; error if blank) |
| **M** | **Onboarding email sent date** → primary `orderDateIso` (Date or YYYYMMDD text) |

If **M** and **J** don’t parse, **`orderDateIso`** can fall back to first **`YYYYMMDD`** in the qr id (e.g. `2024SJ_20250508_3`).

### Response shape

```json
{
  "status": "success",
  "gcr": {
    "orderId": "...",
    "email": "...",
    "deliveryCountry": "BR",
    "orderDateIso": "2025-07-26T12:00:00.000Z",
    "products": [{ "gtin": "860010660232" }]
  }
}
```

`products` omitted if no GTIN match.

---

## Ledger sheet: operational columns (not written by Google)

On **[Agroverse QR codes](https://docs.google.com/spreadsheets/d/1GE7PUq-UT6x2rBN-Q2ksogbWpgyuh2SaxJyG_uEK6PU/edit?gid=472328231#gid=472328231)** the team added **W–Y** for **your** CRM-style tracking. **Google does not** call back to fill these.

| Column | Typical use |
|--------|-------------|
| **W** | Review email sent (your send workflow) |
| **X** | Click-through on **your** tracked links |
| **Y** | “Submit” only if you have a **verifiable** signal (custom flow / manual); **not** from a per-buyer GCR completion API |

Canonical schema notes: **`tokenomics/SCHEMA.md`** (sheet `Agroverse QR codes`).

---

## Testing

- **Production:** product URL + query, e.g.  
  `https://www.agroverse.shop/product-page/<slug>/?qr=<CODE>`
- **Local:** `http://127.0.0.1:8000/.../?qr=...` only if `GOOGLE_CUSTOMER_REVIEWS_ENABLE_LOCAL_TEST === true`; Google’s opt-in iframe may **404** on localhost — **production** is the reliable UI test.
- **API:** `curl -sSL '<exec>?action=getGcrContextByQr&qr=<CODE>'` (follow redirects).

---

## Privacy

The opt-in shares **email** and order metadata with Google per the [GCR program](https://support.google.com/merchants/topic/7107684). Align with site privacy policy and consent practices.

---

## Related docs

- [`docs/MERCHANT_CENTER_KEY_EVENTS.md`](MERCHANT_CENTER_KEY_EVENTS.md) — GA4 key events + shortened GCR summary
- [`docs/PRODUCT_CREATION_CHECKLIST.md`](PRODUCT_CREATION_CHECKLIST.md) — SKU / feed alignment (GTIN)

---

## QR / shipment landing: commerce UX (purchase friction)

*Separate from GCR mechanics; reflects feedback from QR → site visitors who want to **buy again**.*

### Typical paths today

- **Sheets `landing_page` (col B)** often points to **`/shipments/aglN`** style pages — large **hero** (story, video, trees badge), **shoppable blocks lower** in the page.
- **Product URLs with `?qr=`** show the **product** PDP + GCR; related items may exist but **above-the-fold CTAs** may be weak.

### Recommendations (minimal new stack)

1. **Primary commerce CTA in the first viewport** on shipment pages — e.g. sticky or hero button: **“Shop this harvest”** / **“Buy cacao from this shipment”** linking to an **`#shop`** anchor or the first product card block.
2. **Repeat the CTA** after 1–2 screens of story (mid-page ribbon) so scroll-heavy readers still see **Buy** without reaching the footer.
3. **Product cards:** show **price + Add to cart** (or **View product**) on shipment grids; avoid “title only” links that read as editorial.
4. **“Buy again” row** — top 3 SKUs for that shipment (same **Currency** / product family from the QR row) with explicit **Same bag** / **Similar** links to the right `product-page/…` URLs.
5. **Mobile:** consider **collapsing** or **accordions** for long narrative so **shop blocks** appear earlier, or a **tab** switch: Story | Shop.
6. **Optional deep link:** when generating QR **landing_page**, point retail owners to **`/product-page/.../?qr=CODE`** for SKUs that map cleanly—story can stay one click away (“About this harvest”).

Implementing these is mostly **HTML/CSS reorder + anchors + copy** on existing static templates; no new backend required for basic CTAs.

---

*Last updated: 2026-04-02 — GCR + QR API + SCHEMA W–Y + clasp + UX notes consolidated.*
