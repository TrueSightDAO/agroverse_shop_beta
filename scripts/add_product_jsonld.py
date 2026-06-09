#!/usr/bin/env python3
"""
Script to add Product JSON-LD schema to all product pages.
Sources product data from js/products.js (canonical), with a hardcoded
fallback for fields the JS doesn't carry (description, weight, origin text).
"""

import os
import re
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
PRODUCT_DIR = BASE_DIR / "product-page"

# Fallback descriptions, weight labels, and origin text — fields not in products.js.
# When products.js has the field (name, image, price, sku, farm, shipment), it wins.
# Add new products here ONLY for fields products.js does not carry.
PRODUCT_FALLBACKS = {
    "oscar-s-bahia-ceremonial-cacao": {
        "description": "Premium ceremonial cacao from Oscar's farm in Bahia, Brazil. 200g bag with QR code traceability. Three generations of cacao wisdom with 80-year-old trees.",
        "weight": "200g",
    },
    "ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g": {
        "description": "Premium ceremonial cacao from Paulo's La do Sitio farm in Pará, Brazil. 200g bag with QR code traceability. Award-winning regenerative cacao from the Amazon Rainforest.",
        "weight": "200g",
    },
    "taste-of-rainforest-200-grams-caramelized-cacao-beans": {
        "description": "Caramelized cacao beans from Capela Velha Fazenda, Bahia, Brazil. 200g bag with QR code traceability. Unique caramelized processing technique.",
        "weight": "200g",
    },
    "8-ounce-organic-cacao-nibs-from-brazil": {
        "description": "Organic cacao nibs from Oscar's farm in Bahia, Brazil. 8 oz (227g) bag with QR code traceability. Three generations of cacao wisdom.",
        "weight": "8 oz (227g)",
    },
    "ceremonial-cacao-fazenda-santa-ana-2023-200g": {
        "description": "Premium ceremonial cacao from Fazenda Santa Ana in Bahia, Brazil. 200g bag with QR code traceability. Part of Coopercabruca cooperative.",
        "weight": "200g",
    },
    "organic-81-dark-chocolate-bar-50g-fazenda-santa-ana-bahia-2023": {
        "description": "Organic 81% dark chocolate bar (50g) from Fazenda Santa Ana, Bahia, Brazil. Made from single-estate cacao.",
        "weight": "50g",
    },
    "organic-81-dark-chocolate-bar-50g-oscar-bahia-2024": {
        "description": "Organic 81% dark chocolate bar (50g) from Oscar's Farm, Bahia, Brazil. Made from single-estate cacao.",
        "weight": "50g",
    },
    "organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm": {
        "description": "Organic Criollo cacao beans from Oscar's 100-year-old farm in Bahia, Brazil. Three generations of cacao wisdom with 80-year-old trees.",
        "weight": "varies",
    },
    "organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm": {
        "description": "Organic Criollo cacao nibs from Oscar's 100-year-old farm in Bahia, Brazil. Three generations of cacao wisdom with 80-year-old trees.",
        "weight": "varies",
    },
    "organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram": {
        "description": "Organic hybrid cacao beans from Jesus Do Deus Fazenda in Itacaré, Bahia, Brazil. Regenerative cabruca agroforestry farm.",
        "weight": "1 kg",
    },
    "premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far": {
        "description": "Premium organic cacao beans from La do Sitio farm in Pará, Amazon Rainforest, Brazil. Award-winning regenerative cacao.",
        "weight": "varies",
    },
}


def _load_products_js():
    """Parse js/products.js and return a dict keyed by productPageSlug."""
    products_js = BASE_DIR / "js" / "products.js"
    if not products_js.exists():
        return {}
    text = products_js.read_text(encoding="utf-8")
    # strip JS comments so the block is valid JSON
    text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    m = re.search(r"window\.PRODUCTS\s*=\s*(\{.*\});?\s*$", text, re.DOTALL)
    if not m:
        return {}
    try:
        raw = json.loads(m.group(1))
    except json.JSONDecodeError:
        return {}
    out = {}
    for key, val in raw.items():
        slug = val.get("productPageSlug") or key
        out[slug] = val
    return out


