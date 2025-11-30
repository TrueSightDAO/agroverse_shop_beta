#!/usr/bin/env python3
"""
Test Namecheap API - List all domains and their DNS records

This script:
1. Reads Namecheap API credentials from .env file
2. Lists all domains in your Namecheap account
3. Fetches DNS records for each domain

Requirements:
    pip install python-dotenv requests
"""

import os
import sys
import requests
from dotenv import load_dotenv
from xml.etree import ElementTree as ET

# Load environment variables from .env file
load_dotenv()

# Namecheap API endpoint
NAMECHEAP_API_URL = "https://api.namecheap.com/xml.response"

def get_namecheap_credentials():
    """Get Namecheap API credentials from .env file."""
    username = os.getenv('NAMECHEAP_API_USER')
    api_key = os.getenv('NAMECHEAP_API_KEY')
    client_ip = os.getenv('NAMECHEAP_CLIENT_IP')
    
    if not all([username, api_key, client_ip]):
        print("❌ Error: Missing Namecheap API credentials in .env file")
        print("\nPlease add the following to your .env file:")
        print("  NAMECHEAP_API_USER=your_username")
        print("  NAMECHEAP_API_KEY=your_api_key")
        print("  NAMECHEAP_CLIENT_IP=your_ip_address")
        sys.exit(1)
    
    return username, api_key, client_ip

def parse_xml_response(response_text):
    """Parse Namecheap XML response."""
    try:
        root = ET.fromstring(response_text)
        return root
    except ET.ParseError as e:
        print(f"❌ Error parsing XML response: {e}")
        return None

def check_api_error(root):
    """Check if API response contains errors."""
    errors = root.findall('.//Error')
    if errors:
        error_messages = [error.text for error in errors]
        return True, error_messages
    return False, []

def list_all_domains(username, api_key, client_ip):
    """List all domains in the Namecheap account."""
    print("📋 Fetching all domains from Namecheap...\n")
    
    params = {
        'ApiUser': username,
        'ApiKey': api_key,
        'UserName': username,
        'Command': 'namecheap.domains.getList',
        'ClientIp': client_ip,
        'PageSize': 100,  # Maximum per page
        'Page': 1
    }
    
    all_domains = []
    page = 1
    
    while True:
        params['Page'] = page
        try:
            response = requests.get(NAMECHEAP_API_URL, params=params)
            response.raise_for_status()
            
            root = parse_xml_response(response.text)
            if not root:
                break
            
            # Check for errors
            has_error, error_messages = check_api_error(root)
            if has_error:
                print(f"❌ API Error: {', '.join(error_messages)}")
                break
            
            # Extract domains
            domains = root.findall('.//Domain')
            if not domains:
                break
            
            for domain in domains:
                domain_name = domain.get('Name', '')
                domain_id = domain.get('ID', '')
                is_locked = domain.get('IsLocked', 'false')
                auto_renew = domain.get('AutoRenew', 'false')
                created_date = domain.get('Created', '')
                expires_date = domain.get('Expires', '')
                
                all_domains.append({
                    'name': domain_name,
                    'id': domain_id,
                    'locked': is_locked,
                    'auto_renew': auto_renew,
                    'created': created_date,
                    'expires': expires_date
                })
            
            # Check if there are more pages
            paging = root.find('.//Paging')
            if paging is not None:
                total_domains = int(paging.get('TotalItems', 0))
                current_page = int(paging.get('CurrentPage', 1))
                total_pages = int(paging.get('TotalPages', 1))
                
                if current_page >= total_pages:
                    break
            else:
                break
            
            page += 1
            
        except requests.exceptions.RequestException as e:
            print(f"❌ Error fetching domains: {e}")
            break
    
    return all_domains

def get_dns_records(username, api_key, client_ip, domain):
    """Get DNS records for a specific domain."""
    # Split domain into SLD and TLD
    parts = domain.split('.')
    if len(parts) < 2:
        return []
    
    sld = parts[0]  # Second-level domain (e.g., 'agroverse')
    tld = '.'.join(parts[1:])  # Top-level domain (e.g., 'shop')
    
    params = {
        'ApiUser': username,
        'ApiKey': api_key,
        'UserName': username,
        'Command': 'namecheap.domains.dns.getHosts',
        'ClientIp': client_ip,
        'SLD': sld,
        'TLD': tld
    }
    
    try:
        response = requests.get(NAMECHEAP_API_URL, params=params)
        response.raise_for_status()
        
        root = parse_xml_response(response.text)
        if not root:
            return []
        
        # Check for errors
        has_error, error_messages = check_api_error(root)
        if has_error:
            print(f"      ⚠️  Error: {', '.join(error_messages)}")
            return []
        
        # Extract DNS records
        records = []
        hosts = root.findall('.//host')
        
        for host in hosts:
            hostname = host.get('Name', '')
            record_type = host.get('Type', '')
            address = host.get('Address', '')
            mx_pref = host.get('MXPref', '')
            ttl = host.get('TTL', '')
            
            records.append({
                'hostname': hostname if hostname != '@' else domain,
                'type': record_type,
                'value': address,
                'mx_pref': mx_pref,
                'ttl': ttl
            })
        
        return records
        
    except requests.exceptions.RequestException as e:
        print(f"      ❌ Error fetching DNS records: {e}")
        return []

def main():
    print("=" * 70)
    print("Namecheap API Test - List Domains and DNS Records")
    print("=" * 70)
    print()
    
    # Get credentials
    username, api_key, client_ip = get_namecheap_credentials()
    print(f"✅ Loaded credentials for user: {username}")
    print(f"✅ Client IP: {client_ip}\n")
    
    # List all domains
    domains = list_all_domains(username, api_key, client_ip)
    
    if not domains:
        print("❌ No domains found or error occurred")
        sys.exit(1)
    
    print(f"✅ Found {len(domains)} domain(s)\n")
    print("=" * 70)
    print()
    
    # For each domain, get DNS records
    for i, domain_info in enumerate(domains, 1):
        domain_name = domain_info['name']
        print(f"{i}. Domain: {domain_name}")
        print(f"   ID: {domain_info['id']}")
        print(f"   Locked: {domain_info['locked']}")
        print(f"   Auto-Renew: {domain_info['auto_renew']}")
        print(f"   Created: {domain_info['created']}")
        print(f"   Expires: {domain_info['expires']}")
        print(f"   Fetching DNS records...", end=' ')
        
        records = get_dns_records(username, api_key, client_ip, domain_name)
        
        if records:
            print(f"✅ Found {len(records)} record(s)")
            print()
            print("   DNS Records:")
            for j, record in enumerate(records, 1):
                hostname_display = record['hostname']
                if hostname_display == domain_name:
                    hostname_display = '@ (root)'
                else:
                    # Show just the subdomain part
                    if hostname_display.endswith('.' + domain_name):
                        hostname_display = hostname_display.replace('.' + domain_name, '')
                
                value_display = record['value']
                if record['type'] == 'MX' and record['mx_pref']:
                    value_display = f"{record['mx_pref']} {value_display}"
                
                print(f"      {j:2d}. {hostname_display:30s} {record['type']:5s} → {value_display:50s} (TTL: {record['ttl']})")
        else:
            print("⚠️  No DNS records found")
        
        print()
        print("-" * 70)
        print()
    
    print("=" * 70)
    print(f"✅ Test completed! Found {len(domains)} domain(s) total")
    print("=" * 70)

if __name__ == '__main__':
    main()




