#!/usr/bin/env python3
"""
Script to add Product JSON-LD schema to all product pages.
Extracts product data from HTML and inserts Product structured data.
"""

import os
import re
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
PRODUCT_DIR = BASE_DIR / "product-page"

# Product data mapping (can be extended with more products)
PRODUCT_DATA = {
    "oscar-s-bahia-ceremonial-cacao": {
        "name": "Ceremonial Cacao – Oscar's Farm, Bahia Brazil, 2024 (200g)",
        "image": "https://www.agroverse.shop/assets/images/products/oscars-farm.jpeg",
        "description": "Premium ceremonial cacao from Oscar's farm in Bahia, Brazil. 200g bag with QR code traceability. Three generations of cacao wisdom with 80-year-old trees.",
        "sku": "oscar-bahia-ceremonial-cacao-200g",
        "price": "25.00",
        "weight": "200g",
        "origin": "Oscar's Farm, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL4"
    },
    "ceremonial-cacao-paulo-s-la-do-sitio-farm-2024-200g": {
        "name": "Ceremonial Cacao – La do Sitio Farm, Pará Brazil, 2024 (200g)",
        "image": "https://www.agroverse.shop/assets/images/products/la-do-sitio-farm.jpg",
        "description": "Premium ceremonial cacao from Paulo's La do Sitio farm in Pará, Brazil. 200g bag with QR code traceability. Award-winning regenerative cacao from the Amazon Rainforest.",
        "sku": "paulo-la-do-sitio-ceremonial-cacao-200g",
        "price": "25.00",
        "weight": "200g",
        "origin": "La do Sitio Farm, Pará, Brazil",
        "harvest": "2024",
        "shipment": "AGL8"
    },
    "taste-of-rainforest-200-grams-caramelized-cacao-beans": {
        "name": "Taste of Rainforest - 200 grams Caramelized Cacao Beans",
        "image": "https://www.agroverse.shop/assets/images/products/caramelized-beans.jpg",
        "description": "Caramelized cacao beans from Capela Velha Fazenda, Bahia, Brazil. 200g bag with QR code traceability. Unique caramelized processing technique.",
        "sku": "taste-of-rainforest-caramelized-beans-200g",
        "price": "25.00",
        "weight": "200g",
        "origin": "Capela Velha Fazenda, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL10"
    },
    "8-ounce-organic-cacao-nibs-from-brazil": {
        "name": "Amazon Rainforest Regenerative 8 Ounce Organic Cacao Nibs",
        "image": "https://www.agroverse.shop/assets/images/products/cacao-nibs.jpg",
        "description": "Organic cacao nibs from Oscar's farm in Bahia, Brazil. 8 oz (227g) bag with QR code traceability. Three generations of cacao wisdom.",
        "sku": "oscar-bahia-cacao-nibs-8oz",
        "price": "25.00",
        "weight": "8 oz (227g)",
        "origin": "Oscar's Farm, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL4"
    },
    "ceremonial-cacao-fazenda-santa-ana-2023-200g": {
        "name": "Ceremonial Cacao – Fazenda Santa Ana, Bahia Brazil, 2023 (200g)",
        "image": "https://www.agroverse.shop/assets/images/products/santa-ana-farm.jpg",
        "description": "Premium ceremonial cacao from Fazenda Santa Ana in Bahia, Brazil. 200g bag with QR code traceability. Part of Coopercabruca cooperative.",
        "sku": "fazenda-santa-ana-ceremonial-cacao-200g",
        "price": "25.00",
        "weight": "200g",
        "origin": "Fazenda Santa Ana, Bahia, Brazil",
        "harvest": "2023",
        "shipment": "AGL2"
    },
    "organic-criollo-cacao-beans-bahia-brazil-oscar-s-100-year-farm": {
        "name": "Organic Criollo Cacao Beans, Bahia Brazil, Oscar's 100-Year Farm",
        "image": "https://www.agroverse.shop/assets/images/products/oscars-farm.jpeg",
        "description": "Organic Criollo cacao beans from Oscar's 100-year-old farm in Bahia, Brazil. Three generations of cacao wisdom with 80-year-old trees.",
        "sku": "oscar-bahia-criollo-beans",
        "price": "25.00",
        "weight": "varies",
        "origin": "Oscar's Farm, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL4"
    },
    "organic-criollo-cacao-nibs-bahia-brazil-oscar-s-100-year-farm": {
        "name": "Organic Criollo Cacao Nibs, Bahia Brazil, Oscar's 100-Year Farm",
        "image": "https://www.agroverse.shop/assets/images/products/oscars-farm.jpeg",
        "description": "Organic Criollo cacao nibs from Oscar's 100-year-old farm in Bahia, Brazil. Three generations of cacao wisdom with 80-year-old trees.",
        "sku": "oscar-bahia-criollo-nibs",
        "price": "25.00",
        "weight": "varies",
        "origin": "Oscar's Farm, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL4"
    },
    "organic-hybrid-cacao-beans-jesus-da-deus-fazenda-bahia-per-kilogram": {
        "name": "Organic Hybrid Cacao Beans, Jesus Do Deus Fazenda, Bahia (per kilogram)",
        "image": "https://www.agroverse.shop/assets/images/products/jesus-do-deus-farm.jpg",
        "description": "Organic hybrid cacao beans from Jesus Do Deus Fazenda in Itacaré, Bahia, Brazil. Regenerative cabruca agroforestry farm.",
        "sku": "jesus-do-deus-hybrid-beans-kg",
        "price": "varies",
        "weight": "1 kg",
        "origin": "Jesus Do Deus Fazenda, Itacaré, Bahia, Brazil",
        "harvest": "2024",
        "shipment": "AGL13"
    },
    "premium-organic-cacao-beans-brazilian-amazon-rainforest-la-do-sitio-far": {
        "name": "Premium Organic Cacao Beans, Brazilian Amazon Rainforest, La do Sitio Farm",
        "image": "https://www.agroverse.shop/assets/images/products/la-do-sitio-farm.jpg",
        "description": "Premium organic cacao beans from La do Sitio farm in Pará, Amazon Rainforest, Brazil. Award-winning regenerative cacao.",
        "sku": "la-do-sitio-premium-beans",
        "price": "varies",
        "weight": "varies",
        "origin": "La do Sitio Farm, Pará, Amazon Rainforest, Brazil",
        "harvest": "2024",
        "shipment": "AGL8"
    }
}

