#!/usr/bin/env python3
"""
Migrate DNS records to AWS Route53 using boto3

This script reads DNS records from CSV and populates them in AWS Route53.

Requirements:
    pip install boto3 python-dotenv

Setup:
    1. AWS credentials configured (via .env, AWS CLI, or IAM role)
    2. Create hosted zone in Route53 for your domain
    3. Update nameservers at your domain registrar
"""

import csv
import os
import sys
import boto3
from collections import defaultdict
from botocore.exceptions import ClientError, NoCredentialsError

# Try to load from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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
                    'ttl': int(row.get('ttl', '3600'))
                })
    return records

def determine_record_type(hostname, value):
    """Determine DNS record type based on hostname and value."""
    # MX records (Google mail servers)
    if 'aspmx' in value.lower() or ('mail' in value.lower() and 'google' in value.lower()):
        return 'MX'
    
    # TXT records (SPF, DMARC, verification)
    if value.startswith('v=') or 'include:' in value or '_dmarc' in value.lower() or 'google-site-verification' in value.lower():
        return 'TXT'
    
    # NS records (skip these - Route53 manages its own NS records)
    if 'ns' in value.lower() and ('wixdns' in value.lower() or '.net' in value.lower() or '.com' in value.lower()):
        return 'NS'
    
    # CNAME records (domain name, not IP, and not a TXT record)
    if not value.startswith('v=') and not 'include:' in value:
        # Check if it's an IP address
        parts = value.split('.')
        is_ip = len(parts) == 4 and all(part.isdigit() and 0 <= int(part) <= 255 for part in parts)
        
        if not is_ip and '.' in value:
            # Could be CNAME
            # But check if it's actually a domain name
            if not all(part.isdigit() for part in parts if part):
                return 'CNAME'
    
    # A records (IPv4)
    parts = value.split('.')
    if len(parts) == 4 and all(part.isdigit() and 0 <= int(part) <= 255 for part in parts):
        return 'A'
    
    # Default to A
    return 'A'

def get_hosted_zone_id(route53_client, domain):
    """Get Route53 hosted zone ID for the domain."""
    try:
        response = route53_client.list_hosted_zones()
        for zone in response['HostedZones']:
            # Route53 stores domain with trailing dot
            zone_name = zone['Name'].rstrip('.')
            if zone_name == domain:
                return zone['Id'].split('/')[-1]
        
        print(f"❌ No hosted zone found for {domain}")
        print("\n💡 Create a hosted zone first:")
        print(f"   aws route53 create-hosted-zone --name {domain} --caller-reference $(date +%s)")
        return None
        
    except ClientError as e:
        print(f"❌ Error listing hosted zones: {e}")
        return None

def group_records_by_name_and_type(records, domain):
    """Group records by name and type for Route53 (allows multiple values per record)."""
    grouped = defaultdict(lambda: defaultdict(list))
    
    for record in records:
        hostname = record['hostname']
        value = record['value']
        ttl = record['ttl']
        record_type = determine_record_type(hostname, value)
        
        # Skip NS records (Route53 manages these)
        if record_type == 'NS':
            continue
        
        # Normalize hostname
        if hostname == domain:
            name = domain + '.'
        elif hostname.endswith('.' + domain):
            name = hostname + '.'
        else:
            name = hostname + '.'
        
        # For MX records, add priority
        if record_type == 'MX':
            # Check if priority is already in value
            parts = value.split()
            if parts and parts[0].isdigit():
                mx_value = value  # Already has priority
            else:
                # Default priority based on server type
                if 'aspmx.l.google.com' in value:
                    priority = 10
                elif 'alt1' in value:
                    priority = 20
                elif 'alt2' in value:
                    priority = 30
                elif 'alt3' in value:
                    priority = 40
                elif 'alt4' in value:
                    priority = 50
                else:
                    priority = 10
                mx_value = f"{priority} {value}"
        else:
            mx_value = None
        
        # Store the processed value
        final_value = mx_value if mx_value else value
        grouped[name][record_type].append({
            'value': final_value,
            'ttl': ttl
        })
    
    return grouped

def create_route53_records(route53_client, zone_id, grouped_records):
    """Create DNS records in Route53, grouped by name and type."""
    changes = []
    success_count = 0
    failed_count = 0
    
    for name, types in grouped_records.items():
        for record_type, values in types.items():
            # Get TTL from first record (should be same for all)
            ttl = values[0]['ttl']
            
            # Prepare resource records
            resource_records = []
            for val in values:
                value = val['value']
                # TXT records must be quoted in Route53
                if record_type == 'TXT':
                    # Ensure value is properly quoted
                    if not (value.startswith('"') and value.endswith('"')):
                        value = f'"{value}"'
                resource_records.append({'Value': value})
            
            change = {
                'Action': 'UPSERT',
                'ResourceRecordSet': {
                    'Name': name,
                    'Type': record_type,
                    'TTL': ttl,
                    'ResourceRecords': resource_records
                }
            }
            changes.append(change)
    
    # Create records one at a time to see which ones fail
    print()
    for i, change in enumerate(changes, 1):
        name = change['ResourceRecordSet']['Name'].rstrip('.')
        record_type = change['ResourceRecordSet']['Type']
        values = [rr['Value'] for rr in change['ResourceRecordSet']['ResourceRecords']]
        value_display = values[0]
        if len(values) > 1:
            value_display += f" (+{len(values)-1} more)"
        
        print(f"   {i:2d}. Creating {name:40s} {record_type:5s} → {value_display[:50]}", end=' ... ')
        
        change_batch = {'Changes': [change]}
        
        try:
            response = route53_client.change_resource_record_sets(
                HostedZoneId=zone_id,
                ChangeBatch=change_batch
            )
            print("✅")
            success_count += 1
        except ClientError as e:
            error_code = e.response.get('Error', {}).get('Code', 'Unknown')
            error_msg = e.response.get('Error', {}).get('Message', str(e))
            print(f"❌")
            print(f"      Error: {error_code} - {error_msg[:150]}")
            failed_count += 1
    
    return success_count, failed_count

