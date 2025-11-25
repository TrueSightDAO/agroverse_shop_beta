#!/usr/bin/env python3
"""
List all Route53 hosted zones in AWS account

This script lists all Route53 hosted zones and optionally shows DNS records for each zone.

Requirements:
    pip install boto3 python-dotenv

Setup:
    Either:
    1. Set AWS credentials in .env file:
       AWS_ACCESS_KEY_ID=your_key
       AWS_SECRET_ACCESS_KEY=your_secret
       AWS_DEFAULT_REGION=us-east-1
    
    Or:
    2. Configure AWS CLI:
       aws configure
"""

import os
import sys
import boto3
from botocore.exceptions import ClientError, NoCredentialsError

# Try to load from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

def get_aws_credentials():
    """Get AWS credentials from environment or .env file."""
    access_key = os.getenv('AWS_ACCESS_KEY_ID')
    secret_key = os.getenv('AWS_SECRET_ACCESS_KEY')
    region = os.getenv('AWS_DEFAULT_REGION') or os.getenv('AWS_REGION') or 'us-east-1'
    
    return access_key, secret_key, region

def list_route53_zones(show_records=False):
    """List all Route53 hosted zones."""
    print("=" * 70)
    print("AWS Route53 - List Hosted Zones")
    print("=" * 70)
    print()
    
    # Get credentials
    access_key, secret_key, region = get_aws_credentials()
    
    # Initialize Route53 client
    try:
        if access_key and secret_key:
            route53_client = boto3.client(
                'route53',
                aws_access_key_id=access_key,
                aws_secret_access_key=secret_key,
                region_name=region
            )
            print(f"✅ Using AWS credentials from environment")
        else:
            # Try using default credentials (from AWS CLI or IAM role)
            route53_client = boto3.client('route53', region_name=region)
            print(f"✅ Using AWS default credentials (AWS CLI or IAM role)")
        
        print(f"✅ Region: {region}")
        print()
        
    except NoCredentialsError:
        print("❌ Error: AWS credentials not found")
        print("\nPlease set AWS credentials:")
        print("  1. Add to .env file:")
        print("     AWS_ACCESS_KEY_ID=your_access_key")
        print("     AWS_SECRET_ACCESS_KEY=your_secret_key")
        print("     AWS_DEFAULT_REGION=us-east-1")
        print("\n  2. Or configure AWS CLI:")
        print("     aws configure")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error initializing Route53 client: {e}")
        sys.exit(1)
    
    # List hosted zones
    print("📋 Fetching Route53 hosted zones...")
    print()
    
    try:
        response = route53_client.list_hosted_zones()
        zones = response.get('HostedZones', [])
        
        if not zones:
            print("ℹ️  No hosted zones found in this AWS account")
            print()
            print("To create a hosted zone:")
            print("  aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)")
            return
        
        print(f"✅ Found {len(zones)} hosted zone(s)\n")
        print("=" * 70)
        print()
        
        for i, zone in enumerate(zones, 1):
            zone_id = zone['Id'].split('/')[-1]
            zone_name = zone['Name'].rstrip('.')
            record_count = zone.get('ResourceRecordSetCount', 0)
            is_private = zone.get('Config', {}).get('PrivateZone', False)
            
            print(f"{i}. Zone: {zone_name}")
            print(f"   Zone ID: {zone_id}")
            print(f"   Record Count: {record_count}")
            print(f"   Private Zone: {is_private}")
            
            # Get name servers
            try:
                zone_info = route53_client.get_hosted_zone(Id=zone_id)
                name_servers = zone_info.get('DelegationSet', {}).get('NameServers', [])
                if name_servers:
                    print(f"   Name Servers:")
                    for ns in name_servers:
                        print(f"     - {ns}")
            except ClientError as e:
                print(f"   ⚠️  Could not fetch name servers: {e}")
            
            # Optionally show DNS records
            if show_records and record_count > 0:
                print(f"\n   DNS Records:")
                try:
                    records_response = route53_client.list_resource_record_sets(
                        HostedZoneId=zone_id,
                        MaxItems='100'
                    )
                    records = records_response.get('ResourceRecordSets', [])
                    
                    for j, record in enumerate(records[:20], 1):  # Show first 20 records
                        name = record['Name'].rstrip('.')
                        record_type = record['Type']
                        ttl = record.get('TTL', 'N/A')
                        
                        # Get record values
                        values = []
                        if 'ResourceRecords' in record:
                            values = [rr['Value'] for rr in record['ResourceRecords']]
                        elif 'AliasTarget' in record:
                            values = [record['AliasTarget']['DNSName']]
                        
                        value_str = ', '.join(values[:2])  # Show first 2 values
                        if len(values) > 2:
                            value_str += f" (+{len(values)-2} more)"
                        
                        print(f"      {j:2d}. {name:40s} {record_type:5s} → {value_str:50s} (TTL: {ttl})")
                    
                    if len(records) > 20:
                        print(f"      ... and {len(records) - 20} more records")
                        
                except ClientError as e:
                    print(f"      ⚠️  Error fetching records: {e}")
            
            print()
            print("-" * 70)
            print()
        
        print("=" * 70)
        print(f"✅ Total: {len(zones)} hosted zone(s)")
        print("=" * 70)
        
    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        error_msg = e.response.get('Error', {}).get('Message', str(e))
        print(f"❌ AWS API Error ({error_code}): {error_msg}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='List Route53 hosted zones')
    parser.add_argument('--records', '-r', action='store_true',
                       help='Also show DNS records for each zone')
    args = parser.parse_args()
    
    list_route53_zones(show_records=args.records)

if __name__ == '__main__':
    main()