def generate_product_jsonld(product_slug, product_info):
    """Generate Product JSON-LD schema for a product."""
    url = f"https://www.agroverse.shop/product-page/{product_slug}"
    
    # Build additional properties
    additional_properties = [
        {"@type": "PropertyValue", "name": "Weight", "value": product_info.get("weight", "")},
        {"@type": "PropertyValue", "name": "Origin", "value": product_info.get("origin", "")},
        {"@type": "PropertyValue", "name": "Harvest Year", "value": product_info.get("harvest", "")}
    ]
    
    if product_info.get("shipment"):
        additional_properties.append({
            "@type": "PropertyValue",
            "name": "Shipment ID",
            "value": product_info.get("shipment")
        })
    
    # Build offer
    offer = {
        "@type": "Offer",
        "url": url,
        "priceCurrency": "USD",
        "price": product_info.get("price", "0.00"),
        "priceValidUntil": "2025-12-31",
        "availability": "https://schema.org/InStock",
        "seller": {
            "@type": "Organization",
            "name": "Agroverse"
        }
    }
    
    # Build Product schema
    product_schema = {
        "@context": "https://schema.org/",
        "@type": "Product",
        "name": product_info["name"],
        "image": product_info["image"],
        "description": product_info["description"],
        "sku": product_info["sku"],
        "brand": {
            "@type": "Brand",
            "name": "Agroverse"
        },
        "offers": offer,
        "additionalProperty": additional_properties
    }
    
    return json.dumps(product_schema, indent=2)

def add_jsonld_to_product_page(product_path, product_slug):
    """Add Product JSON-LD to a product page HTML file."""
    if product_slug not in PRODUCT_DATA:
        print(f"⚠️  No data found for {product_slug}, skipping...")
        return False
    
    product_info = PRODUCT_DATA[product_slug]
    jsonld = generate_product_jsonld(product_slug, product_info)
    
    # Read the HTML file
    with open(product_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check if Product JSON-LD already exists
    if 'application/ld+json' in content and '"@type": "Product"' in content:
        print(f"✓ Product JSON-LD already exists in {product_slug}")
        return True
    
    # Find insertion point (after Standardized Cards CSS link, before <style>)
    pattern = r'(<!-- Standardized Cards CSS -->\s*<link[^>]+cards\.css[^>]*/>)'
    
    if re.search(pattern, content):
        # Use re.sub with a function to avoid escaping issues
        def make_replacement(match):
            return match.group(0) + '\n<!-- Product Structured Data (JSON-LD) -->\n<script type="application/ld+json">\n' + jsonld + '\n</script>'
        
        new_content = re.sub(pattern, make_replacement, content, count=1)
        
        # Write back
        with open(product_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"✓ Added Product JSON-LD to {product_slug}")
        return True
    else:
        print(f"⚠️  Could not find insertion point in {product_slug}")
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
    
    print(f"\n✓ Successfully processed {success_count} product pages")

if __name__ == "__main__":
    main()
