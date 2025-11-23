# Product Pages Navigation Strategy

## Overview

We have 8 product pages that need to be exposed on the agroverse_shop site, organized into two categories:
- **Retail Packs** (4 products)
- **Wholesale Bulk** (4 products)

Each product is associated with a shipment (AGL), creating a clear traceability link.

## Product-Shipment Associations

### Retail Packs (`/category/retail-packs`)
1. **Ceremonial Cacao – La do Sitio Farm** (200g)
   - URL: `/product-page/ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g`
   - Shipment: **AGL8**
   - Farm: Paulo's La do Sitio Farm, Pará

2. **Taste of Rainforest - Caramelized Cacao Beans** (200g)
   - URL: `/product-page/taste-of-rainforest-200-grams-caramelized-cacao-beans`
   - Shipment: **AGL10**
   - Farm: Capela Velha Fazenda

3. **Ceremonial Cacao – Oscar's Farm** (200g)
   - URL: `/product-page/oscar-s-bahia-ceremonial-cacao`
   - Shipment: **AGL4**
   - Farm: Oscar's Farm, Bahia

4. **Amazon Rainforest Regenerative Cacao Nibs** (8 oz)
   - URL: `/product-page/8-ounce-organic-cacao-nibs-from-brazil`
   - Shipment: **AGL4**
   - Farm: Oscar's Farm, Bahia

### Wholesale Bulk (`/category/wholesale-bulk`)
1. **Organic Criollo Cacao Beans - Oscar's 100-Year Farm** (per kg)
   - URL: `/product-page/organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm`
   - Shipment: **AGL14**
   - Farm: Oscar's Farm, Bahia

2. **Organic Cacao Beans - Jesus Da Deus Fazenda** (per kg)
   - URL: `/product-page/organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram`
   - Shipment: **AGL13**
   - Farm: Vivi's Jesus Do Deus Farm, Itacaré

3. **Organic Criollo Cacao Nibs - Oscar's 100-Year Farm** (per kg)
   - URL: `/product-page/organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm`
   - Shipment: **AGL4**
   - Farm: Oscar's Farm, Bahia

4. **La do Sitio Farm Cacao Beans** (per kg)
   - URL: `/product-page/premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far`
   - Shipment: **AGL8**
   - Farm: Paulo's La do Sitio Farm, Pará

## Recommended Navigation Strategy

### 1. **Update "Products" Section on Main Page**
- Replace or enhance the current product gallery
- Add category filters: "Retail Packs" and "Wholesale Bulk"
- Show product cards with:
  - Product image
  - Product name
  - Price
  - Associated shipment badge (e.g., "From AGL8")
  - "View Product" button
  - Link to associated shipment page

### 2. **Category Pages**
- `/category/retail-packs/index.html` - Grid of all retail products
- `/category/wholesale-bulk/index.html` - Grid of all wholesale products
- Each category page shows:
  - Category description
  - Product grid with cards
  - Filter/sort options (optional)

### 3. **Product Pages**
- Maintain original URL structure: `/product-page/{slug}`
- Each product page should include:
  - Product images/gallery
  - Product name and description
  - Price and purchase options
  - **"Trace This Product" section** linking to associated shipment
  - Farm information
  - QR code information (if applicable)
  - Related products

### 4. **Cross-Linking Strategy**
- **Product → Shipment**: "View Shipment Details" button on product page
- **Shipment → Product**: "Available Products" section on shipment page
- **Category → Products**: Product cards link to individual product pages
- **Main Page → Categories**: "Shop Retail" and "Shop Wholesale" buttons

### 5. **Navigation Menu Updates**
- Add "Shop" dropdown menu with:
  - Retail Packs
  - Wholesale Bulk
  - All Products
- Or add "Shop" as a main menu item

## Implementation Priority

1. ✅ Create category pages (retail-packs, wholesale-bulk)
2. ✅ Create individual product pages
3. ✅ Update main page "Products" section
4. ✅ Add navigation menu items
5. ✅ Add cross-links between products and shipments

## Key Features to Include

- **Traceability**: Clear link from product to shipment
- **Farm Story**: Connect product to farmer story
- **QR Code Integration**: For retail products, show QR code info
- **Consistent Design**: Match existing agroverse_shop styling
- **Mobile Responsive**: All pages must work on mobile
- **SEO Optimized**: Proper meta tags, structured data

