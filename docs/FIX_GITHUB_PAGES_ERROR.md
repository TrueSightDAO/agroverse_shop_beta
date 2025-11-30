# Fix: GitHub Pages "NotServedByPagesError" for agroverse.shop

## Error
```
Both agroverse.shop and its alternate name are improperly configured
Domain does not resolve to the GitHub Pages server. (NotServedByPagesError)
```

## Root Cause
GitHub Pages can't verify that `agroverse.shop` is pointing to their servers. This is usually because:
1. Domain not properly added/verified in GitHub repository settings
2. CNAME file not committed to the repository
3. Domain verification TXT record missing
4. DNS propagation delay from GitHub's verification servers

## Current Status ✅
- **DNS Records**: All correctly configured in Route53
- **Site Accessible**: `https://agroverse.shop` works and shows `server: GitHub.com`
- **A Records**: All 4 GitHub Pages IPs configured
- **www CNAME**: Points to `TrueSightDAO.github.io`

## Step-by-Step Fix

### Step 1: Commit and Push CNAME File

The CNAME file must be in the repository and committed to the branch that GitHub Pages deploys from.

```bash
# Check current status
git status CNAME

# If not committed, add and commit it
git add CNAME
git commit -m "Add CNAME file for agroverse.shop custom domain"
git push origin main  # or your Pages branch (check GitHub Settings → Pages)
```

**Important**: The CNAME file should contain only:
```
agroverse.shop
```
(No `www`, no trailing slash, no other text)

### Step 2: Configure Domain in GitHub Repository Settings

1. **Go to GitHub Repository**:
   - Navigate to: `https://github.com/TrueSightDAO/agroverse_shop_beta`
   - Click **Settings** tab
   - Click **Pages** in the left sidebar

2. **Remove Existing Domain** (if present):
   - Under "Custom domain", if `agroverse.shop` is listed
   - Click the **X** or **Remove** button next to it
   - Confirm removal
   - Wait 2-3 minutes

3. **Add Domain**:
   - Click **"Add a domain"** or enter `agroverse.shop` in the custom domain field
   - Click **"Save"**
   - GitHub will attempt to verify the domain

### Step 3: Add Domain Verification TXT Record (If Required)

If GitHub provides a verification TXT record:

1. **Copy the TXT Record** from GitHub:
   - It will look like: `_github-pages-verification.agroverse.shop` → `"github-pages-verification=XXXXX"`

2. **Add to Route53**:
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

3. **Wait 5-10 minutes** for DNS propagation

4. **Click "Verify"** in GitHub Pages settings

### Step 4: Verify GitHub Pages Source Branch

Ensure GitHub Pages is configured correctly:

1. In **Settings** → **Pages**:
   - **Source**: Should be set to a branch (usually `main` or `gh-pages`)
   - **Branch**: Should be the branch containing your site files
   - **Folder**: Usually `/ (root)`

2. **Verify CNAME file is in this branch**:
   ```bash
   git log --oneline --all -- CNAME
   ```

### Step 5: Wait for Verification

- GitHub's verification can take **10-30 minutes**
- DNS propagation can take **5-60 minutes** (up to 24 hours globally)
- HTTPS certificate provisioning can take **up to 24 hours**

## Alternative: Use www Subdomain Only

If the apex domain continues to have issues, you can temporarily use only the www subdomain:

1. In GitHub Pages settings, remove `agroverse.shop`
2. Add only `www.agroverse.shop`
3. Update CNAME file to `www.agroverse.shop`
4. Set up redirect from apex to www in Route53 or GitHub Pages

## Verification Checklist

After completing the steps above, verify:

- [ ] CNAME file is committed to the Pages branch
- [ ] Domain is added in GitHub Pages settings
- [ ] Verification TXT record added (if required)
- [ ] DNS resolves correctly: `dig agroverse.shop +short`
- [ ] Site is accessible: `curl -I https://agroverse.shop`
- [ ] GitHub Pages shows domain as "Verified" (green checkmark)

## Troubleshooting

### If Still Not Working After 24 Hours:

1. **Check DNS from Multiple Locations**:
   ```bash
   dig @8.8.8.8 agroverse.shop +short
   dig @1.1.1.1 agroverse.shop +short
   dig @208.67.222.222 agroverse.shop +short
   ```
   All should return the 4 GitHub Pages IPs.

2. **Check GitHub Pages Status**:
   - Visit: https://www.githubstatus.com/
   - Check for any GitHub Pages service issues

3. **Try Removing and Re-adding**:
   - Remove domain from GitHub
   - Wait 10 minutes
   - Re-add domain
   - Wait for verification

4. **Check Repository Name**:
   - Ensure the repository name matches the GitHub Pages URL
   - For `TrueSightDAO/agroverse_shop_beta`, the Pages URL might be different
   - Check if you need a `gh-pages` branch or different configuration

## Quick Fix Command

If you just need to commit the CNAME file:

```bash
cd /Users/garyjob/Applications/agroverse_shop
git add CNAME
git commit -m "Add CNAME file for agroverse.shop custom domain"
git push origin main  # or your Pages branch
```

Then go to GitHub Settings → Pages and add/verify the domain.

