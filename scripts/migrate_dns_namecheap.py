#!/usr/bin/env python3
"""
Migrate DNS records to Namecheap using their API

This script reads DNS records from CSV and populates them in Namecheap.

Requirements:
    pip install requests

Setup:
    1. Enable API access in Namecheap account
    2. Get API key and username from Namecheap
    3. Whitelist your server's IP address
    4. Set environment variables:
       export NAMECHEAP_API_USER="your_username"
       export NAMECHEAP_API_KEY="your_api_key"
       export NAMECHEAP_CLIENT_IP="your_server_ip"
"""

import csv
import os
import sys
import requests
from urllib.parse import urlencode

# Try to load from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # python-dotenv not installed, will use environment variables only

# Namecheap API endpoint
NAMECHEAP_API_URL = "https://api.namecheap.com/xml.response"

def get_namecheap_credentials():
    """Get Namecheap API credentials from .env file or environment variables."""
    username = os.getenv('NAMECHEAP_API_USER')
    api_key = os.getenv('NAMECHEAP_API_KEY')
    client_ip = os.getenv('NAMECHEAP_CLIENT_IP')
    
    if not all([username, api_key, client_ip]):
        print("❌ Error: Missing Namecheap API credentials")
        print("\nPlease add the following to your .env file:")
        print("  NAMECHEAP_API_USER=your_username")
        print("  NAMECHEAP_API_KEY=your_api_key")
        print("  NAMECHEAP_CLIENT_IP=your_server_ip")
        print("\nOr set as environment variables:")
        print("  export NAMECHEAP_API_USER='your_username'")
        print("  export NAMECHEAP_API_KEY='your_api_key'")
        print("  export NAMECHEAP_CLIENT_IP='your_server_ip'")
        sys.exit(1)
    
    return username, api_key, client_ip

def read_dns_records(csv_file):
    """Read DNS records from CSV file."""
    records = []
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row['hostname'] and row['value']:
                records.append({
                    'hostname': row['hostname'],
                    'value': row['value'],
                    'ttl': row.get('ttl', '3600')
                })
    return records

def determine_record_type(hostname, value):
    """
    Determine DNS record type based on hostname and value.
    This is a simplified version - you may need to adjust based on your records.
    """
    # MX records (value contains priority)
    if value.isdigit() or ('.' in value and any(x in value for x in ['aspmx', 'mail', 'mx'])):
        # Check if it's actually an MX record by looking at the value
        if 'aspmx' in value.lower() or 'mail' in value.lower():
            return 'MX'
    
    # CNAME records (value is a domain name, not an IP)
    if not value.replace('.', '').replace('-', '').isdigit() and '.' in value:
        # Check if it's a domain name (not an IP)
        if not all(part.isdigit() for part in value.split('.') if part):
            # Could be CNAME or TXT
            if value.startswith('v=') or 'include:' in value or '=' in value:
                return 'TXT'
            return 'CNAME'
    
    # A records (IPv4 address)
    if all(part.isdigit() for part in value.split('.') if part) and len(value.split('.')) == 4:
        return 'A'
    
    # NS records
    if 'ns' in value.lower() and '.net' in value.lower():
        return 'NS'
    
    # Default to A record
    return 'A'

