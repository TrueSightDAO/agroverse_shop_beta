#!/usr/bin/env python3
"""
Update og:image and twitter:image meta tags across all HTML pages
to use the page's hero/header image for social media previews.
"""

import os
import re
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin

BASE_DIR = Path('/Users/garyjob/Applications/agroverse_shop')
BASE_URL = 'https://www.agroverse.shop'

def extract_hero_image(html_content, file_path):
    """Extract hero/header image from HTML content."""
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Check for partner-hero or farm-hero sections with background-image
    hero_sections = soup.find_all(['section'], class_=re.compile(r'(partner-hero|farm-hero|journey-hero)'))
    
    for hero in hero_sections:
        style = hero.get('style', '')
        # Look for url() in style attribute
        url_match = re.search(r'url\(["\']?([^"\')]+)["\']?\)', style)
        if url_match:
            img_url = url_match.group(1)
            # Convert relative URLs to absolute
            if img_url.startswith('../../'):
                # Calculate relative path from file location
                rel_path = Path(file_path).parent
                img_path = rel_path / img_url.replace('../../', '')
                # Convert to URL path
                url_path = str(img_path).replace(str(BASE_DIR), '').lstrip('/')
                return f"{BASE_URL}/{url_path}"
            elif img_url.startswith('../'):
                rel_path = Path(file_path).parent
                img_path = rel_path / img_url.replace('../', '')
                url_path = str(img_path).replace(str(BASE_DIR), '').lstrip('/')
                return f"{BASE_URL}/{url_path}"
            elif not img_url.startswith('http'):
                # Relative path
                rel_path = Path(file_path).parent
                img_path = rel_path / img_url
                url_path = str(img_path).replace(str(BASE_DIR), '').lstrip('/')
                return f"{BASE_URL}/{url_path}"
            else:
                # Already absolute URL
                return img_url
    
    # Check CSS in style tags
    style_tags = soup.find_all('style')
    for style_tag in style_tags:
        css_content = style_tag.string or ''
        # Look for background-image in CSS
        bg_match = re.search(r'background-image:\s*url\(["\']?([^"\')]+)["\']?\)', css_content)
        if bg_match:
            img_url = bg_match.group(1)
            if not img_url.startswith('http'):
                rel_path = Path(file_path).parent
                img_path = rel_path / img_url.replace('../', '').replace('../../', '')
                url_path = str(img_path).replace(str(BASE_DIR), '').lstrip('/')
                return f"{BASE_URL}/{url_path}"
            else:
                return img_url
    
    return None

def update_meta_tags(file_path, hero_image_url):
    """Update og:image and twitter:image meta tags in HTML file."""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    updated = False
    
    # Update or add og:image
    og_image = soup.find('meta', property='og:image')
    if og_image:
        if og_image.get('content') != hero_image_url:
            og_image['content'] = hero_image_url
            updated = True
    else:
        # Add og:image after og:type or og:url
        og_type = soup.find('meta', property='og:type')
        if og_type:
            new_tag = soup.new_tag('meta', property='og:image', content=hero_image_url)
            og_type.insert_after(new_tag)
            updated = True
    
    # Update or add twitter:image
    twitter_image = soup.find('meta', property='twitter:image')
    if twitter_image:
        if twitter_image.get('content') != hero_image_url:
            twitter_image['content'] = hero_image_url
            updated = True
    else:
        # Add twitter:image after twitter:card
        twitter_card = soup.find('meta', property='twitter:card')
        if twitter_card:
            new_tag = soup.new_tag('meta', property='twitter:image', content=hero_image_url)
            twitter_card.insert_after(new_tag)
            updated = True
    
    if updated:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
        return True
    return False

def process_html_file(file_path):
    """Process a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        hero_image = extract_hero_image(content, file_path)
        
        if hero_image:
            if update_meta_tags(file_path, hero_image):
                rel_path = str(file_path).replace(str(BASE_DIR), '').lstrip('/')
                print(f"✓ Updated: {rel_path} -> {hero_image}")
                return True
            else:
                rel_path = str(file_path).replace(str(BASE_DIR), '').lstrip('/')
                print(f"  Already correct: {rel_path}")
        else:
            rel_path = str(file_path).replace(str(BASE_DIR), '').lstrip('/')
            print(f"  No hero image found: {rel_path}")
    except Exception as e:
        print(f"  Error processing {file_path}: {e}")
    
    return False

def main():
    """Main function to process all HTML files."""
    html_files = list(BASE_DIR.rglob('*.html'))
    
    print(f"Found {len(html_files)} HTML files")
    print("Processing...\n")
    
    updated_count = 0
    for html_file in html_files:
        if process_html_file(html_file):
            updated_count += 1
    
    print(f"\n✓ Updated {updated_count} files")

if __name__ == '__main__':
    main()





