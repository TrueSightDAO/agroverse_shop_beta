# DNS Migration API Options

## Overview

When migrating DNS records from Wix to your new hosting provider, you have two main API options for automatically populating DNS records.

## Option 1: Namecheap API ✅

### Pros
- **Direct Integration**: If your domain is registered with Namecheap, this is the most direct approach
- **No Additional Service**: Uses your existing registrar's DNS service
- **Simple Setup**: API key + IP whitelist
- **Cost**: Free (included with domain registration)

### Cons
- **Limited Features**: Basic DNS management (A, AAAA, CNAME, MX, TXT, NS)
- **IP Whitelist Required**: Must whitelist your server's IP address
- **Rate Limits**: May have API rate limits
- **Less Flexible**: Tied to Namecheap's infrastructure

### API Capabilities
- `domains.dns.getHosts` - Retrieve DNS host records
- `domains.dns.setHosts` - Set DNS host records
- `domains.dns.setCustom` - Set custom DNS servers

### Setup Requirements
1. Enable API access in Namecheap account
2. Get API key and username
3. Whitelist your server's IP address
4. Use Namecheap API client library

### Best For
- Domains already registered with Namecheap
- Simple DNS setups
- Cost-conscious projects
- Quick migration without additional services

---

## Option 2: AWS Route53 API ✅

### Pros
- **Enterprise-Grade**: Highly reliable, scalable DNS service
- **Advanced Features**: Health checks, weighted routing, geolocation, failover
- **No IP Whitelist**: Uses AWS IAM credentials
- **Better Integration**: Works seamlessly with other AWS services
- **Comprehensive API**: Full control over all DNS record types
- **Monitoring**: Built-in CloudWatch integration
- **Documentation**: Excellent SDK and documentation

### Cons
- **Additional Cost**: ~$0.50/month per hosted zone + $0.40 per million queries
- **AWS Account Required**: Need to set up AWS account and IAM
- **Learning Curve**: More complex setup than Namecheap
- **Overkill for Simple Sites**: May be more than needed for basic DNS

### API Capabilities
- `ChangeResourceRecordSets` - Create/update/delete DNS records
- `ListResourceRecordSets` - List all DNS records
- `GetHostedZone` - Get zone information
- Health checks, traffic policies, and more

### Setup Requirements
1. AWS account
2. IAM user with Route53 permissions
3. AWS credentials (Access Key ID + Secret Access Key)
4. Create hosted zone for your domain
5. Update nameservers at registrar

### Best For
- Production applications requiring high availability
- Complex DNS configurations
- Integration with AWS services
- Future scalability needs
- Professional/enterprise setups

---

## Recommendation

### For Agroverse Shop:

**If domain is registered with Namecheap:**
- Start with **Namecheap API** for simplicity and cost-effectiveness
- Easy migration, no additional services needed
- Can always migrate to Route53 later if needed

**If you want enterprise-grade DNS:**
- Use **AWS Route53** for better reliability and features
- Worth the small cost (~$0.50/month) for production sites
- Better integration with modern infrastructure

**Hybrid Approach:**
- Use Namecheap API for initial migration
- Migrate to Route53 later if you need advanced features

---

## Implementation Scripts

See:
- `scripts/migrate_dns_namecheap.py` - Namecheap API implementation
- `scripts/migrate_dns_route53.py` - AWS Route53 implementation

Both scripts read from `assets/raw/agroverse_wix_domains_parsed.csv` and can automatically populate DNS records.







