#!/usr/bin/env python3
"""
Parse Wix Domains HTML file and extract DNS records to CSV

This script extracts hostname, value, and TTL from the Wix domains HTML export.
"""

import re
import csv
import json
import sys
from html.parser import HTMLParser
from urllib.parse import unquote

def extract_json_data(html_content):
    """Extract JSON data from HTML that might contain DNS records."""
    records = []
    
    # Look for JSON objects in script tags
    json_pattern = r'<script[^>]*>(.*?)</script>'
    script_matches = re.findall(json_pattern, html_content, re.DOTALL | re.IGNORECASE)
    
    for script_content in script_matches:
        # Skip if it's CSS or minified JS
        if 'function' in script_content[:100] or len(script_content) < 50:
            continue
            
        # Try to find JSON-like structures
        # Look for patterns like: "hostname": "...", "value": "...", "ttl": ...
        hostname_pattern = r'["\']hostname["\']\s*:\s*["\']([^"\']+)["\']'
        value_pattern = r'["\']value["\']\s*:\s*["\']([^"\']+)["\']'
        ttl_pattern = r'["\']ttl["\']\s*:\s*(\d+)'
        
        hostnames = re.findall(hostname_pattern, script_content, re.IGNORECASE)
        values = re.findall(value_pattern, script_content, re.IGNORECASE)
        ttls = re.findall(ttl_pattern, script_content, re.IGNORECASE)
        
        if hostnames or values:
            # Try to match them up
            for i, hostname in enumerate(hostnames):
                value = values[i] if i < len(values) else ''
                ttl = ttls[i] if i < len(ttls) else ''
                records.append({
                    'hostname': hostname,
                    'value': value,
                    'ttl': ttl
                })
    
    # Also try to parse as JSON directly
    try:
        # Look for window.__WIX_DATA__ or similar
        data_pattern = r'window\.__[A-Z_]+__\s*=\s*({.*?});'
        data_matches = re.findall(data_pattern, html_content, re.DOTALL)
        
        for data_str in data_matches:
            try:
                data = json.loads(data_str)
                # Recursively search for DNS records
                records.extend(find_dns_records(data))
            except:
                pass
    except:
        pass
    
    return records

def find_dns_records(obj, path=''):
    """Recursively search for DNS record structures in JSON."""
    records = []
    
    if isinstance(obj, dict):
        # Check if this looks like a DNS record
        if 'hostname' in obj or 'host' in obj or 'name' in obj:
            record = {
                'hostname': obj.get('hostname') or obj.get('host') or obj.get('name') or '',
                'value': obj.get('value') or obj.get('data') or obj.get('target') or '',
                'ttl': str(obj.get('ttl') or obj.get('TTL') or '')
            }
            if record['hostname'] or record['value']:
                records.append(record)
        
        # Recurse into nested objects
        for key, value in obj.items():
            records.extend(find_dns_records(value, f"{path}.{key}"))
    
    elif isinstance(obj, list):
        for item in obj:
            records.extend(find_dns_records(item, path))
    
    return records

def parse_html_file(file_path):
    """Parse the HTML file and extract DNS records."""
    with open(file_path, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    records = []
    
    # Method 1: Extract from JSON data
    records.extend(extract_json_data(html_content))
    
    # Method 2: Look for table data
    # Wix might render DNS records in tables
    table_pattern = r'<table[^>]*>(.*?)</table>'
    tables = re.findall(table_pattern, html_content, re.DOTALL | re.IGNORECASE)
    
    for table in tables:
        # Look for rows with DNS-like data
        row_pattern = r'<tr[^>]*>(.*?)</tr>'
        rows = re.findall(row_pattern, table, re.DOTALL | re.IGNORECASE)
        
        for row in rows:
            # Extract text from cells
            cell_pattern = r'<t[dh][^>]*>(.*?)</t[dh]>'
            cells = re.findall(cell_pattern, row, re.DOTALL | re.IGNORECASE)
            
            # Clean HTML tags
            cells = [re.sub(r'<[^>]+>', '', cell).strip() for cell in cells]
            
            # If we have 3+ cells, might be a DNS record
            if len(cells) >= 3:
                # Try to identify which is hostname, value, TTL
                # Common patterns: hostname, IP/domain, number
                potential_record = {
                    'hostname': cells[0] if cells[0] else '',
                    'value': cells[1] if len(cells) > 1 else '',
                    'ttl': cells[2] if len(cells) > 2 else ''
                }
                
                # Validate it looks like a DNS record
                if (potential_record['hostname'] and 
                    (potential_record['value'] or potential_record['ttl'].isdigit())):
                    records.append(potential_record)
    
    # Method 3: Look for data attributes
    data_pattern = r'data-[^=]*=["\']([^"\']+)["\']'
    data_attrs = re.findall(data_pattern, html_content, re.IGNORECASE)
    
    # Remove duplicates
    seen = set()
    unique_records = []
    for record in records:
        key = (record.get('hostname', ''), record.get('value', ''))
        if key not in seen and key != ('', ''):
            seen.add(key)
            unique_records.append(record)
    
    return unique_records

def main():
    input_file = 'assets/raw/wix_agroverse_Domains.htm'
    output_file = 'assets/raw/agroverse_wix_domains_parsed.csv'
    
    print(f"Parsing {input_file}...")
    records = parse_html_file(input_file)
    
    if not records:
        print("No DNS records found. The file might be in a different format.")
        print("Trying alternative parsing methods...")
        
        # Try to extract any structured data
        with open(input_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Look for any patterns that might be DNS-related
        # This is a fallback - might need manual inspection
        print("\nFile appears to be a Wix dashboard HTML export.")
        print("DNS records might be loaded dynamically via JavaScript.")
        print("Please check if there's a JSON export or API endpoint available.")
        return
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['hostname', 'value', 'ttl'])
        writer.writeheader()
        writer.writerows(records)
    
    print(f"\nExtracted {len(records)} DNS records")
    print(f"Output written to: {output_file}")
    
    # Print first few records as preview
    if records:
        print("\nFirst 5 records:")
        for i, record in enumerate(records[:5], 1):
            print(f"{i}. Hostname: {record['hostname']}, Value: {record['value']}, TTL: {record['ttl']}")

if __name__ == '__main__':
    main()




