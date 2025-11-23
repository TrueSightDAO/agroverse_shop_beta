#!/usr/bin/env python3
"""
Generate Legacy Redirects from CSV

This script parses the legacy_agroverse_shop_URL_Redirects_Export.csv file
and generates a JavaScript redirect map for use in 404.html.

Usage:
    python3 scripts/generate_redirects.py path/to/legacy_agroverse_shop_URL_Redirects_Export.csv
"""

import csv
import sys
import os
from pathlib import Path
from urllib.parse import urlparse, urljoin

def normalize_path(path):
    """Normalize URL path for redirect map."""
    # Remove leading/trailing slashes, then add one leading slash
    path = path.strip().strip('/')
    return '/' + path if path else '/'

def parse_csv(csv_path):
    """Parse CSV file and extract redirect mappings."""
    redirects = {}
    
    try:
        with open(csv_path, 'r', encoding='utf-8-sig') as f:  # utf-8-sig strips BOM
            # Try to detect delimiter, default to comma
            sample = f.read(1024)
            f.seek(0)
            try:
                sniffer = csv.Sniffer()
                delimiter = sniffer.sniff(sample).delimiter
            except:
                delimiter = ','  # Default to comma
            
            reader = csv.DictReader(f, delimiter=delimiter)
            
            # Common column name variations (case-insensitive)
            source_cols = ['source', 'from', 'old_url', 'old url', 'legacy_url', 'legacy url', 'url', 'Old URL']
            dest_cols = ['destination', 'to', 'new_url', 'new url', 'target_url', 'target url', 'redirect', 'New URL']
            
            for row_num, row in enumerate(reader, start=2):
                # Find source column (case-insensitive)
                source_col = None
                row_keys_lower = {k.lower(): k for k in row.keys()}
                for col in source_cols:
                    if col.lower() in row_keys_lower:
                        source_col = row_keys_lower[col.lower()]
                        break
                
                # Find destination column (case-insensitive)
                dest_col = None
                for col in dest_cols:
                    if col.lower() in row_keys_lower:
                        dest_col = row_keys_lower[col.lower()]
                        break
                
                if not source_col or not dest_col:
                    print(f"Warning: Row {row_num} - Could not find source/destination columns")
                    print(f"  Available columns: {list(row.keys())}")
                    continue
                
                source = row[source_col].strip()
                dest = row[dest_col].strip()
                
                if not source or not dest:
                    continue
                
                # Parse URLs
                source_parsed = urlparse(source)
                dest_parsed = urlparse(dest)
                
                # Extract path (remove domain if present)
                source_path = source_parsed.path or source
                dest_path = dest_parsed.path or dest
                
                # If destination is full URL, keep it as-is
                if dest_parsed.netloc:
                    redirects[normalize_path(source_path)] = dest
                else:
                    redirects[normalize_path(source_path)] = normalize_path(dest_path)
        
        return redirects
    
    except FileNotFoundError:
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)
    except Exception as e:
        print(f"Error parsing CSV: {e}")
        sys.exit(1)

def generate_js_file(redirects, output_path):
    """Generate JavaScript redirect map file."""
    lines = [
        "/**",
        " * Legacy URL Redirects Map",
        " *",
        " * This file contains mappings from legacy agroverse.shop URLs to new URLs.",
        " * Auto-generated from legacy_agroverse_shop_URL_Redirects_Export.csv",
        " *",
        " * Format:",
        " *   '/old-url': '/new-url'           - Internal redirect",
        " *   '/old-url': 'https://external'   - External redirect",
        " *",
        " * IMPORTANT:",
        " * - All paths should start with '/'",
        " * - Use exact path matches (case-sensitive)",
        " * - Do not edit manually - regenerate from CSV instead",
        " */",
        "",
        "const LEGACY_REDIRECTS = {"
    ]
    
    # Sort redirects for easier reading
    sorted_redirects = sorted(redirects.items())
    
    for i, (old_path, new_path) in enumerate(sorted_redirects):
        # Escape quotes in paths
        old_path_escaped = old_path.replace("'", "\\'")
        new_path_escaped = new_path.replace("'", "\\'")
        
        # Use single quotes for JS strings
        comma = "," if i < len(sorted_redirects) - 1 else ""
        lines.append(f"  '{old_path_escaped}': '{new_path_escaped}'{comma}")
    
    lines.extend([
        "};",
        "",
        "// Make it globally available",
        "if (typeof window !== 'undefined') {",
        "  window.LEGACY_REDIRECTS = LEGACY_REDIRECTS;",
        "}"
    ])
    
    # Write to file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    
    print(f"✓ Generated redirect map: {output_path}")
    print(f"  Total redirects: {len(redirects)}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/generate_redirects.py <csv_file>")
        print("\nExample:")
        print("  python3 scripts/generate_redirects.py legacy_agroverse_shop_URL_Redirects_Export.csv")
        sys.exit(1)
    
    csv_path = Path(sys.argv[1])
    
    # Default output path
    script_dir = Path(__file__).parent
    repo_root = script_dir.parent
    output_path = repo_root / 'js' / 'legacy-redirects.js'
    
    print(f"Parsing CSV: {csv_path}")
    redirects = parse_csv(csv_path)
    
    if not redirects:
        print("Warning: No redirects found in CSV file")
        sys.exit(1)
    
    print(f"Found {len(redirects)} redirects")
    generate_js_file(redirects, output_path)
    
    print("\nNext steps:")
    print("1. Review js/legacy-redirects.js to verify redirects")
    print("2. Test redirects locally using 404.html")
    print("3. Commit and deploy to GitHub Pages")

if __name__ == '__main__':
    main()