def _build_product_info(slug):
    """Merge products.js data with hardcoded fallbacks into a single dict."""
    js = _load_products_js()
    fb = PRODUCT_FALLBACKS.get(slug, {})
    js_entry = js.get(slug, {})
    farm = js_entry.get("farm", "")

    info = {
        "name": js_entry.get("name") or fb.get("name", ""),
        "image": f"https://www.agroverse.shop{js_entry.get('image', '')}" if js_entry.get("image") else fb.get("image", ""),
        "description": fb.get("description", ""),
        "sku": js_entry.get("productId") or fb.get("sku", ""),
        "price": str(js_entry.get("price", "")),
        "weight": fb.get("weight", ""),
        "origin": f"{farm}, Brazil" if farm else fb.get("origin", ""),
        "shipment": js_entry.get("shipment", ""),
    }
    if js_entry.get("gtin"):
        info["gtin"] = js_entry["gtin"]
    return info


def generate_product_jsonld(product_slug, product_info):
    """Generate Product JSON-LD schema for a product."""
    url = f"https://www.agroverse.shop/product-page/{product_slug}"

    additional_properties = [
        {"@type": "PropertyValue", "name": "Weight", "value": product_info.get("weight", "")},
        {"@type": "PropertyValue", "name": "Origin", "value": product_info.get("origin", "")},
        {"@type": "PropertyValue", "name": "Harvest Year", "value": product_info.get("harvest", "")},
    ]

    if product_info.get("shipment"):
        additional_properties.append({
            "@type": "PropertyValue",
            "name": "Shipment ID",
            "value": product_info.get("shipment"),
        })

    offer = {
        "@type": "Offer",
        "url": url,
        "priceCurrency": "USD",
        "price": product_info.get("price", "0.00"),
        "priceValidUntil": "2025-12-31",
        "availability": "https://schema.org/InStock",
        "seller": {
            "@type": "Organization",
            "name": "Agroverse",
        },
    }

    product_schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product_info["name"],
        "image": product_info["image"],
        "description": product_info["description"],
        "sku": product_info["sku"],
        "brand": {
            "@type": "Brand",
            "name": "Agroverse",
        },
        "offers": offer,
        "additionalProperty": additional_properties,
    }

    if product_info.get("gtin"):
        product_schema["gtin14"] = product_info["gtin"]

    return json.dumps(product_schema, indent=2)


def add_jsonld_to_product_page(product_path, product_slug):
    """Add Product JSON-LD to a product page HTML file."""
    product_info = _build_product_info(product_slug)
    if not product_info.get("name"):
        print(f"[SKIP] No product data for {product_slug}")
        return False

    jsonld = generate_product_jsonld(product_slug, product_info)

    with open(product_path, "r", encoding="utf-8") as f:
        content = f.read()

    if 'application/ld+json' in content and '"@type": "Product"' in content:
        print(f"[OK] Product JSON-LD already exists in {product_slug}")
        return True

    pattern = r'(<!-- Standardized Cards CSS -->\s*<link[^>]+cards\.css[^>]*/>)'

    if re.search(pattern, content):
        def make_replacement(match):
            return match.group(0) + '\n<!-- Product Structured Data (JSON-LD) -->\n<script type="application/ld+json">\n' + jsonld + '\n</script>'

        new_content = re.sub(pattern, make_replacement, content, count=1)
        with open(product_path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"[OK] Added Product JSON-LD to {product_slug}")
        return True
    else:
        print(f"[SKIP] Could not find insertion point in {product_slug}")
        return False


def main():
    """Main function to process all product pages."""
    print("Adding Product JSON-LD to all product pages...\n")

    product_dirs = [d for d in PRODUCT_DIR.iterdir() if d.is_dir()]
    success_count = 0

    for product_dir in sorted(product_dirs):
        product_slug = product_dir.name
        index_file = product_dir / "index.html"

        if index_file.exists():
            if add_jsonld_to_product_page(index_file, product_slug):
                success_count += 1

    print(f"\nDone. Successfully processed {success_count} product pages")


if __name__ == "__main__":
    main()
