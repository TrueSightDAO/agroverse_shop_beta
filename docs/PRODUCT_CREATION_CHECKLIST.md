# Product Creation Checklist - Prevent Merchant Center Issues

This checklist ensures new products are created correctly and won't cause Google Merchant Center errors.

---

## ✅ Pre-Creation Checklist

Before creating a new product page, verify:

- [ ] **Product folder name matches intended URL exactly**
  - Use lowercase, hyphens for spaces
  - Include full product name (e.g., `taste-of-rainforest-200-grams-caramelized-cacao-beans` not `taste-of-rainforest-caramelized-cacao-beans`)
  - Include weight/size in URL if it's part of the product name (e.g., `200g`, `8-ounce`)
  - Include year if it's harvest-specific (e.g., `2024-200g` not just `200g`)

- [ ] **Product data ready:**
  - Product name (full title)
  - SKU (unique identifier) — **use the same value as Google Merchant Center `id`** when possible so GA4 `purchase` → `items[].item_id` matches the feed (key event / reporting alignment; see `docs/MERCHANT_CENTER_KEY_EVENTS.md`)
  - Price (USD)
  - Weight/size
  - Origin/farm name
  - Harvest year
  - Shipment ID (AGL#)
  - Product image URL
  - Description

---

## 📝 Product Page Creation Steps

### 1. Create Product Folder Structure

```bash
# Example: Creating a new product
mkdir -p product-page/product-slug-name
# Create index.html in that folder
```

**Folder naming rules:**
- ✅ DO: `ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
- ✅ DO: `8-ounce-organic-cacao-nibs-from-brazil`
- ❌ DON'T: `ceremonial-cacao-paulo-s-la-do-sitio-farm-200g` (missing year)
- ❌ DON'T: `8-ounce-organic-cacao-nibs` (missing origin)

**Why:** The folder name becomes the URL. Merchant Center will use this exact URL, so it must match what you submit.

---

### 2. Add Product JSON-LD Schema

**Required fields in Product JSON-LD:**

```json
{
  "@context": "https://schema.org/",
  "@type": "Product",
  "name": "Full Product Name",
  "image": "https://www.agroverse.shop/assets/images/products/image.jpg",
  "description": "Product description",
  "sku": "unique-sku-identifier",
  "brand": {
    "@type": "Brand",
    "name": "Agroverse"
  },
  "offers": {
    "@type": "Offer",
    "url": "https://www.agroverse.shop/product-page/FOLDER-NAME-HERE",
    "priceCurrency": "USD",
    "price": "25.00",
    "priceValidUntil": "2025-12-31",
    "availability": "https://schema.org/InStock",
    "seller": {
      "@type": "Organization",
      "name": "Agroverse"
    }
  },
  "category": "Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum > Chocolate",
  "additionalProperty": [
    {
      "@type": "PropertyValue",
      "name": "Weight",
      "value": "200g"
    },
    {
      "@type": "PropertyValue",
      "name": "Origin",
      "value": "Farm Name, Location, Brazil"
    },
    {
      "@type": "PropertyValue",
      "name": "Harvest Year",
      "value": "2024"
    },
    {
      "@type": "PropertyValue",
      "name": "Shipment ID",
      "value": "AGL4"
    }
  ]
}
```

**Critical:** The `offers.url` must match the folder name exactly:
- Folder: `product-page/oscar-s-bahia-ceremonial-cacao`
- URL: `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`

---

### 3. Google Merchant Center Setup

**When adding product to Merchant Center feed:**

- [ ] **Use the EXACT folder name as the URL:**
  - ✅ `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
  - ❌ `https://www.agroverse.shop/product-page/oscar-bahia-ceremonial-cacao-200g` (wrong!)

- [ ] **Set `google_product_category` to: `4748`**
  - This is the Google product category ID for "Food, Beverages & Tobacco > Food Items > Candy, Sweets & Gum > Chocolate"
  - Required for all cacao/chocolate products

- [ ] **Verify all required fields:**
  - `id` (SKU)
  - `title` (product name)
  - `description`
  - `link` (MUST match folder name!)
  - `image_link`
  - `price`
  - `availability` (usually "in stock")
  - `google_product_category` (4748)
  - `brand` (Agroverse)
  - `condition` (new)

---

## 🔍 Verification Checklist

After creating a product:

- [ ] **Test the URL in browser:**
  - Visit: `https://www.agroverse.shop/product-page/[folder-name]`
  - Should load without 404 error

- [ ] **Verify JSON-LD:**
  - Use Google Rich Results Test: https://search.google.com/test/rich-results
  - Enter product URL
  - Should show Product schema with no errors

- [ ] **Check Merchant Center feed:**
  - URL in feed matches folder name exactly
  - No trailing slashes
  - `google_product_category` is set to `4748`

- [ ] **Update sitemap.xml:**
  - Add new product URL to `sitemap.xml`
  - Set appropriate priority (0.8 for products)
  - Set changefreq to "monthly"

---

## 🚨 Common Mistakes to Avoid

### ❌ URL Mismatches

**Problem:** Merchant Center URL doesn't match actual page URL

**Examples:**
- Feed has: `oscar-bahia-ceremonial-cacao-200g`
- Actual page: `oscar-s-bahia-ceremonial-cacao`
- **Result:** 404 error in Merchant Center

**Fix:** Always use the folder name as the URL in Merchant Center feed.

---

### ❌ Missing Google Product Category

**Problem:** `google_product_category` not set or invalid

**Fix:** Always set to `4748` for cacao/chocolate products.

---

### ❌ Incomplete Product JSON-LD

**Problem:** Missing required fields in Product schema

**Required fields:**
- `name`
- `image`
- `description`
- `sku`
- `brand`
- `offers` (with `url`, `price`, `priceCurrency`, `availability`)
- `category` (for SEO)

---

## 📋 Template: New Product Checklist

Copy this when creating a new product:

```
Product: [Product Name]
SKU: [sku-identifier]
Folder: product-page/[folder-name]
URL: https://www.agroverse.shop/product-page/[folder-name]

Merchant Center:
- [ ] Link field matches folder name exactly
- [ ] google_product_category = 4748
- [ ] All required fields filled

JSON-LD:
- [ ] Product schema added to index.html
- [ ] offers.url matches folder name
- [ ] category field included
- [ ] All additionalProperty fields filled

Verification:
- [ ] URL loads in browser (no 404)
- [ ] Rich Results Test passes
- [ ] Added to sitemap.xml
```

---

## 🔗 Reference: Current Product URLs

For reference, here are the correct URLs for existing products:

- `https://www.agroverse.shop/product-page/oscar-s-bahia-ceremonial-cacao`
- `https://www.agroverse.shop/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
- `https://www.agroverse.shop/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
- `https://www.agroverse.shop/product-page/8-ounce-organic-cacao-nibs-from-brazil`

**Pattern:** Use the exact folder name, no abbreviations, include all relevant details (year, weight, origin if part of name).

---

## 📚 Additional Resources

- [Google Product Category Taxonomy](https://www.google.com/basepages/producttype/taxonomy.en-US.txt)
- [Google Merchant Center Product Data Specification](https://support.google.com/merchants/answer/7052112)
- [Schema.org Product Documentation](https://schema.org/Product)

---

**Last Updated:** 2025-01-30  
**Maintained by:** Development team  
**Questions?** Check `docs/MERCHANT_CENTER_FIX.md` for troubleshooting
