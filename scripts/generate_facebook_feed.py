#!/usr/bin/env python3
"""
Generate Product Feed XML (Facebook & Google Merchant Center compatible) from products.js

This script:
1. Reads products from js/products.js
2. Generates a Google Shopping-compatible product feed XML file
3. Outputs to facebook_product_feed.xml (works for both Facebook and Google)

The feed uses Google Shopping namespace (xmlns:g="http://base.google.com/ns/1.0")
which is compatible with:
- Facebook Commerce Manager
- Google Merchant Center
- Google Shopping Ads

Required Fields:
- id (required): Unique product identifier
- title (required): Product name
- description: Product description
- link (required): Product page URL
- image_link (required): Product image URL
- availability (required): in stock / out of stock / preorder
- condition (required): new / refurbished / used
- price (required): Price with currency (e.g., "25.00 USD")
- brand: Brand name
- google_product_category: Google product category ID
- product_type: Product category/type
"""

import os
import re
import json
import xml.etree.ElementTree as ET
from xml.dom import minidom
from pathlib import Path
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
PRODUCTS_JS_FILE = BASE_DIR / 'js' / 'products.js'
OUTPUT_XML_FILE = BASE_DIR / 'facebook_product_feed.xml'
# Apex host for feeds (no www) — matches Merchant Center / public product URLs
BASE_URL = 'https://agroverse.shop'

# Google product taxonomy ID (must exist in taxonomy-with-ids.en-US.txt).
# 357 is NOT a valid category ID. Use a leaf category, e.g.:
# 4748 - Food, Beverages & Tobacco > Food Items > Candy & Chocolate
DEFAULT_GOOGLE_PRODUCT_CATEGORY = '4748'

# Live store-inventory snapshot — same SSOT the website's inventory-service.js reads.
INVENTORY_URL = 'https://raw.githubusercontent.com/TrueSightDAO/agroverse-inventory/main/store-inventory.json'
_inventory_cache = None

def load_inventory(url=INVENTORY_URL, timeout=5):
    """Fetch the store inventory snapshot. Returns {sku: qty}, or {} if unavailable."""
    global _inventory_cache
    if os.environ.get('FEED_OFFLINE') == '1':
        # Deterministic/offline mode: no network. Availability resolves to the
        # 'no snapshot row' branch, i.e. in stock. Used by CI freshness tests,
        # which must not depend on live stock levels.
        _inventory_cache = {}
        return _inventory_cache
    if _inventory_cache is not None:
        return _inventory_cache
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=timeout) as r:
            data = json.loads(r.read().decode('utf-8'))
        _inventory_cache = {str(k): int(v) for k, v in (data.get('inventory') or {}).items()}
        print(f"Loaded inventory snapshot: {len(_inventory_cache)} SKUs")
    except Exception as e:
        print(f"WARNING: inventory snapshot unavailable ({e}) — availability left at 'in stock'")
        _inventory_cache = {}
    return _inventory_cache

def resolve_availability(product_id):
    """Map a product to Google's availability values using the inventory snapshot.

    A SKU with no snapshot row is treated as 'in stock' (unknown), NOT sold out — this
    mirrors the storefront, which shows "Check availability" rather than a false
    "Out of stock" for untracked SKUs.
    """
    inv = load_inventory()
    if not inv:
        return 'in stock'
    qty = inv.get(product_id)
    if qty is None:
        return 'in stock'
    return 'in stock' if qty > 0 else 'out of stock'

