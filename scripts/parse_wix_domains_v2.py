#!/usr/bin/env python3
"""
Parse Wix Domains HTML file and extract DNS records to CSV

This script attempts multiple methods to extract DNS records from a Wix dashboard HTML export.
"""

import re
import csv
import json
import sys
from html.parser import HTMLParser
from html import unescape

def extract_from_text_content(html_content):
    """Extract DNS records from visible text content."""
    records = []
    
    # Remove script and style tags
    content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Look for table rows that might contain DNS records
    # Pattern: rows with 3+ cells that look like DNS data
    table_pattern = r'<tr[^>]*>(.*?)</tr>'
    rows = re.findall(table_pattern, content, re.DOTALL | re.IGNORECASE)
    
    for row in rows:
        # Extract cell content
        cell_pattern = r'<t[dh][^>]*>(.*?)</t[dh]>'
        cells = re.findall(cell_pattern, row, re.DOTALL | re.IGNORECASE)
        
        # Clean HTML and decode entities
        cells = [unescape(re.sub(r'<[^>]+>', '', cell).strip()) for cell in cells]
        cells = [cell for cell in cells if cell]  # Remove empty cells
        
        # If we have 2+ cells, might be a DNS record
        if len(cells) >= 2:
            # Try to identify DNS record fields
            # Common order: Type, Hostname, Value, TTL
            # Or: Hostname, Value, TTL
            
            # Check if any cell looks like a TTL (numeric)
            ttl_idx = None
            for i, cell in enumerate(cells):
                if cell.isdigit() and int(cell) > 0 and int(cell) < 86400:
                    ttl_idx = i
                    break
            
            # Check if any cell looks like a hostname (contains dots or @)
            hostname_idx = None
            for i, cell in enumerate(cells):
                if '.' in cell or '@' in cell or cell in ['@', 'www', 'mail', 'ftp', 'cname']:
                    if hostname_idx is None:
                        hostname_idx = i
                    elif ttl_idx is None or i != ttl_idx:
                        # This might be the value instead
                        pass
            
            # Build record
            record = {'hostname': '', 'value': '', 'ttl': ''}
            
            if hostname_idx is not None:
                record['hostname'] = cells[hostname_idx]
                # Value is likely the next non-TTL cell
                for i in range(len(cells)):
                    if i != hostname_idx and i != ttl_idx:
                        if record['value']:
                            break
                        record['value'] = cells[i]
            
            if ttl_idx is not None:
                record['ttl'] = cells[ttl_idx]
            
            # If we have at least hostname or value, add it
            if record['hostname'] or record['value']:
                records.append(record)
    
    return records

def extract_from_data_attributes(html_content):
    """Extract DNS records from data attributes."""
    records = []
    
    # Look for data attributes that might contain DNS info
    # Pattern: data-hostname, data-value, data-ttl, etc.
    data_patterns = {
        'hostname': r'data-hostname=["\']([^"\']+)["\']|data-host=["\']([^"\']+)["\']|data-name=["\']([^"\']+)["\']',
        'value': r'data-value=["\']([^"\']+)["\']|data-target=["\']([^"\']+)["\']|data-data=["\']([^"\']+)["\']',
        'ttl': r'data-ttl=["\']([^"\']+)["\']|data-TTL=["\']([^"\']+)["\']'
    }
    
    # Find all elements with DNS-related data attributes
    element_pattern = r'<[^>]+(?:data-hostname|data-host|data-value|data-ttl)[^>]*>'
    elements = re.findall(element_pattern, html_content, re.IGNORECASE)
    
    for element in elements:
        record = {}
        for key, pattern in data_patterns.items():
            match = re.search(pattern, element, re.IGNORECASE)
            if match:
                record[key] = match.group(1) or match.group(2) or (match.group(3) if len(match.groups()) > 2 else '')
            else:
                record[key] = ''
        
        if record.get('hostname') or record.get('value'):
            records.append(record)
    
    return records

def extract_from_json_strings(html_content):
    """Extract DNS records from JSON strings in the HTML."""
    records = []
    
    # Look for JSON-like structures
    json_pattern = r'\{[^{}]*"(?:hostname|host|name|value|ttl|TTL)"[^{}]*\}'
    json_matches = re.findall(json_pattern, html_content, re.IGNORECASE | re.DOTALL)
    
    for json_str in json_matches:
        try:
            # Try to parse as JSON
            data = json.loads(json_str)
            
            record = {
                'hostname': data.get('hostname') or data.get('host') or data.get('name') or '',
                'value': data.get('value') or data.get('data') or data.get('target') or '',
                'ttl': str(data.get('ttl') or data.get('TTL') or '')
            }
            
            if record['hostname'] or record['value']:
                records.append(record)
        except:
            # Not valid JSON, try regex extraction
            hostname_match = re.search(r'"(?:hostname|host|name)"\s*:\s*"([^"]+)"', json_str, re.IGNORECASE)
            value_match = re.search(r'"(?:value|data|target)"\s*:\s*"([^"]+)"', json_str, re.IGNORECASE)
            ttl_match = re.search(r'"(?:ttl|TTL)"\s*:\s*(\d+)', json_str, re.IGNORECASE)
            
            if hostname_match or value_match:
                record = {
                    'hostname': hostname_match.group(1) if hostname_match else '',
                    'value': value_match.group(1) if value_match else '',
                    'ttl': ttl_match.group(1) if ttl_match else ''
                }
                records.append(record)
    
    return records

def main():
    input_file = 'assets/raw/wix_agroverse_Domains.htm'
    output_file = 'assets/raw/agroverse_wix_domains_parsed.csv'
    
    print(f"Parsing {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    all_records = []
    
    # Try multiple extraction methods
    print("Method 1: Extracting from text content...")
    records1 = extract_from_text_content(html_content)
    print(f"  Found {len(records1)} records")
    all_records.extend(records1)
    
    print("Method 2: Extracting from data attributes...")
    records2 = extract_from_data_attributes(html_content)
    print(f"  Found {len(records2)} records")
    all_records.extend(records2)
    
    print("Method 3: Extracting from JSON strings...")
    records3 = extract_from_json_strings(html_content)
    print(f"  Found {len(records3)} records")
    all_records.extend(records3)
    
    # Remove duplicates
    seen = set()
    unique_records = []
    for record in all_records:
        key = (record.get('hostname', '').lower(), record.get('value', '').lower())
        if key not in seen and key != ('', ''):
            seen.add(key)
            unique_records.append(record)
    
    if not unique_records:
        print("\n⚠️  No DNS records found in the HTML file.")
        print("\nThis appears to be a Wix dashboard page that loads DNS records dynamically.")
        print("The DNS data is likely fetched via JavaScript API calls and not embedded in the HTML.")
        print("\nSuggestions:")
        print("1. Export DNS records directly from Wix dashboard (if available)")
        print("2. Use browser DevTools to capture the API response when the page loads")
        print("3. Check if Wix provides a DNS export feature")
        print("4. Manually copy the DNS records from the dashboard")
        return
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['hostname', 'value', 'ttl'])
        writer.writeheader()
        writer.writerows(unique_records)
    
    print(f"\n✅ Extracted {len(unique_records)} unique DNS records")
    print(f"📄 Output written to: {output_file}")
    
    # Print preview
    if unique_records:
        print("\n📋 First 10 records:")
        for i, record in enumerate(unique_records[:10], 1):
            print(f"  {i}. Hostname: {record['hostname'] or '(empty)'}, "
                  f"Value: {record['value'] or '(empty)'}, "
                  f"TTL: {record['ttl'] or '(empty)'}")

if __name__ == '__main__':
    main()




