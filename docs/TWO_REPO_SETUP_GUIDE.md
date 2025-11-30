# Two-Repository GitHub Pages Setup Guide

## Repository Structure

- **Production**: `TrueSightDAO/agroverse_shop_prod` → `agroverse.shop` and `www.agroverse.shop`
- **Beta**: `TrueSightDAO/agroverse_shop_beta` → `beta.agroverse.shop`

## How GitHub Pages Routes Custom Domains

When you have multiple repositories with custom domains:
1. **DNS CNAME** points to the base GitHub Pages URL: `TrueSightDAO.github.io`
2. **CNAME file in each repository** tells GitHub which domain that repo serves
3. GitHub matches the incoming domain request to the repository with the matching CNAME file

## Configuration Steps

### Step 1: Production Repository Setup

**Repository**: `TrueSightDAO/agroverse_shop_prod`

1. **Enable GitHub Pages**:
   - Go to: `https://github.com/TrueSightDAO/agroverse_shop_prod/settings/pages`
   - Source: Deploy from branch
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`

2. **Add Custom Domain**:
   - Custom domain: `agroverse.shop`
   - Click "Save"
   - This creates/updates the CNAME file automatically

3. **CNAME File** (auto-generated, should contain):
   ```
   agroverse.shop
   ```

4. **Verify Domain** (if prompted):
   - GitHub will provide a TXT record for verification
   - Add to Route53 (see below)

### Step 2: Beta Repository Setup

**Repository**: `TrueSightDAO/agroverse_shop_beta`

1. **Enable GitHub Pages**:
   - Go to: `https://github.com/TrueSightDAO/agroverse_shop_beta/settings/pages`
   - Source: Deploy from branch
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`

2. **Add Custom Domain**:
   - Custom domain: `beta.agroverse.shop`
   - Click "Save"
   - This creates/updates the CNAME file automatically

3. **CNAME File** (auto-generated, should contain):
   ```
   beta.agroverse.shop
   ```

4. **Verify Domain** (if prompted):
   - GitHub will provide a TXT record for verification
   - Add to Route53 (see below)

### Step 3: Update DNS Records

**Important**: Both CNAME records should point to the same base URL: `TrueSightDAO.github.io`

**Current Issue**: There's a case mismatch:
- `www.agroverse.shop` → `TrueSightDAO.github.io` ✅ (correct)
- `beta.agroverse.shop` → `truesightdao.github.io` ❌ (should be `TrueSightDAO.github.io`)

**Fix the beta CNAME**:

```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z03648011LL9LLYA2X5F5 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "beta.agroverse.shop",
        "Type": "CNAME",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "TrueSightDAO.github.io"}]
      }
    }]
  }'
```

**DNS Configuration Summary**:
- `agroverse.shop` → A records (4 IPs) ✅ Already configured
- `www.agroverse.shop` → CNAME → `TrueSightDAO.github.io` ✅ Already correct
- `beta.agroverse.shop` → CNAME → `TrueSightDAO.github.io` ⚠️ Needs update

### Step 4: Add Verification TXT Records (If Required)

If GitHub provides verification TXT records, add them to Route53:

**For Production Domain** (`agroverse.shop`):
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z03648011LL9LLYA2X5F5 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_github-pages-verification.agroverse.shop",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "\"github-pages-verification=XXXXX\""}]
      }
    }]
  }'
```
Replace `XXXXX` with the actual verification code from GitHub.

**For Beta Domain** (`beta.agroverse.shop`):
```bash
aws route53 change-resource-record-sets \
  --hosted-zone-id Z03648011LL9LLYA2X5F5 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "_github-pages-verification.beta.agroverse.shop",
        "Type": "TXT",
        "TTL": 3600,
        "ResourceRecords": [{"Value": "\"github-pages-verification=YYYYY\""}]
      }
    }]
  }'
```
Replace `YYYYY` with the actual verification code from GitHub.

## Final Configuration Summary

### DNS Records (Route53)
| Domain | Type | Value | Status |
|--------|------|-------|--------|
| `agroverse.shop` | A | 4 GitHub Pages IPs | ✅ Configured |
| `www.agroverse.shop` | CNAME | `TrueSightDAO.github.io` | ✅ Configured |
| `beta.agroverse.shop` | CNAME | `TrueSightDAO.github.io` | ⚠️ Needs update |

### Repository CNAME Files
| Repository | CNAME File Content | Status |
|------------|-------------------|--------|
| `agroverse_shop_prod` | `agroverse.shop` | ⚠️ Needs to be set in GitHub |
| `agroverse_shop_beta` | `beta.agroverse.shop` | ⚠️ Needs to be set in GitHub |

### GitHub Pages Settings
| Repository | Custom Domain | Status |
|------------|--------------|--------|
| `agroverse_shop_prod` | `agroverse.shop` | ⚠️ Needs to be configured |
| `agroverse_shop_beta` | `beta.agroverse.shop` | ⚠️ Needs to be configured |

## Quick Action Items

1. ✅ **Fix beta CNAME DNS record** (update to `TrueSightDAO.github.io`)
2. ⚠️ **Configure production repo** (`agroverse_shop_prod`) in GitHub Pages settings
3. ⚠️ **Configure beta repo** (`agroverse_shop_beta`) in GitHub Pages settings
4. ⚠️ **Add verification TXT records** (if GitHub provides them)
5. ⏳ **Wait for verification** (10-30 minutes)

## Verification

After setup, verify:

```bash
# Check production domain
dig agroverse.shop +short
# Should return: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

# Check www CNAME
dig www.agroverse.shop CNAME +short
# Should return: TrueSightDAO.github.io

# Check beta CNAME
dig beta.agroverse.shop CNAME +short
# Should return: TrueSightDAO.github.io
```

## Troubleshooting

### "NotServedByPagesError" Still Appears

1. **Check CNAME files are committed**:
   - Both repos should have CNAME files in their root
   - Files should be committed to the branch that Pages deploys from

2. **Verify DNS propagation**:
   - Wait 24-48 hours for full global propagation
   - Check from multiple DNS servers

3. **Check GitHub Pages status**:
   - Ensure both repos have Pages enabled
   - Verify custom domains are added in Settings → Pages

4. **Case sensitivity**:
   - Ensure DNS CNAME uses consistent casing: `TrueSightDAO.github.io`
   - GitHub is case-insensitive but consistency helps

