# Fixing Google Merchant Center Issues

## Issue 1: Product Page Unavailable (404)

### Product 1: Taste of Rainforest

**Problem:**  
Merchant Center is looking for:  
`https://www.agroverse.shop/product-page/taste-of-rainforest-caramelized-cacao-beans/`

**Actual URL:**  
`https://www.agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`

### Product 2: Oscar's Bahia Ceremonial Cacao

**Problem:**  
Merchant Center is looking for:  
`https://www.agroverse.shop/product-page/oscar-bahia-ceremonial-cacao-200g/`

**Actual URL:**  
`https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`

### Product 3: Paulo's La do Sitio Ceremonial Cacao

**Problem:**  
Merchant Center is looking for:  
`https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-200g/`

**Actual URL:**  
`https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`

### Product 4: 8 Ounce Organic Cacao Nibs

**Problem:**  
Merchant Center is looking for:  
`https://www.agroverse.shop/product-page/8-ounce-organic-cacao-nibs/`

**Actual URL:**  
`https://www.agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`

### Solution Options:

**Option A: Update the feed URL in Merchant Center (Recommended)**

**For "Taste of Rainforest":**
1. Go to Google Merchant Center → Products
2. Find "Taste of Rainforest - 200 grams Caramelized Cacao Beans"
3. Edit the product and update the `link` field to:
   `https://www.agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
4. Save and request a new website check

**For "Oscar's Bahia Ceremonial Cacao":**
1. Go to Google Merchant Center → Products
2. Find "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)"
3. Edit the product and update the `link` field to:
   `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
4. Save and request a new website check

**For "Paulo's La do Sitio Ceremonial Cacao":**
1. Go to Google Merchant Center → Products
2. Find "Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)"
3. Edit the product and update the `link` field to:
   `https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
4. Save and request a new website check

**For "8 Ounce Organic Cacao Nibs":**
1. Go to Google Merchant Center → Products
2. Find "Amazon Rainforest Regenerative 8 Ounce Organic Cacao Nibs"
3. Edit the product and update the `link` field to:
   `https://www.agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`
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
Merchant Center requires a valid Google product category ID.

### Solution:

1. Go to Merchant Center → Products
2. Find the product
3. Edit and set `google_product_category` to one of these:

**For Ceremonial Cacao / Cacao Products:**
- **`422`** - Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum > Chocolate
- **`422`** is the most appropriate for cacao/chocolate products

**Alternative categories (if 422 doesn't work):**
- **`422`** - Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum > Chocolate
- **`422`** - Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum

**For Cacao Nibs specifically:**
- **`422`** - Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum > Chocolate

4. Save the product

---

## Quick Fix Checklist:

**For "Taste of Rainforest":**
- [ ] Update `link` to: `https://www.agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
- [ ] Set `google_product_category` to `422` (Chocolate category)
- [ ] Request automated website check

**For "Oscar's Bahia Ceremonial Cacao":**
- [ ] Update `link` to: `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
- [ ] Set `google_product_category` to `422` (Chocolate category)
- [ ] Request automated website check

**For "Paulo's La do Sitio Ceremonial Cacao":**
- [ ] Update `link` to: `https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
- [ ] Set `google_product_category` to `422` (Chocolate category)
- [ ] Request automated website check

**For "8 Ounce Organic Cacao Nibs":**
- [ ] Update `link` to: `https://www.agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`
- [ ] Set `google_product_category` to `422` (Chocolate category)
- [ ] Request automated website check

**General:**
- [ ] Wait 24-48 hours for Google to re-check

---

## Finding the Correct Category:

If `422` doesn't work, you can browse categories at:
https://www.google.com/basepages/producttype/taxonomy.en-US.txt

Search for "chocolate" or "cacao" to find the exact category ID.

---

## Note:

The Product JSON-LD on the page now includes a `category` field, but Merchant Center reads from the feed file, not JSON-LD. You must update the feed data in Merchant Center directly.