def parse_products_js():
    """Parse products.js file and extract product data."""
    with open(PRODUCTS_JS_FILE, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract the PRODUCTS object using regex
    # Look for window.PRODUCTS = { ... };
    pattern = r'window\.PRODUCTS\s*=\s*({.*?});'
    match = re.search(pattern, content, re.DOTALL)
    
    if not match:
        raise ValueError("Could not find PRODUCTS object in products.js")
    
    products_str = match.group(1)
    
    # products.js also appends products via annex-style assignments that sit OUTSIDE
    # the main object literal: window.PRODUCTS['some-id'] = { ... };
    # Those were previously invisible to this parser (silently dropped from the feed).
    # Fold them into products_str so the single extraction loop below handles every one.
    annex_re = re.compile(r"window\.PRODUCTS\[['\"]([^'\"]+)['\"]\]\s*=\s*\{((?:[^{}]|\{[^{}]*\})*)\}", re.DOTALL)
    for _am in annex_re.finditer(content):
        products_str += "\n'%s': {%s}" % (_am.group(1), _am.group(2))
    
    # Use a more robust parsing approach
    products = {}
    
    # Find each product entry: 'product-id': { ... }
    # This regex handles nested objects better
    product_pattern = r"'([^']+)':\s*\{((?:[^{}]|\{[^{}]*\})*)\}"
    
    for match in re.finditer(product_pattern, products_str, re.DOTALL):
        product_id = match.group(1)
        product_data_str = match.group(2)
        
        # Extract key-value pairs, handling strings that may contain commas
        product = {}
        
        # More sophisticated field extraction
        # Handle both single and double quotes, including escaped quotes
        # Match: key: value where value can be:
        # - Single-quoted string (handling escaped quotes properly)
        # - Double-quoted string (handling escaped quotes properly)
        # - Number
        # 
        # The regex uses a non-greedy match with proper escape handling:
        # - For single quotes: match from ' to ', but allow \' inside
        # - For double quotes: match from " to ", but allow \" inside
        # - The pattern (?:[^'\\]|\\.)*? matches any char except quote/backslash OR any escaped char
        field_pattern = r"(\w+):\s*((?:'((?:[^'\\]|\\.)*?)'|\"((?:[^\"\\]|\\.)*?)\"|\d+\.?\d*))"
        
        for field_match in re.finditer(field_pattern, product_data_str):
            key = field_match.group(1)
            value_raw = field_match.group(2).strip()
            
            # Check if it's a quoted string
            if value_raw.startswith("'") and value_raw.endswith("'"):
                # Single-quoted string - get the inner content
                value = field_match.group(3) if field_match.group(3) is not None else value_raw[1:-1]
                # Unescape escaped quotes and backslashes
                # Handle \\ first, then \'
                value = value.replace("\\\\", "\x00")  # Temporary marker for double backslash
                value = value.replace("\\'", "'")      # Unescape single quotes
                value = value.replace("\x00", "\\")    # Restore double backslashes
            elif value_raw.startswith('"') and value_raw.endswith('"'):
                # Double-quoted string - get the inner content
                value = field_match.group(4) if field_match.group(4) is not None else value_raw[1:-1]
                # Unescape escaped quotes and backslashes
                value = value.replace("\\\\", "\x00")  # Temporary marker for double backslash
                value = value.replace('\\"', '"')      # Unescape double quotes
                value = value.replace("\x00", "\\")    # Restore double backslashes
            else:
                # Try to convert to number
                try:
                    value = float(value_raw) if '.' in value_raw else int(value_raw)
                except ValueError:
                    value = value_raw
            
            product[key] = value
        
        products[product_id] = product
    
    return products

def format_price(price):
    """Format price for Facebook feed (e.g., '25.00 USD')."""
    if price is None or price == 0:
        return None
    return f"{price:.2f} USD"

def get_product_url(product_id, product):
    """Generate product page URL.

    Internal product_id (cart / Stripe / g:id) often differs from the on-site URL slug
    (folder name under product-page/). Use optional productPageSlug from products.js.
    """
    slug = product.get('productPageSlug') or product_id
    return f"{BASE_URL}/product-page/{slug}/"

def get_image_url(image_path):
    """Convert relative image path to absolute URL."""
    if not image_path:
        return None
    # Remove leading slash if present (we'll add it)
    image_path = image_path.lstrip('/')
    return f"{BASE_URL}/{image_path}"

def generate_description(product):
    """Generate product description from product data."""
    name = product.get('name', '')
    farm = product.get('farm', '')
    shipment = product.get('shipment', '')
    category = product.get('category', '')
    
    parts = [name]
    if farm:
        parts.append(f"From {farm}")
    if shipment:
        parts.append(f"Shipment {shipment}")
    
    description = ". ".join(parts)
    
    # Add category-specific info
    if category == 'retail':
        description += ". Available for direct purchase."
    elif category == 'wholesale':
        description += ". Contact us for wholesale pricing."
    
    return description

def generate_xml_feed(products, include_wholesale=False):
    """Generate product feed in XML format (compatible with Facebook and Google Merchant Center).
    
    Args:
        products: Dictionary of products
        include_wholesale: If False, exclude products with price 0 (wholesale products)
                          Google Merchant Center rejects $0.00 products
    """
    # Create XML structure
    rss = ET.Element('rss', {
        'version': '2.0',
        'xmlns:g': 'http://base.google.com/ns/1.0'
    })
    
    channel = ET.SubElement(rss, 'channel')
    
    # Channel metadata
    ET.SubElement(channel, 'title').text = 'Agroverse Shop Products'
    ET.SubElement(channel, 'link').text = BASE_URL
    ET.SubElement(channel, 'description').text = 'Agroverse regenerative cacao products from Brazilian farms'
    ET.SubElement(channel, 'lastBuildDate').text = datetime.utcnow().strftime('%a, %d %b %Y %H:%M:%S +0000')
    
    # Filter products - exclude wholesale ($0 price) unless explicitly included
    filtered_products = {}
    excluded_count = 0
    
    for product_id, product in products.items():
        price = product.get('price', 0)
        try:
            price_float = float(price) if price else 0.0
        except (ValueError, TypeError):
            price_float = 0.0
        
        # Skip products with $0 price (wholesale) unless include_wholesale is True
        if not include_wholesale and price_float == 0:
            excluded_count += 1
            continue
        
        filtered_products[product_id] = product
    
    # Add products
    skipped = []
    for product_id, product in filtered_products.items():
        # Never emit a feed item whose landing page doesn't exist — a dead g:link is a
        # Merchant Center disapproval and a wasted click for the customer.
        _slug = product.get('productPageSlug') or product_id
        if not (BASE_DIR / 'product-page' / str(_slug)).is_dir():
            skipped.append((product_id, str(_slug)))
            continue
        item = ET.SubElement(channel, 'item')
        
        # Required fields (plain Unicode on .text — ElementTree escapes &, <, > for XML)
        ET.SubElement(item, 'g:id').text = str(product_id)
        ET.SubElement(item, 'g:title').text = product.get('name', '') or ''
        
        # Link (required) — slug must match live HTML path, not necessarily g:id
        product_url = get_product_url(product_id, product)
        ET.SubElement(item, 'g:link').text = product_url
        
        # Image link (required)
        image_path = product.get('image', '')
        if image_path:
            image_url = get_image_url(image_path)
            ET.SubElement(item, 'g:image_link').text = image_url
        
        # Description
        description = generate_description(product)
        ET.SubElement(item, 'g:description').text = description
        
        # Availability (required) — must match what the storefront actually shows.
        # Claiming "in stock" for a sold-out item is a Merchant Center misrepresentation
        # and can suspend the account, not just disapprove an item.
        category = product.get('category', 'retail')
        availability = resolve_availability(product_id)
        ET.SubElement(item, 'g:availability').text = availability
        
        # Price (required)
        price = product.get('price', 0)
        try:
            price_float = float(price) if price else 0.0
            if price_float > 0:
                price_str = format_price(price_float)
                ET.SubElement(item, 'g:price').text = price_str
            else:
                ET.SubElement(item, 'g:price').text = '0.00 USD'
        except (ValueError, TypeError):
            ET.SubElement(item, 'g:price').text = '0.00 USD'
        
        # Condition (required)
        ET.SubElement(item, 'g:condition').text = 'new'
        
        # Brand
        ET.SubElement(item, 'g:brand').text = 'Agroverse'
        
        # GTIN (Google strong identifier). Emit it when products.js knows it; otherwise
        # declare that no identifier exists, so items aren't disapproved for a missing GTIN.
        gtin = product.get('gtin')
        if gtin:
            ET.SubElement(item, 'g:gtin').text = str(gtin)
        else:
            ET.SubElement(item, 'g:identifier_exists').text = 'no'
        
        # Additional fields
        if product.get('farm'):
            ET.SubElement(item, 'g:custom_label_0').text = str(product.get('farm'))
        
        if product.get('shipment'):
            ET.SubElement(item, 'g:custom_label_1').text = str(product.get('shipment'))
        
        if category:
            ET.SubElement(item, 'g:product_type').text = category.title()
        
        # Google product category (predefined ID only — see DEFAULT_GOOGLE_PRODUCT_CATEGORY)
        cat = product.get('googleProductCategory') or DEFAULT_GOOGLE_PRODUCT_CATEGORY
        ET.SubElement(item, 'g:google_product_category').text = str(cat)
    
    if skipped:
        print(f"\nSkipped {len(skipped)} product(s) with no product-page directory:")
        for pid, slug in skipped:
            print(f"  • {pid} (expected product-page/{slug}/)")

    # Convert to string with pretty formatting
    xml_str = ET.tostring(rss, encoding='unicode')
    dom = minidom.parseString(xml_str)
    pretty_xml = dom.toprettyxml(indent='  ')
    
    # Remove empty lines; declare UTF-8 for special characters (en-dash, accents)
    lines = [line for line in pretty_xml.split('\n') if line.strip()]
    pretty_xml = '\n'.join(lines)
    if pretty_xml.startswith("<?xml "):
        first_nl = pretty_xml.find("\n")
        head = pretty_xml[:first_nl]
        rest = pretty_xml[first_nl:]
        if "encoding=" not in head:
            head = '<?xml version="1.0" encoding="UTF-8"?>'
        pretty_xml = head + rest
    
    # Write to file
    print(f"Writing XML feed to {OUTPUT_XML_FILE}...")
    with open(OUTPUT_XML_FILE, 'w', encoding='utf-8') as f:
        f.write(pretty_xml)
    
    print(f"✅ Generated XML feed: {OUTPUT_XML_FILE}")

def generate_facebook_feed(include_wholesale=False):
    """Generate product feed in XML format (compatible with Facebook and Google Merchant Center).
    
    Args:
        include_wholesale: If True, include wholesale products ($0 price). 
                          Default False because Google Merchant Center rejects $0.00 products.
    """
    print(f"Reading products from {PRODUCTS_JS_FILE}...")
    products = parse_products_js()
    
    print(f"Found {len(products)} total products")
    
    # Count wholesale products
    wholesale_count = sum(1 for p in products.values() 
                          if float(p.get('price', 0) or 0) == 0)
    retail_count = len(products) - wholesale_count
    
    if not include_wholesale:
        print(f"  • {retail_count} retail products (will be included)")
        print(f"  • {wholesale_count} wholesale products (will be excluded - $0 price rejected by Google)")
    else:
        print(f"  • All {len(products)} products will be included (including wholesale)")
    print()
    
    # Generate XML feed
    generate_xml_feed(products, include_wholesale=include_wholesale)
    
    # Count included products
    included_count = len(products) if include_wholesale else retail_count
    
    print(f"\n✅ Successfully generated product feed with {included_count} products")
    print(f"📄 XML file: {OUTPUT_XML_FILE}")
    print(f"🌐 Feed URL: {BASE_URL}/facebook_product_feed.xml")
    print("\nThis feed is compatible with:")
    print("  • Facebook Commerce Manager")
    print("  • Google Merchant Center")
    print("  • Google Shopping Ads")
    if not include_wholesale:
        print("\n⚠️  Note: Wholesale products ($0 price) excluded to avoid Google Merchant Center rejection")
        print("   To include them, run: python3 scripts/generate_facebook_feed.py --include-wholesale")
    print("\nNext steps:")
    print("1. Commit and push the XML file to GitHub")
    print("2. Facebook: Add data source in Commerce Manager")
    print("3. Google: Add feed in Merchant Center (Products → Feeds)")
    print(f"4. Use the feed URL: {BASE_URL}/facebook_product_feed.xml")

if __name__ == '__main__':
    import sys
    
    # Check for --include-wholesale flag
    include_wholesale = '--include-wholesale' in sys.argv or '-w' in sys.argv
    
    try:
        generate_facebook_feed(include_wholesale=include_wholesale)
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