def migrate_to_route53(domain, records):
    """Migrate all DNS records to Route53."""
    print(f"\n📡 Migrating DNS records to AWS Route53 for {domain}...")
    print(f"   Found {len(records)} records in CSV\n")
    
    # Initialize Route53 client
    try:
        access_key = os.getenv('AWS_ACCESS_KEY_ID')
        secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
        region = os.getenv('AWS_DEFAULT_REGION') or os.getenv('AWS_REGION') or 'us-east-1'
        
        if access_key and secret_key:
            route53_client = boto3.client(
                'route53',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
        else:
            route53_client = boto3.client('route53', region_name=region)
    except NoCredentialsError:
        print("❌ Error: AWS credentials not found")
        print("\nPlease configure AWS credentials:")
        print("  1. Add to .env file:")
        print("     AWS_ACCESS_KEY_ID=your_key")
        print("     AWS_SECRET_ACCESS_KEY=your_secret")
        print("     AWS_DEFAULT_REGION=us-east-1")
        print("\n  2. Or configure AWS CLI: aws configure")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error initializing Route53 client: {e}")
        sys.exit(1)
    
    # Get hosted zone ID
    print("1️⃣  Finding Route53 hosted zone...")
    zone_id = get_hosted_zone_id(route53_client, domain)
    if not zone_id:
        sys.exit(1)
    print(f"   ✅ Found hosted zone: {zone_id}\n")
    
    # Group records by name and type
    print("2️⃣  Processing DNS records...")
    grouped_records = group_records_by_name_and_type(records, domain)
    
    print(f"   ✅ Grouped into {sum(len(types) for types in grouped_records.values())} unique record sets\n")
    
    # Display what will be created
    print("3️⃣  Records to create:")
    record_num = 1
    for name, types in sorted(grouped_records.items()):
        for record_type, values in sorted(types.items()):
            value_display = values[0]['value']
            if len(values) > 1:
                value_display += f" (+{len(values)-1} more)"
            print(f"   {record_num:2d}. {name.rstrip('.'):40s} {record_type:5s} → {value_display[:50]}")
            record_num += 1
    
    print()
    
    # Create records
    print("4️⃣  Creating DNS records in Route53...")
    success_count, failed_count = create_route53_records(route53_client, zone_id, grouped_records)
    
    print(f"\n📊 Migration Summary:")
    print(f"   ✅ Success: {success_count} record sets")
    print(f"   ❌ Failed: {failed_count} record sets")
    
    return success_count > 0

def main():
    csv_file = 'assets/raw/agroverse_wix_domains_parsed.csv'
    domain = 'agroverse.shop'
    
    if not os.path.exists(csv_file):
        print(f"❌ Error: CSV file not found: {csv_file}")
        print("   Run parse_wix_domains_final.py first to generate the CSV")
        sys.exit(1)
    
    # Read DNS records
    records = read_dns_records(csv_file)
    
    if not records:
        print("❌ No DNS records found in CSV file")
        sys.exit(1)
    
    print(f"📋 Found {len(records)} DNS records to migrate")
    
    # Confirm before proceeding
    print(f"\n⚠️  This will create/update DNS records in Route53 for {domain}")
    print("   Make sure you've:")
    print("   1. Created a hosted zone in Route53")
    print("   2. Updated nameservers at your domain registrar")
    confirm = input("\n   Continue? (yes/no): ")
    if confirm.lower() != 'yes':
        print("   Cancelled.")
        sys.exit(0)
    
    # Migrate records
    success = migrate_to_route53(domain, records)
    
    if success:
        print("\n✅ DNS migration completed!")
        print("\n📝 Next steps:")
        print("   1. Verify DNS records in Route53 console")
        print("   2. Update nameservers at your domain registrar to Route53 nameservers")
        print("   3. Wait for DNS propagation (usually 5-60 minutes)")
        print("   4. Test your domain to ensure everything works")
        print("   5. Monitor Route53 metrics in CloudWatch")
    else:
        print("\n❌ DNS migration failed. Please check the errors above.")
        sys.exit(1)

if __name__ == '__main__':
    main()
