#!/usr/bin/env python3
"""
Fix blog post navigation to match homepage navigation structure.
Removes extra menu items (Mission, Shipments, Gatherings, Order History) from desktop nav
and ensures all blog posts use the same 5-item navigation as the homepage.
"""

import os
import re
from pathlib import Path

# Standard navigation items (matching homepage)
STANDARD_NAV_ITEMS = [
    ('../../index.html#home', 'Home'),
    ('../../index.html#products', 'Products'),
    ('../../cacao-journeys/index.html', 'Cacao Journeys'),
    ('../../blog/', 'Blog'),
    ('../../index.html#contact', 'Contact'),
]

def fix_navigation_in_file(file_path):
    """Fix navigation in a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Find nav section
        nav_pattern = r'(<nav[^>]*>.*?</nav>)'
        nav_match = re.search(nav_pattern, content, re.DOTALL)
        
        if not nav_match:
            return False, "No nav section found"
        
        nav_section = nav_match.group(1)
        
        # Check if it has the problematic desktop nav-links (without mobile-menu)
        desktop_nav_pattern = r'<ul class="nav-links">(.*?)</ul>'
        desktop_nav_match = re.search(desktop_nav_pattern, nav_section, re.DOTALL)
        
        if not desktop_nav_match:
            # Already correct or doesn't have desktop nav
            return False, "No desktop nav-links found (already correct or different structure)"
        
        # Build the standard navigation HTML
        nav_items_html = '\n'.join([
            f'<li><a href="{href}">{text}</a></li>'
            for href, text in STANDARD_NAV_ITEMS
        ])
        
        # Replace desktop nav-links with mobile-menu nav-links (same content)
        # Remove the desktop nav-links entirely, keep only mobile-menu
        fixed_nav_section = re.sub(
            r'<ul class="nav-links">.*?</ul>',
            '',  # Remove desktop nav-links
            nav_section,
            flags=re.DOTALL
        )
        
        # Ensure mobile-menu nav-links has correct items
        mobile_nav_pattern = r'(<ul class="nav-links mobile-menu">)(.*?)(</ul>)'
        mobile_nav_match = re.search(mobile_nav_pattern, fixed_nav_section, re.DOTALL)
        
        if mobile_nav_match:
            # Replace mobile-menu content with standard items
            fixed_nav_section = re.sub(
                mobile_nav_pattern,
                r'\1\n' + nav_items_html + '\n\3',
                fixed_nav_section,
                flags=re.DOTALL
            )
        else:
            # Add mobile-menu nav-links if it doesn't exist
            button_pattern = r'(<button[^>]*mobile-menu-toggle[^>]*>.*?</button>)'
            if re.search(button_pattern, fixed_nav_section):
                fixed_nav_section = re.sub(
                    button_pattern,
                    r'\1<ul class="nav-links mobile-menu">\n' + nav_items_html + '\n</ul>',
                    fixed_nav_section,
                    flags=re.DOTALL
                )
        
        # Replace nav section in content
        content = content.replace(nav_section, fixed_nav_section)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Fixed"
        else:
            return False, "No changes needed"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main function to fix all blog post navigation."""
    repo_root = Path(__file__).parent.parent
    post_dir = repo_root / 'post'
    
    if not post_dir.exists():
        print(f"❌ Post directory not found: {post_dir}")
        return
    
    fixed_count = 0
    skipped_count = 0
    error_count = 0
    
    # Find all blog post index.html files
    for post_file in post_dir.rglob('index.html'):
        print(f"📄 Processing: {post_file.relative_to(repo_root)}")
        fixed, message = fix_navigation_in_file(post_file)
        
        if fixed:
            print(f"  ✅ {message}")
            fixed_count += 1
        elif "Error" in message:
            print(f"  ❌ {message}")
            error_count += 1
        else:
            print(f"  ⏭️  {message}")
            skipped_count += 1
    
    print(f"\n📊 Summary:")
    print(f"  ✅ Fixed: {fixed_count}")
    print(f"  ⏭️  Skipped: {skipped_count}")
    print(f"  ❌ Errors: {error_count}")

if __name__ == '__main__':
    main()
