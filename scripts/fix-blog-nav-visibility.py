#!/usr/bin/env python3
"""
Fix blog post navigation visibility on desktop.
Some blog posts have CSS that hides .nav-links.mobile-menu on desktop,
which makes navigation invisible. This script fixes that.
"""

import os
import re
from pathlib import Path

def fix_nav_visibility_in_file(file_path):
    """Fix navigation visibility CSS in a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Check if it has the problematic CSS rule
        # Pattern: .nav-links.mobile-menu { display: none; } (without media query)
        problematic_pattern = r'\.nav-links\.mobile-menu\s*\{\s*display:\s*none;\s*\}'
        
        if not re.search(problematic_pattern, content):
            return False, "No problematic CSS found"
        
        # Replace with CSS that shows mobile-menu on desktop
        # This matches the homepage behavior
        replacement = """@media (min-width: 769px) {
            .nav-links.mobile-menu {
                display: flex;
            }
        }
        
        /* Hide mobile menu toggle on desktop */
        @media (min-width: 769px) {
            .mobile-menu-toggle {
                display: none;
            }
        }"""
        
        content = re.sub(problematic_pattern, replacement, content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True, "Fixed navigation visibility CSS"
        else:
            return False, "No changes made"
            
    except Exception as e:
        return False, f"Error: {str(e)}"

def main():
    """Main function to fix all blog post navigation visibility."""
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
        fixed, message = fix_nav_visibility_in_file(post_file)
        
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
