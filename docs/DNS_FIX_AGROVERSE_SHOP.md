# DNS Fix for agroverse.shop

## Problem
`agroverse.shop` cannot be reached because:
1. Domain registrar is pointing to **wrong nameservers** (truesight.me's nameservers)
2. Missing `www.agroverse.shop` CNAME record in Route53

## Current Status

### Route53 Hosted Zone
- **Zone ID**: `Z03648011LL9LLYA2X5F5`
- **Domain**: `agroverse.shop`
- **Status**: ✅ Hosted zone exists
- **Records**: 13 DNS records configured

### Current DNS Records in Route53
- ✅ `agroverse.shop` → A record → `185.199.108.153` (GitHub Pages IP)
- ✅ `agroverse.shop` → AAAA record → `2606:50c0:8000::153` (GitHub Pages IPv6)
- ✅ `beta.agroverse.shop` → CNAME → `truesightdao.github.io`
- ❌ **MISSING**: `www.agroverse.shop` → CNAME

### Route53 Nameservers (CORRECT)
These are the nameservers that Route53 assigned for agroverse.shop:
```
ns-946.awsdns-54.net
ns-176.awsdns-22.com
ns-1530.awsdns-63.org
ns-1589.awsdns-06.co.uk
```

### Current Nameservers at Registrar (WRONG)
The domain registrar currently has these nameservers (from truesight.me):
```
ns-1112.awsdns-11.org
ns-1922.awsdns-48.co.uk
ns-230.awsdns-28.com
ns-625.awsdns-14.net
```

## Fix Required

### Step 1: Remove Extra Nameserver at Domain Registrar ✅ (Almost Done)
1. Log into your domain registrar (where agroverse.shop is registered)
2. Go to DNS settings / Nameserver settings
3. Update nameservers to:
   ```
   ns-946.awsdns-54.net
   ns-176.awsdns-22.com
   ns-1530.awsdns-63.org
   ns-1589.awsdns-06.co.uk
   ```
4. Save changes
5. Wait 5-60 minutes for DNS propagation

### Step 2: Add www.agroverse.shop CNAME Record ✅ (Completed)
Add a CNAME record in Route53 pointing `www.agroverse.shop` to your GitHub Pages repository.

**Option A: Using AWS CLI**
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z03648011LL9LLYA2X5F5 \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "www.agroverse.shop",
        "Type": "CNAME",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "TrueSightDAO.github.io"}]
      }
    }]
  }'
```

**Option B: Using AWS Console**
1. Go to AWS Route53 Console
2. Select hosted zone `agroverse.shop`
3. Click "Create record"
4. Configure:
   - **Record name**: `www`
   - **Record type**: `CNAME - Routes traffic to another domain name and some AWS resources`
   - **Value**: `TrueSightDAO.github.io` (or your correct GitHub Pages URL)
   - **TTL**: `3600` (1 hour)
5. Click "Create records"

### Step 3: Verify GitHub Pages Configuration
Ensure that in your GitHub repository settings:
- Custom domain is set to `agroverse.shop` and `www.agroverse.shop`
- GitHub Pages is enabled and pointing to the correct branch/folder

## Verification

After making changes, verify with:

```bash
# Check nameservers (should show Route53 nameservers)
dig NS agroverse.shop +short

# Check A record (should resolve to GitHub Pages IP)
dig agroverse.shop +short

# Check www CNAME (should resolve to GitHub Pages)
dig www.agroverse.shop +short

# Check DNS propagation globally
dig @8.8.8.8 agroverse.shop
```

## Current Status ✅

**Route53 Configuration**: ✅ All records correctly configured
- `agroverse.shop` → A record → `185.199.108.153` (GitHub Pages)
- `www.agroverse.shop` → CNAME → `TrueSightDAO.github.io`
- Nameservers: ✅ Correct Route53 nameservers are set

**DNS Propagation**: ⏳ In progress
- Records resolve correctly when querying Route53 nameservers directly
- Global DNS propagation still in progress (can take 5-60 minutes, up to 48 hours)
- Site should work for some users already, will work for everyone once propagation completes

**Remaining Action**: 
- Remove extra nameserver `ns-1112.awsdns-11.org` from domain registrar (this is from truesight.me)

## Expected Results

After DNS propagation completes:
- `agroverse.shop` → resolves to GitHub Pages ✅
- `www.agroverse.shop` → resolves to GitHub Pages ✅
- DNS queries use Route53 nameservers ✅
- Site is accessible globally ⏳ (propagation in progress)

## Notes

- DNS propagation can take 5-60 minutes
- The A record is already correctly configured (points to GitHub Pages IP: 185.199.108.153)
- The `beta.agroverse.shop` subdomain is already working (CNAME to truesightdao.github.io)
- You may need to wait up to 48 hours for full global propagation

