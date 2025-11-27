#!/usr/bin/env python3
"""
Fix mobile hamburger menu and preview images for partner and farm pages.
- Ensures mobile-menu-overlay exists and JavaScript is present
- Updates og:image and twitter:image to use hero/header images
- Adds og:image:width and og:image:height for better WhatsApp support
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent

# Farm hero image mappings (extract from CSS background-image)
FARM_IMAGE_MAP = {
    'oscar-bahia': 'https://raw.githubusercontent.com/TrueSightDAO/truesight_me/main/assets/shipments/agl14.avif',
    'vivi-jesus-do-deus-itacare': 'https://raw.githubusercontent.com/TrueSightDAO/truesight_me/main/assets/shipments/agl13.avif',
    'fazenda-capelavelha-bahia': 'https://www.agroverse.shop/assets/capela_velha.jpg',
    'fazenda-santa-ana-bahia': 'https://www.agroverse.shop/assets/images/farms/fazenda-santa-ana-itacare.jpg',
    'paulo-la-do-sitio-para': 'https://www.agroverse.shop/assets/images/farms/paulo_profile_photo.jpeg',
}

def extract_hero_image_from_css(html_content, file_path, soup):
    """Extract hero image URL from CSS background-image or inline styles."""
    # First, try to find inline style on partner-hero or farm-hero section
    hero_section = soup.find('section', class_=re.compile(r'(partner-hero|farm-hero)'))
    if hero_section and hero_section.get('style'):
        style = hero_section.get('style')
        # Extract url from inline style
        pattern = r'url\([\'"]?([^\'")]+)[\'"]?\)'
        match = re.search(pattern, style, re.IGNORECASE)
        if match:
            url = match.group(1)
            # Convert relative URLs to absolute
            if url.startswith('../../'):
                url = url.replace('../../', 'https://www.agroverse.shop/')
            elif url.startswith('../'):
                url = url.replace('../', 'https://www.agroverse.shop/')
            elif not url.startswith('http'):
                # Relative path - determine base from file location
                if 'partners' in str(file_path):
                    url = f"https://www.agroverse.shop/assets/partners/headers/{url.split('/')[-1]}"
                elif 'farms' in str(file_path):
                    url = f"https://www.agroverse.shop/assets/images/farms/{url.split('/')[-1]}"
            # Skip Wix URLs and other external URLs that aren't our domain
            if url.startswith('http') and 'agroverse.shop' not in url and 'raw.githubusercontent.com' not in url:
                return None
            return url
    
    # Fallback: Look for farm-hero or partner-hero background-image in CSS
    pattern = r'\.(?:farm-hero|partner-hero).*?background.*?url\([\'"]?([^\'")]+)[\'"]?\)'
    match = re.search(pattern, html_content, re.DOTALL | re.IGNORECASE)
    if match:
        url = match.group(1)
        # Skip Wix URLs
        if 'wixstatic.com' in url or 'static.wixstatic.com' in url:
            return None
        # Convert relative URLs to absolute
        if url.startswith('../../'):
            url = url.replace('../../', 'https://www.agroverse.shop/')
        elif url.startswith('../'):
            url = url.replace('../', 'https://www.agroverse.shop/')
        elif not url.startswith('http'):
            # Relative path
            if 'partners' in str(file_path):
                url = f"https://www.agroverse.shop/assets/partners/headers/{url.split('/')[-1]}"
            elif 'farms' in str(file_path):
                url = f"https://www.agroverse.shop/assets/images/farms/{url.split('/')[-1]}"
        return url
    return None

def get_image_url_for_page(file_path, soup):
    """Get the appropriate image URL for og:image."""
    file_str = str(file_path)
    
    # Check if it's a farm page
    if 'farms' in file_str:
        for farm_slug, image_url in FARM_IMAGE_MAP.items():
            if farm_slug in file_str:
                return image_url
        
        # Try to extract from CSS or inline styles
        html_content = str(soup)
        hero_image = extract_hero_image_from_css(html_content, file_path, soup)
        if hero_image:
            return hero_image
    
    # Check existing og:image
    og_image = soup.find('meta', property='og:image')
    if og_image and og_image.get('content'):
        return og_image.get('content')
    
    # Try to extract from CSS
    html_content = str(soup)
    hero_image = extract_hero_image_from_css(html_content, file_path)
    if hero_image:
        return hero_image
    
    return None

def ensure_mobile_menu_overlay(soup):
    """Ensure mobile-menu-overlay div exists before closing body tag."""
    overlay = soup.find('div', class_='mobile-menu-overlay')
    if overlay:
        return False  # Already exists
    
    # Find the closing body tag or last script tag
    body = soup.find('body')
    if not body:
        return False
    
    # Create overlay div
    overlay_div = soup.new_tag('div', attrs={'class': 'mobile-menu-overlay'})
    
    # Insert before the last script or at end of body
    scripts = body.find_all('script')
    if scripts:
        scripts[-1].insert_after(overlay_div)
    else:
        body.append(overlay_div)
    
    return True

def ensure_mobile_menu_js(soup):
    """Ensure mobile menu JavaScript includes overlay handling."""
    scripts = soup.find_all('script')
    
    for script in scripts:
        if script.string and 'mobile-menu-toggle' in script.string:
            # Check if overlay handling is present
            if 'mobile-menu-overlay' in script.string:
                return False  # Already has overlay handling
            
            # Add overlay handling to existing script
            script_content = script.string
            
            # Check if overlay variable is declared
            if 'const overlay' not in script_content and 'let overlay' not in script_content:
                # Add overlay variable after menuToggle
                script_content = script_content.replace(
                    "const mobileMenu = document.querySelector('.mobile-menu');",
                    "const mobileMenu = document.querySelector('.mobile-menu');\n        const overlay = document.querySelector('.mobile-menu-overlay');"
                )
            
            # Add overlay toggle in click handler
            if 'overlay.classList.toggle' not in script_content:
                # Find the menu toggle click handler and add overlay toggle
                pattern = r"(mobileMenu\.classList\.toggle\('active'\);)"
                replacement = r"\1\n                \n                if (overlay) {\n                    overlay.classList.toggle('active');\n                }"
                script_content = re.sub(pattern, replacement, script_content)
            
            # Add overlay click handler to close menu
            if 'overlay.addEventListener' not in script_content:
                # Add after the menu toggle event listener
                pattern = r"(// Close menu when clicking overlay|// Prevent body scroll)"
                replacement = r"// Close menu when clicking overlay\n            if (overlay) {\n                overlay.addEventListener('click', function() {\n                    menuToggle.setAttribute('aria-expanded', 'false');\n                    mobileMenu.classList.remove('active');\n                    overlay.classList.remove('active');\n                    document.body.style.overflow = '';\n                });\n            }\n            \n            \1"
                script_content = re.sub(pattern, replacement, script_content)
            
            script.string = script_content
            return True
    
    return False

def update_preview_images(soup, image_url):
    """Update og:image and twitter:image with proper dimensions."""
    if not image_url:
        return False
    
    updated = False
    
    # Update og:image
    og_image = soup.find('meta', property='og:image')
    if og_image:
        if og_image.get('content') != image_url:
            og_image['content'] = image_url
            updated = True
    else:
        # Create og:image meta tag
        og_type = soup.find('meta', property='og:type')
        if og_type:
            new_meta = soup.new_tag('meta', attrs={'property': 'og:image', 'content': image_url})
            og_type.insert_after(new_meta)
            updated = True
    
    # Add og:image:width and og:image:height (WhatsApp prefers 1200x630)
    og_image_width = soup.find('meta', property='og:image:width')
    if not og_image_width:
        og_image_meta = soup.find('meta', property='og:image')
        if og_image_meta:
            new_meta = soup.new_tag('meta', attrs={'property': 'og:image:width', 'content': '1200'})
            og_image_meta.insert_after(new_meta)
            new_meta = soup.new_tag('meta', attrs={'property': 'og:image:height', 'content': '630'})
            og_image_meta.insert_after(new_meta)
            updated = True
    
    # Update twitter:image
    twitter_image = soup.find('meta', property='twitter:image')
    if twitter_image:
        if twitter_image.get('content') != image_url:
            twitter_image['content'] = image_url
            updated = True
    else:
        # Create twitter:image meta tag
        twitter_card = soup.find('meta', property='twitter:card')
        if twitter_card:
            new_meta = soup.new_tag('meta', attrs={'property': 'twitter:image', 'content': image_url})
            twitter_card.insert_after(new_meta)
            updated = True
    
    return updated

def fix_file(file_path):
    """Fix a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        changes_made = False
        
        # Fix mobile menu overlay
        if ensure_mobile_menu_overlay(soup):
            changes_made = True
            print(f"  ✓ Added mobile-menu-overlay to {file_path.name}")
        
        # Fix mobile menu JavaScript
        if ensure_mobile_menu_js(soup):
            changes_made = True
            print(f"  ✓ Updated mobile menu JavaScript in {file_path.name}")
        
        # Fix preview images
        image_url = get_image_url_for_page(file_path, soup)
        if image_url and update_preview_images(soup, image_url):
            changes_made = True
            print(f"  ✓ Updated preview images in {file_path.name} to {image_url}")
        
        if changes_made:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}")
        return False

def main():
    """Main function to fix all partner and farm pages."""
    partner_dir = BASE_DIR / 'partners'
    farm_dir = BASE_DIR / 'farms'
    journey_dir = BASE_DIR / 'cacao-journeys'
    
    files_to_fix = []
    
    # Find all partner pages
    if partner_dir.exists():
        for partner_file in partner_dir.rglob('index.html'):
            if partner_file.name == 'index.html' and partner_file.parent.name != 'partners':
                files_to_fix.append(partner_file)
    
    # Find all farm pages
    if farm_dir.exists():
        for farm_file in farm_dir.rglob('index.html'):
            if farm_file.name == 'index.html' and farm_file.parent.name != 'farms':
                files_to_fix.append(farm_file)
    
    # Find journey pages
    if journey_dir.exists():
        for journey_file in journey_dir.rglob('index.html'):
            files_to_fix.append(journey_file)
    
    print(f"Found {len(files_to_fix)} files to process...")
    
    fixed_count = 0
    for file_path in files_to_fix:
        if fix_file(file_path):
            fixed_count += 1
    
    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()

