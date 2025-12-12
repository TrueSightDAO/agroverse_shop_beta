#!/usr/bin/env python3
"""
Convert DNS records from JSON to CSV format

Usage:
    python3 scripts/json_to_dns_csv.py input.json [output.csv]
"""

import json
import csv
import sys
from pathlib import Path

def parse_dns_json(json_data, records=None):
    """Recursively parse JSON to find DNS records."""
    if records is None:
        records = []
    
    if isinstance(json_data, dict):
        # Check if this object looks like a DNS record
        if any(key in json_data for key in ['hostname', 'host', 'name', 'record']):
            record = {
                'hostname': json_data.get('hostname') or json_data.get('host') or json_data.get('name') or json_data.get('record') or '',
                'value': json_data.get('value') or json_data.get('data') or json_data.get('target') or json_data.get('content') or '',
                'ttl': str(json_data.get('ttl') or json_data.get('TTL') or json_data.get('ttl_seconds') or '')
            }
            
            # Also check for record type
            record_type = json_data.get('type') or json_data.get('recordType') or ''
            
            if record['hostname'] or record['value']:
                records.append(record)
        
        # Recurse into nested objects
        for value in json_data.values():
            parse_dns_json(value, records)
    
    elif isinstance(json_data, list):
        for item in json_data:
            parse_dns_json(item, records)
    
    return records

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 json_to_dns_csv.py <input.json> [output.csv]")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else input_file.replace('.json', '.csv')
    
    # Read JSON
    try:
        with open(input_file, 'r', encoding='utf-8') as f:
            json_data = json.load(f)
    except Exception as e:
        print(f"Error reading JSON file: {e}")
        sys.exit(1)
    
    # Parse DNS records
    print(f"Parsing DNS records from {input_file}...")
    records = parse_dns_json(json_data)
    
    if not records:
        print("⚠️  No DNS records found in JSON file.")
        print("\nThe JSON structure might be different. Here's a sample of the data:")
        print(json.dumps(json_data, indent=2)[:500])
        print("\nPlease check the structure and update the parser if needed.")
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
    
    print(f"\n✅ Extracted {len(unique_records)} DNS records")
    print(f"📄 Output written to: {output_file}")
    
    # Print preview
    if unique_records:
        print("\n📋 First 10 records:")
        for i, record in enumerate(unique_records[:10], 1):
            print(f"  {i}. {record['hostname']} → {record['value']} (TTL: {record['ttl']})")

if __name__ == '__main__':
    main()







