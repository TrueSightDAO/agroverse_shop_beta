#!/usr/bin/env python3
"""
Script to update all HTML files to use conditional Google Analytics loader.
Replaces inline Google Analytics code with a script tag that loads js/google-analytics.js
"""

import os
import re
from pathlib import Path

# Pattern to match Google Analytics code block
GA_PATTERN = re.compile(
    r'<!-- Google tag \(gtag\.js\) -->\s*'
    r'<script async src="https://www\.googletagmanager\.com/gtag/js\?id=G-S6EP25EHF4"></script>\s*'
    r'<script>\s*'
    r'window\.dataLayer = window\.dataLayer \|\| \[\];\s*'
    r'function gtag\(\)\{dataLayer\.push\(arguments\);\}\s*'
    r'gtag\(\'js\', new Date\(\)\);\s*'
    r'gtag\(\'config\', \'G-S6EP25EHF4\'\);\s*'
    r'</script>',
    re.MULTILINE | re.DOTALL
)

# Replacement script tag (will be adjusted per file based on relative path)
REPLACEMENT_TEMPLATE = '''<!-- Google Analytics - Only loads on production (www.agroverse.shop) -->
<script src="{relative_path}js/google-analytics.js"></script>'''

def calculate_relative_path(file_path):
    """Calculate relative path to js/google-analytics.js from the HTML file location."""
    # Get the directory containing the HTML file
    file_dir = Path(file_path).parent
    
    # Count how many levels deep (excluding the root)
    parts = file_dir.parts
    if len(parts) == 0 or (len(parts) == 1 and parts[0] == '.'):
        return ''  # Root level
    
    # Build relative path (go up one level for each directory)
    depth = len([p for p in parts if p != '.'])
    return '../' * depth

def update_file(file_path):
    """Update a single HTML file to use conditional GA loader."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check if file contains Google Analytics code
        if 'googletagmanager.com/gtag/js' not in content:
            return False
        
        # Calculate relative path to js/google-analytics.js
        relative_path = calculate_relative_path(file_path)
        
        # Create replacement
        replacement = REPLACEMENT_TEMPLATE.format(relative_path=relative_path)
        
        # Try to replace using regex pattern first
        new_content = GA_PATTERN.sub(replacement, content)
        
        # If pattern didn't match, try a more flexible approach
        if new_content == content:
            # Try replacing line by line
            lines = content.split('\n')
            new_lines = []
            skip_next = False
            skip_script = False
            
            for i, line in enumerate(lines):
                if '<!-- Google tag (gtag.js) -->' in line:
                    # Replace with our script tag
                    new_lines.append('<!-- Google Analytics - Only loads on production (www.agroverse.shop) -->')
                    new_lines.append(f'<script src="{relative_path}js/google-analytics.js"></script>')
                    skip_next = True
                    skip_script = True
                    continue
                elif skip_next and 'googletagmanager.com/gtag/js' in line:
                    skip_next = False
                    continue
                elif skip_script and '<script>' in line and 'window.dataLayer' in lines[i+1] if i+1 < len(lines) else False:
                    skip_script = True
                    continue
                elif skip_script and ('window.dataLayer' in line or 
                                     'function gtag' in line or 
                                     "gtag('js', new Date())" in line or
                                     "gtag('config', 'G-S6EP25EHF4')" in line):
                    continue
                elif skip_script and '</script>' in line:
                    skip_script = False
                    continue
                else:
                    new_lines.append(line)
            
            new_content = '\n'.join(new_lines)
        
        # Only write if content changed
        if new_content != content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            return True
        
        return False
    except Exception as e:
        print(f"  ✗ Error updating {file_path}: {e}")
        return False

def main():
    """Main function to update all HTML files."""
    print("Updating Google Analytics in all HTML files...\n")
    
    # Find all HTML files
    html_files = []
    for root, dirs, files in os.walk('.'):
        # Skip node_modules and .git directories
        dirs[:] = [d for d in dirs if d not in ['node_modules', '.git']]
        
        for file in files:
            if file.endswith('.html'):
                html_files.append(os.path.join(root, file))
    
    updated_count = 0
    skipped_count = 0
    
    for file_path in sorted(html_files):
        if update_file(file_path):
            print(f"✓ Updated: {file_path}")
            updated_count += 1
        else:
            skipped_count += 1
    
    print(f"\nDone! Updated {updated_count} files, skipped {skipped_count} files.")

if __name__ == '__main__':
    main()
