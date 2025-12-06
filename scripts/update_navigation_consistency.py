#!/usr/bin/env python3
"""
Update navigation across all pages to be consistent:
- Remove Explore/Connect dropdowns
- Make Cacao Journeys top-level
- Remove Farms and Partners from top nav (accessible via Cacao Journeys)
- Standard structure: Home | Mission | Products | Cacao Journeys | Shipments | Gatherings | Blog | Order History | Contact
"""

import re
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent

# Standard navigation structure
STANDARD_NAV = """<ul class="nav-links">
<li><a href="{home_link}">Home</a></li>
<li><a href="{mission_link}">Mission</a></li>
<li><a href="{products_link}">Products</a></li>
<li><a href="{journeys_link}">Cacao Journeys</a></li>
<li><a href="{shipments_link}">Shipments</a></li>
<li><a href="{gatherings_link}">Gatherings</a></li>
<li><a href="{blog_link}">Blog</a></li>
<li><a href="{order_history_link}">Order History</a></li>
<li><a href="{contact_link}">Contact</a></li>
</ul>"""

# Path-based link adjustments
def get_nav_links(file_path: Path) -> dict:
    """Calculate relative paths for navigation links based on file location."""
    rel_path = file_path.relative_to(BASE_DIR)
    depth = len(rel_path.parts) - 1  # -1 because index.html is the file itself
    
    if depth == 0:  # Root index.html
        return {
            'home_link': '#home',
            'mission_link': '#mission',
            'products_link': '#products',
            'journeys_link': 'cacao-journeys/index.html',
            'shipments_link': '#shipments',
            'gatherings_link': '#gatherings',
            'blog_link': 'blog/',
            'order_history_link': 'order-history/',
            'contact_link': '#contact',
        }
    elif 'cacao-journeys' in rel_path.parts:
        if depth == 1:  # cacao-journeys/index.html
            return {
                'home_link': '../index.html#home',
                'mission_link': '../index.html#mission',
                'products_link': '../index.html#products',
                'journeys_link': 'index.html',
                'shipments_link': '../index.html#shipments',
                'gatherings_link': '../index.html#gatherings',
                'blog_link': '../blog/',
                'order_history_link': '../order-history/',
                'contact_link': '../index.html#contact',
            }
        else:  # cacao-journeys/path/index.html
            return {
                'home_link': '../../index.html#home',
                'mission_link': '../../index.html#mission',
                'products_link': '../../index.html#products',
                'journeys_link': '../index.html',
                'shipments_link': '../../index.html#shipments',
                'gatherings_link': '../../index.html#gatherings',
                'blog_link': '../../blog/',
                'order_history_link': '../../order-history/',
                'contact_link': '../../index.html#contact',
            }
    else:  # Other subdirectories
        prefix = '../' * depth
        return {
            'home_link': f'{prefix}index.html#home',
            'mission_link': f'{prefix}index.html#mission',
            'products_link': f'{prefix}index.html#products',
            'journeys_link': f'{prefix}cacao-journeys/index.html',
            'shipments_link': f'{prefix}index.html#shipments',
            'gatherings_link': f'{prefix}index.html#gatherings',
            'blog_link': f'{prefix}blog/',
            'order_history_link': f'{prefix}order-history/',
            'contact_link': f'{prefix}index.html#contact',
        }

def update_navigation_in_file(file_path: Path) -> bool:
    """Update navigation in a single file. Returns True if updated."""
    try:
        content = file_path.read_text(encoding='utf-8')
        original_content = content
        
        # Find the nav section - look for nav-links ul
        nav_pattern = r'(<ul class="nav-links"[^>]*>.*?</ul>)'
        
        match = re.search(nav_pattern, content, re.DOTALL)
        if not match:
            return False  # No nav found, skip
        
        # Get the correct links for this file
        links = get_nav_links(file_path)
        new_nav = STANDARD_NAV.format(**links)
        
        # Replace the nav
        content = re.sub(nav_pattern, new_nav, content, flags=re.DOTALL)
        
        if content != original_content:
            file_path.write_text(content, encoding='utf-8')
            return True
        return False
    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return False

def main():
    """Update navigation across all HTML files."""
    html_files = list(BASE_DIR.rglob('*.html'))
    
    updated = 0
    skipped = 0
    
    for html_file in html_files:
        # Skip if it's in node_modules or other excluded dirs
        if any(part.startswith('.') for part in html_file.parts):
            continue
        
        if update_navigation_in_file(html_file):
            print(f"✅ Updated: {html_file.relative_to(BASE_DIR)}")
            updated += 1
        else:
            skipped += 1
    
    print(f"\n✅ Updated {updated} files")
    print(f"⏭️  Skipped {skipped} files (no nav found or already updated)")

if __name__ == "__main__":
    main()





