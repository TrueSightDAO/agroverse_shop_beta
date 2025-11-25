#!/usr/bin/env python3
"""
Parse Wix Domains HTML file and extract DNS records to CSV

This script extracts DNS records from the HTML table structure in the Wix dashboard export.
"""

import re
import csv
from html import unescape

def convert_ttl_to_seconds(ttl_text):
    """Convert TTL text like '1 Hour', '1 Day' to seconds."""
    if not ttl_text:
        return ''
    
    ttl_text = ttl_text.strip().lower()
    
    # Common patterns
    if 'hour' in ttl_text:
        hours = re.search(r'(\d+)', ttl_text)
        if hours:
            return str(int(hours.group(1)) * 3600)
    elif 'day' in ttl_text:
        days = re.search(r'(\d+)', ttl_text)
        if days:
            return str(int(days.group(1)) * 86400)
    elif 'minute' in ttl_text:
        minutes = re.search(r'(\d+)', ttl_text)
        if minutes:
            return str(int(minutes.group(1)) * 60)
    elif ttl_text.isdigit():
        return ttl_text
    
    return ''

def extract_dns_records(html_content):
    """Extract DNS records from HTML table structure."""
    records = []
    
    # Remove script and style tags
    content = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
    content = re.sub(r'<style[^>]*>.*?</style>', '', content, flags=re.DOTALL | re.IGNORECASE)
    
    # Find all table rows with DNS data
    # Look for rows with data-table-row attribute
    row_pattern = r'<tr[^>]*data-table-row[^>]*>(.*?)</tr>'
    rows = re.findall(row_pattern, content, re.DOTALL | re.IGNORECASE)
    
    for row in rows:
        record = {'hostname': '', 'value': '', 'ttl': ''}
        
        # Extract hostname - find the innermost span with the actual text
        # The pattern needs to match the last span before closing tags
        hostname_pattern = r'data-hook="dns-records--table-content--host-name--view"[^>]*>(?:[^<]|<(?!span[^>]*>))*<span[^>]*data-hook="dns-records--table-content--host-name--view"[^>]*>([^<]+)</span>'
        hostname_match = re.search(hostname_pattern, row, re.DOTALL | re.IGNORECASE)
        if not hostname_match:
            # Try pattern that finds the last span inside the hook
            hostname_pattern2 = r'data-hook="dns-records--table-content--host-name--view"[^>]*>(?:[^<]|<(?!span[^>]*>))*<span[^>]*>([^<]+)</span>(?:[^<]|<(?!span))*</span>'
            hostname_match = re.search(hostname_pattern2, row, re.DOTALL | re.IGNORECASE)
        if not hostname_match:
            # Fallback: find all spans and take the one with the hook attribute
            spans = re.findall(r'<span[^>]*data-hook="dns-records--table-content--host-name--view"[^>]*>([^<]+)</span>', row, re.IGNORECASE)
            if spans:
                record['hostname'] = unescape(spans[0].strip())
        
        if hostname_match and not record.get('hostname'):
            record['hostname'] = unescape(hostname_match.group(1).strip())
        
        # Extract value - find the innermost span with the actual text
        value_patterns = [
            # Find span with the hook attribute directly
            r'<span[^>]*data-hook="dns-records--table-content--value--view"[^>]*>([^<]+)</span>',
            r'<span[^>]*data-hook="dns-records--table-content--mx-points-to--view"[^>]*>([^<]+)</span>',
            # Fallback: find value in nested structure
            r'data-hook="dns-records--table-content--value--view"[^>]*>(?:[^<]|<(?!span[^>]*>))*<span[^>]*>([^<]+)</span>',
            r'data-hook="dns-records--table-content--mx-points-to--view"[^>]*>(?:[^<]|<(?!span[^>]*>))*<span[^>]*>([^<]+)</span>',
        ]
        
        for pattern in value_patterns:
            value_match = re.search(pattern, row, re.DOTALL | re.IGNORECASE)
            if value_match:
                record['value'] = unescape(value_match.group(1).strip())
                break
        
        # Extract TTL
        ttl_pattern = r'data-hook="dns-records--table-content--ttl--view"[^>]*>([^<]+)</span>'
        ttl_match = re.search(ttl_pattern, row, re.DOTALL | re.IGNORECASE)
        if ttl_match:
            ttl_text = unescape(ttl_match.group(1).strip())
            record['ttl'] = convert_ttl_to_seconds(ttl_text)
        
        # Only add if we have at least hostname or value
        if record['hostname'] or record['value']:
            records.append(record)
    
    return records

def main():
    input_file = 'assets/raw/wix_agroverse_Domains.htm'
    output_file = 'assets/raw/agroverse_wix_domains_parsed.csv'
    
    print(f"Parsing {input_file}...")
    
    with open(input_file, 'r', encoding='utf-8') as f:
        html_content = f.read()
    
    records = extract_dns_records(html_content)
    
    if not records:
        print("⚠️  No DNS records found.")
        return
    
    # Remove duplicates
    seen = set()
    unique_records = []
    for record in records:
        key = (record['hostname'].lower(), record['value'].lower())
        if key not in seen:
            seen.add(key)
            unique_records.append(record)
    
    # Write to CSV
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=['hostname', 'value', 'ttl'])
        writer.writeheader()
        writer.writerows(unique_records)
    
    print(f"\n✅ Extracted {len(unique_records)} unique DNS records")
    print(f"📄 Output written to: {output_file}")
    
    # Print preview
    if unique_records:
        print("\n📋 All records:")
        for i, record in enumerate(unique_records, 1):
            ttl_display = record['ttl'] if record['ttl'] else 'N/A'
            print(f"  {i:2d}. {record['hostname']:40s} → {record['value']:50s} (TTL: {ttl_display})")

if __name__ == '__main__':
    main()

