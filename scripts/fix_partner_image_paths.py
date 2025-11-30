#!/usr/bin/env python3
"""Fix incorrect og:image paths in partner pages."""

import re
from pathlib import Path
from bs4 import BeautifulSoup

BASE_DIR = Path(__file__).parent.parent

def fix_file(file_path):
    """Fix image paths in a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        soup = BeautifulSoup(content, 'html.parser')
        updated = False
        
        # Fix og:image
        og_image = soup.find('meta', property='og:image')
        if og_image:
            url = og_image.get('content', '')
            # Fix pattern: partners/partner-name/assets/partners/headers/...
            pattern = r'https://www\.agroverse\.shop/partners/[^/]+/assets/partners/headers/([^"]+)'
            match = re.search(pattern, url)
            if match:
                filename = match.group(1)
                new_url = f"https://www.agroverse.shop/assets/partners/headers/{filename}"
                og_image['content'] = new_url
                updated = True
                print(f"  Fixed og:image in {file_path.name}: {new_url}")
        
        # Fix twitter:image
        twitter_image = soup.find('meta', property='twitter:image')
        if twitter_image:
            url = twitter_image.get('content', '')
            pattern = r'https://www\.agroverse\.shop/partners/[^/]+/assets/partners/headers/([^"]+)'
            match = re.search(pattern, url)
            if match:
                filename = match.group(1)
                new_url = f"https://www.agroverse.shop/assets/partners/headers/{filename}"
                twitter_image['content'] = new_url
                updated = True
                print(f"  Fixed twitter:image in {file_path.name}: {new_url}")
        
        if updated:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(str(soup))
            return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}")
        return False

def main():
    """Main function."""
    partner_dir = BASE_DIR / 'partners'
    
    files_to_fix = []
    if partner_dir.exists():
        for partner_file in partner_dir.rglob('index.html'):
            if partner_file.name == 'index.html' and partner_file.parent.name != 'partners':
                files_to_fix.append(partner_file)
    
    print(f"Found {len(files_to_fix)} partner files to check...")
    
    fixed_count = 0
    for file_path in files_to_fix:
        if fix_file(file_path):
            fixed_count += 1
    
    print(f"\n✓ Fixed {fixed_count} files")

if __name__ == '__main__':
    main()



