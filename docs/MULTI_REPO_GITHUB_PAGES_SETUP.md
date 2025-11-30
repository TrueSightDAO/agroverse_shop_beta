# Multi-Repository GitHub Pages Setup

## Repository Structure

You have two repositories:
1. **Production**: `TrueSightDAO/agroverse_shop_prod` → `agroverse.shop` and `www.agroverse.shop`
2. **Beta**: `TrueSightDAO/agroverse_shop_beta` → `beta.agroverse.shop`

## GitHub Pages URLs

For organization repositories, GitHub Pages URLs follow this pattern:
- **Organization Pages**: `organization.github.io` (only one per organization)
- **Project Pages**: `organization.github.io/repository-name`

However, with custom domains, you can point multiple domains to different repositories.

## DNS Configuration

### Production Domain: `agroverse.shop` and `www.agroverse.shop`

**Repository**: `TrueSightDAO/agroverse_shop_prod`

**DNS Records** (Route53):
- `agroverse.shop` → A records (4 IPs) ✅ Already configured
- `www.agroverse.shop` → CNAME → **Production repo's GitHub Pages URL**

**CNAME File** (in `agroverse_shop_prod` repository):
```
agroverse.shop
```

**GitHub Pages Settings**:
- Repository: `TrueSightDAO/agroverse_shop_prod`
- Custom domain: `agroverse.shop`
- Source: Branch (usually `main`)

### Beta Domain: `beta.agroverse.shop`

**Repository**: `TrueSightDAO/agroverse_shop_beta`

**DNS Records** (Route53):
- `beta.agroverse.shop` → CNAME → **Beta repo's GitHub Pages URL**

**CNAME File** (in `agroverse_shop_beta` repository):
```
beta.agroverse.shop
```

**GitHub Pages Settings**:
- Repository: `TrueSightDAO/agroverse_shop_beta`
- Custom domain: `beta.agroverse.shop`
- Source: Branch (usually `main`)

## Determining GitHub Pages URLs

For organization repositories, the GitHub Pages URL depends on the repository name:

### Option 1: Organization Pages (if `agroverse_shop_prod` is the org's main Pages repo)
- Production: `TrueSightDAO.github.io`
- Beta: `TrueSightDAO.github.io/agroverse_shop_beta`

### Option 2: Project Pages (each repo has its own Pages)
- Production: `TrueSightDAO.github.io/agroverse_shop_prod`
- Beta: `TrueSightDAO.github.io/agroverse_shop_beta`

### Option 3: Custom Domain (what we want)
- Production: `agroverse.shop` (custom domain)
- Beta: `beta.agroverse.shop` (custom domain)

**Important**: When using custom domains, the CNAME record should point to:
- `username.github.io` or `organization.github.io` (for organization/user Pages)
- OR the repository's Pages URL if it's a project Pages site

## Step-by-Step Setup

### Step 1: Configure Production Repository

1. **Go to**: `https://github.com/TrueSightDAO/agroverse_shop_prod/settings/pages`

2. **Enable GitHub Pages**:
   - Source: Deploy from branch
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`

3. **Add Custom Domain**:
   - Custom domain: `agroverse.shop`
   - Click "Save"
   - This will create/update the CNAME file

4. **Verify Domain** (if prompted):
   - Add the verification TXT record to Route53
   - Wait 5-10 minutes
   - Click "Verify"

### Step 2: Configure Beta Repository

1. **Go to**: `https://github.com/TrueSightDAO/agroverse_shop_beta/settings/pages`

2. **Enable GitHub Pages**:
   - Source: Deploy from branch
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`

3. **Add Custom Domain**:
   - Custom domain: `beta.agroverse.shop`
   - Click "Save"
   - This will create/update the CNAME file

4. **Verify Domain** (if prompted):
   - Add the verification TXT record to Route53
   - Wait 5-10 minutes
   - Click "Verify"

### Step 3: Update DNS Records

**For Production (`www.agroverse.shop`)**:

The CNAME should point to the production repo's GitHub Pages URL. Check what GitHub shows as the Pages URL in the repository settings.

```bash
# Update www CNAME to point to production repo
aws route53 change-resource-record-sets \
  --hosted-zone-id Z03648011LL9LLYA2X5F5 \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "www.agroverse.shop",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [{"Value": "TrueSightDAO.github.io"}]
      }
    }]
  }'
```

**Note**: If the production repo uses a project Pages URL (like `TrueSightDAO.github.io/agroverse_shop_prod`), you might need to use that instead. However, with custom domains, GitHub typically expects the CNAME to point to `username.github.io` or `organization.github.io`.

**For Beta (`beta.agroverse.shop`)**:

```bash
# Update beta CNAME to point to beta repo
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

**Important**: Both CNAMEs might point to the same `TrueSightDAO.github.io` because GitHub uses the CNAME file in each repository to determine which site to serve. The CNAME file acts as the routing mechanism.

### Step 4: Verify CNAME Files

**Production Repository** (`agroverse_shop_prod`):
- CNAME file should contain: `agroverse.shop`
- Location: Root of the repository
- Branch: The branch that GitHub Pages is deploying from

**Beta Repository** (`agroverse_shop_beta`):
- CNAME file should contain: `beta.agroverse.shop`
- Location: Root of the repository
- Branch: The branch that GitHub Pages is deploying from

## Current Configuration Check

Let me verify what the current DNS records point to and what they should point to.

