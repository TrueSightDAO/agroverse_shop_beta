# Fixing Google Merchant Center Issues

## Issue 1: Product Page Unavailable (404)

### Product 1: Taste of Rainforest

**Problem:**  
Merchant Center is looking for:  
`https://agroverse.shop/product-page/taste-of-rainforest-caramelized-cacao-beans/`

**Actual URL:**  
`https://agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`

### Product 2: Oscar's Bahia Ceremonial Cacao

**Problem:**  
Merchant Center is looking for:  
`https://agroverse.shop/product-page/oscar-bahia-ceremonial-cacao-200g/`

**Actual URL:**  
`https://agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`

### Product 3: Paulo's La do Sitio Ceremonial Cacao

**Problem:**  
Merchant Center is looking for:  
`https://agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-200g/`

**Actual URL:**  
`https://agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`

### Product 4: 8 Ounce Organic Cacao Nibs

**Problem:**  
Merchant Center is looking for:  
`https://agroverse.shop/product-page/8-ounce-organic-cacao-nibs/`

**Actual URL:**  
`https://agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`

### Solution Options:

**Option A: Update the feed URL in Merchant Center (Recommended)**

**For "Taste of Rainforest":**
1. Go to Google Merchant Center → Products
2. Find "Taste of Rainforest - 200 grams Caramelized Cacao Beans"
3. Edit the product and update the `link` field to:
   `https://agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
4. Save and request a new website check

**For "Oscar's Bahia Ceremonial Cacao":**
1. Go to Google Merchant Center → Products
2. Find "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)"
3. Edit the product and update the `link` field to:
   `https://agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
4. Save and request a new website check

**For "Paulo's La do Sitio Ceremonial Cacao":**
1. Go to Google Merchant Center → Products
2. Find "Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)"
3. Edit the product and update the `link` field to:
   `https://agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
4. Save and request a new website check

**For "8 Ounce Organic Cacao Nibs":**
1. Go to Google Merchant Center → Products
2. Find "Amazon Rainforest Regenerative 8 Ounce Organic Cacao Nibs"
3. Edit the product and update the `link` field to:
   `https://agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`
4. Save and request a new website check

**Option B: Create a redirect (if you can't edit the feed)**
If your hosting supports redirects (e.g., `.htaccess` for Apache, `_redirects` for Netlify), add:
```
/product-page/taste-of-rainforest-caramelized-cacao-beans /product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans 301
/product-page/oscar-bahia-ceremonial-cacao-200g /product-page/oscar-s-bahia-ceremonial-cacao 301
/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-200g /product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g 301
/product-page/8-ounce-organic-cacao-nibs /product-page/8-ounce-organic-cacao-nibs-from-brazil 301
```

---

## Issue 2: Invalid Product Category

**Problem:**  
Merchant Center requires a **predefined** Google product category ID or full path. Values like **`357`** are invalid — that number does not appear as a category in [Google’s taxonomy](https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt) (you’ll see `3572`, `3577`, etc., but not `357`).

### Solution (feed / repo)

The product feed generator (`scripts/generate_facebook_feed.py`) sets:

- **`4748`** — `Food, Beverages & Tobacco > Food Items > Candy & Chocolate`

That is the appropriate **leaf** category for ceremonial cacao and similar chocolate/candy shelf products. Regenerate and deploy:

`python3 scripts/generate_facebook_feed.py`

### Solution (manual edit in Merchant Center)

1. Go to Merchant Center → Products  
2. Find the product  
3. Set `google_product_category` to **`4748`** (or paste the full path above)  
4. Save the product  

**Note:** **`422`** is only *Food Items* (a parent category). Prefer **`4748`** for chocolate/cacao retail unless Google’s taxonomy adds a more specific cacao line.

---

## Quick Fix Checklist:

**For "Taste of Rainforest":**
- [ ] Update `link` to: `https://agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
- [ ] Set `google_product_category` to `4748` (Candy & Chocolate)
- [ ] Request automated website check

**For "Oscar's Bahia Ceremonial Cacao":**
- [ ] Update `link` to: `https://agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
- [ ] Set `google_product_category` to `4748` (Candy & Chocolate)
- [ ] Request automated website check

**For "Paulo's La do Sitio Ceremonial Cacao":**
- [ ] Update `link` to: `https://agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
- [ ] Set `google_product_category` to `4748` (Candy & Chocolate)
- [ ] Request automated website check

**For "8 Ounce Organic Cacao Nibs":**
- [ ] Update `link` to: `https://agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`
- [ ] Set `google_product_category` to `4748` (Candy & Chocolate)
- [ ] Request automated website check

**General:**
- [ ] Wait 24-48 hours for Google to re-check

---

## Finding the Correct Category:

Download the official list with numeric IDs:  
https://www.google.com/basepages/producttype/taxonomy-with-ids.en-US.txt  

Search for `chocolate` or `cacao`. For shelf chocolate/ceremonial cacao, **`4748`** (Candy & Chocolate) is usually correct.

---

## Note:

The Product JSON-LD on the page now includes a `category` field, but Merchant Center reads from the feed file, not JSON-LD. You must update the feed data in Merchant Center directly.

---

## Root cause (Oscar & similar “wrong link” errors)

`g:id` / internal cart IDs in `js/products.js` (e.g. `oscar-bahia-ceremonial-cacao-200g`) are **not** the same string as the **URL folder** under `product-page/` (e.g. `oscar-s-bahia-ceremonial-cacao`). The generator `scripts/generate_facebook_feed.py` used to build `g:link` as:

`{BASE_URL}/product-page/{product_id}/`

which produced URLs like  
`https://agroverse.shop/product-page/oscar-bahia-ceremonial-cacao-200g/` — a path that **does not exist** (404). The live page and JSON-LD use the real slug.

**Fix in repo:** each product that differs adds `productPageSlug` in `products.js`; the feed script uses that for `g:link` while keeping `g:id` as the stable internal id. After changing products, run `python3 scripts/generate_facebook_feed.py`, commit `facebook_product_feed.xml`, and let Merchant Center re-fetch.

**www vs non-www:** Feeds (`facebook_product_feed.xml`, `sitemap.xml`) use apex `https://agroverse.shop` in repo scripts and generated XML. HTML may still declare `www` canonicals; keep redirects consistent so Merchant Center and users reach the same product. If MC still shows an old URL, re-fetch the feed or remove stale duplicate rows.