def set_namecheap_dns_records(domain, records, username, api_key, client_ip):
    """
    Set DNS records in Namecheap using their API.
    
    Note: Namecheap API requires all records to be set at once.
    You need to get existing records first, then merge with new ones.
    """
    print(f"\n📡 Migrating DNS records to Namecheap for {domain}...")
    print(f"   Found {len(records)} records to migrate\n")
    
    # First, get existing records
    print("1️⃣  Fetching existing DNS records...")
    get_params = {
        'ApiUser': username,
        'ApiKey': api_key,
        'UserName': username,
        'Command': 'namecheap.domains.dns.getHosts',
        'ClientIp': client_ip,
        'SLD': domain.split('.')[0],  # Second-level domain (e.g., 'agroverse')
        'TLD': domain.split('.')[1]     # Top-level domain (e.g., 'shop')
    }
    
    try:
        response = requests.get(NAMECHEAP_API_URL, params=get_params)
        response.raise_for_status()
        
        # Parse XML response (simplified - you may want to use xml.etree.ElementTree)
        print("   ✅ Retrieved existing records")
        
        # For now, we'll set new records
        # In production, you'd merge with existing records
        
    except requests.exceptions.RequestException as e:
        print(f"   ⚠️  Could not fetch existing records: {e}")
        print("   Continuing with new records only...")
    
    # Prepare records for Namecheap API
    # Namecheap API format: HostName, RecordType, Address, MXPref, TTL
    print("\n2️⃣  Preparing records for migration...")
    
    prepared_records = []
    for i, record in enumerate(records, 1):
        record_type = determine_record_type(record['hostname'], record['value'])
        
        # Extract subdomain from hostname
        hostname = record['hostname']
        if hostname == domain:
            subdomain = '@'  # Namecheap uses '@' for root domain
        elif hostname.endswith('.' + domain):
            subdomain = hostname.replace('.' + domain, '')
        else:
            subdomain = hostname
        
        prepared_records.append({
            'HostName': subdomain,
            'RecordType': record_type,
            'Address': record['value'],
            'MXPref': '10' if record_type == 'MX' else '10',  # Default MX priority
            'TTL': record.get('ttl', '3600')
        })
        
        print(f"   {i:2d}. {subdomain:30s} {record_type:5s} → {record['value']:50s}")
    
    # Set records via Namecheap API
    print("\n3️⃣  Setting DNS records via Namecheap API...")
    
    # Note: Namecheap API requires all records in a single request
    # You need to build the request with all records
    set_params = {
        'ApiUser': username,
        'ApiKey': api_key,
        'UserName': username,
        'Command': 'namecheap.domains.dns.setHosts',
        'ClientIp': client_ip,
        'SLD': domain.split('.')[0],
        'TLD': domain.split('.')[1],
    }
    
    # Add each record (Namecheap API format)
    for i, record in enumerate(prepared_records):
        set_params[f'hostname{i+1}'] = record['HostName']
        set_params[f'recordtype{i+1}'] = record['RecordType']
        set_params[f'address{i+1}'] = record['Address']
        if record['RecordType'] == 'MX':
            set_params[f'mxpref{i+1}'] = record['MXPref']
        set_params[f'ttl{i+1}'] = record['TTL']
    
    try:
        response = requests.post(NAMECHEAP_API_URL, data=set_params)
        response.raise_for_status()
        
        # Check response for errors
        if 'ERROR' in response.text:
            print(f"   ❌ API Error: {response.text}")
            return False
        
        print("   ✅ DNS records successfully migrated!")
        return True
        
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Error setting DNS records: {e}")
        return False

def main():
    csv_file = 'assets/raw/agroverse_wix_domains_parsed.csv'
    domain = 'agroverse.shop'  # Change this to your domain
    
    if not os.path.exists(csv_file):
        print(f"❌ Error: CSV file not found: {csv_file}")
        print("   Run parse_wix_domains_final.py first to generate the CSV")
        sys.exit(1)
    
    # Get credentials
    username, api_key, client_ip = get_namecheap_credentials()
    
    # Read DNS records
    records = read_dns_records(csv_file)
    
    if not records:
        print("❌ No DNS records found in CSV file")
        sys.exit(1)
    
    print(f"📋 Found {len(records)} DNS records to migrate")
    
    # Confirm before proceeding
    print(f"\n⚠️  This will overwrite existing DNS records for {domain}")
    confirm = input("   Continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("   Cancelled.")
        sys.exit(0)
    
    # Migrate records
    success = set_namecheap_dns_records(domain, records, username, api_key, client_ip)
    
    if success:
        print("\n✅ DNS migration completed successfully!")
        print("\n📝 Next steps:")
        print("   1. Verify DNS records in Namecheap dashboard")
        print("   2. Wait for DNS propagation (can take up to 48 hours)")
        print("   3. Test your domain to ensure everything works")
    else:
        print("\n❌ DNS migration failed. Please check the errors above.")
        sys.exit(1)

if __name__ == '__main__':
    main()

