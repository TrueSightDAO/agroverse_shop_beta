# Fixing GitHub Pages "NotServedByPagesError"

## Error Message
```
Both agroverse.shop and its alternate name are improperly configured
Domain does not resolve to the GitHub Pages server. For more information, see documentation (NotServedByPagesError).
```

## Current Status

### DNS Configuration ✅
- **agroverse.shop**: Resolves to all 4 GitHub Pages IPs correctly
- **www.agroverse.shop**: CNAME to `TrueSightDAO.github.io`
- **Site is accessible**: HTTPS works, server shows `GitHub.com`

### The Problem
GitHub Pages can't verify the domain is pointing to their servers. This is usually because:
1. Domain not properly added/verified in GitHub repository settings
2. DNS propagation delay from GitHub's verification servers
3. Domain verification TXT record not added
4. Repository mismatch (domain pointing to wrong repo)

## Solutions

### Solution 1: Verify Domain in GitHub Pages Settings

1. **Go to GitHub Repository**:
   - Navigate to `TrueSightDAO/agroverse_shop_beta` (or the repo serving the site)
   - Go to **Settings** → **Pages**

2. **Remove and Re-add Domain**:
   - If `agroverse.shop` is already listed, **remove it** (click the X)
   - Click **"Add a domain"** or **"Add custom domain"**
   - Enter: `agroverse.shop`
   - Click **"Save"**

3. **Add Verification TXT Record** (if prompted):
   - GitHub will provide a DNS TXT record like: `_github-pages-verification=xxxxx`
   - Add this TXT record to Route53:
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
   - Wait 5-10 minutes, then click **"Verify"** in GitHub

### Solution 2: Check Repository Configuration

**Important**: The domain must point to the correct GitHub Pages repository.

**Current Configuration**:
- `www.agroverse.shop` → CNAME → `TrueSightDAO.github.io`
- This means the site should be served from the `TrueSightDAO` organization's GitHub Pages

**Verify**:
1. Check if `TrueSightDAO.github.io` repository exists
2. Or check if the site is actually served from `agroverse_shop_beta` repository
3. If using a different repository, the CNAME should point to: `truesightdao.github.io` (lowercase, matching the repo owner)

### Solution 3: Wait for DNS Propagation

GitHub's verification servers might be checking from a location where DNS hasn't fully propagated yet.

**Check propagation**:
```bash
# Check from multiple DNS servers
dig @8.8.8.8 agroverse.shop +short
dig @1.1.1.1 agroverse.shop +short
dig @208.67.222.222 agroverse.shop +short
```

**Wait time**: Can take up to 24-48 hours for full global propagation.

### Solution 4: Ensure CNAME File is Committed

The CNAME file must be in the repository root and committed to the branch that GitHub Pages is deploying from.

**Check**:
```bash
git log --oneline CNAME | head -5
```

**If not committed**:
```bash
git add CNAME
git commit -m "Add CNAME file for custom domain"
git push origin main  # or your Pages branch
```

### Solution 5: Check GitHub Pages Source Branch

1. Go to **Settings** → **Pages**
2. Verify:
   - **Source**: Should be set to a branch (usually `main` or `gh-pages`)
   - **Branch**: Should be the branch containing your site files
   - **Folder**: Usually `/ (root)`

3. Ensure the CNAME file is in this branch

## Step-by-Step Fix (Recommended)

1. **Remove domain from GitHub** (if already added):
   - Settings → Pages → Custom domain → Remove `agroverse.shop`

2. **Wait 5 minutes**

3. **Add domain back**:
   - Settings → Pages → Add custom domain → Enter `agroverse.shop`
   - Click "Save"

4. **Add verification TXT record** (if GitHub provides one):
   - Copy the TXT record value from GitHub
   - Add to Route53 using AWS CLI or console
   - Wait 5-10 minutes

5. **Click "Verify" in GitHub**

6. **Wait for verification** (can take 10-30 minutes)

## Verification Commands

```bash
# Check DNS resolution
dig agroverse.shop +short
# Should return: 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153

# Check www CNAME
dig www.agroverse.shop CNAME +short
# Should return: TrueSightDAO.github.io

# Check if site is accessible
curl -I https://agroverse.shop
# Should show: server: GitHub.com

# Check GitHub Pages verification record (if added)
dig _github-pages-verification.agroverse.shop TXT +short
```

## Common Issues

1. **Wrong Repository**: Domain pointing to wrong GitHub Pages repo
   - Fix: Update CNAME record to point to correct `username.github.io` or `organization.github.io`

2. **CNAME File Missing**: CNAME file not in repository
   - Fix: Add CNAME file with `agroverse.shop` and commit

3. **Branch Mismatch**: CNAME file in wrong branch
   - Fix: Ensure CNAME is in the branch GitHub Pages is deploying from

4. **DNS Propagation**: GitHub's servers haven't seen the DNS changes yet
   - Fix: Wait 24-48 hours, or use GitHub's verification TXT record

5. **HTTPS Not Enabled**: GitHub Pages needs time to provision SSL certificate
   - Fix: Wait 24 hours after domain verification for HTTPS to be enabled

## Next Steps

1. Try Solution 1 first (remove and re-add domain in GitHub)
2. If that doesn't work, check Solution 2 (verify repository configuration)
3. If still not working, wait 24 hours for full DNS propagation
4. Check GitHub Pages status page for any service issues

