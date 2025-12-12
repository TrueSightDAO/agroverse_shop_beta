#!/usr/bin/env python3
"""
Add Google Analytics tag to all HTML files in the agroverse_shop directory.
This script will add the GA tag to the <head> section of all HTML files.
"""

import os
import re
from pathlib import Path

# Google Analytics tag to add
GA_TAG = """<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-S6EP25EHF4"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-S6EP25EHF4');
</script>"""

def has_google_analytics(content):
    """Check if the HTML already has Google Analytics tag."""
    # Check for the GA ID or gtag.js
    return 'G-S6EP25EHF4' in content or 'googletagmanager.com/gtag/js' in content

def add_ga_tag_to_file(file_path):
    """Add Google Analytics tag to a single HTML file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Skip if already has GA tag
        if has_google_analytics(content):
            print(f"  ✓ Already has Google Analytics: {file_path}")
            return False
        
        # Find the </head> tag
        head_close_match = re.search(r'</head>', content, re.IGNORECASE)
        if not head_close_match:
            print(f"  ⚠ No </head> tag found: {file_path}")
            return False
        
        # Insert GA tag before </head>
        insert_position = head_close_match.start()
        new_content = content[:insert_position] + '\n' + GA_TAG + '\n' + content[insert_position:]
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f"  ✓ Added Google Analytics: {file_path}")
        return True
        
    except Exception as e:
        print(f"  ✗ Error processing {file_path}: {e}")
        return False

def find_all_html_files(base_dir):
    """Find all HTML files in the directory."""
    html_files = []
    for root, dirs, files in os.walk(base_dir):
        # Skip node_modules and other common directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', '__pycache__']]
        
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    return html_files

def main():
    """Main function to add GA tag to all HTML files."""
    # Get the base directory (parent of scripts directory)
    script_dir = Path(__file__).parent
    base_dir = script_dir.parent
    
    print(f"Searching for HTML files in: {base_dir}")
    html_files = find_all_html_files(base_dir)
    
    print(f"\nFound {len(html_files)} HTML files")
    print("=" * 60)
    
    updated_count = 0
    skipped_count = 0
    error_count = 0
    
    for html_file in sorted(html_files):
        relative_path = os.path.relpath(html_file, base_dir)
        result = add_ga_tag_to_file(html_file)
        
        if result:
            updated_count += 1
        elif has_google_analytics(open(html_file, 'r', encoding='utf-8', errors='ignore').read()):
            skipped_count += 1
        else:
            error_count += 1
    
    print("=" * 60)
    print(f"\nSummary:")
    print(f"  ✓ Updated: {updated_count} files")
    print(f"  ⊘ Skipped (already has GA): {skipped_count} files")
    print(f"  ✗ Errors: {error_count} files")
    print(f"\nTotal processed: {len(html_files)} files")

if __name__ == '__main__':
    main()

