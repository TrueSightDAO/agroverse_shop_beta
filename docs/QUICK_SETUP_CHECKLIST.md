# Quick Setup Checklist for Two Repositories

## ✅ Completed

1. **DNS A Records**: `agroverse.shop` → 4 GitHub Pages IPs ✅
2. **DNS CNAME**: `www.agroverse.shop` → `TrueSightDAO.github.io` ✅
3. **DNS CNAME**: `beta.agroverse.shop` → `TrueSightDAO.github.io` ✅ (just updated)
4. **CNAME File**: Committed to `agroverse_shop_beta` repo ✅

## ⚠️ Action Required

### 1. Configure Production Repository

**Go to**: https://github.com/TrueSightDAO/agroverse_shop_prod/settings/pages

**Steps**:
- [ ] Enable GitHub Pages (if not already enabled)
  - Source: Deploy from branch
  - Branch: `main` (or your Pages branch)
  - Folder: `/ (root)`
- [ ] Add custom domain: `agroverse.shop`
- [ ] Click "Save"
- [ ] If verification TXT record is provided, add it to Route53
- [ ] Click "Verify" (after adding TXT record)

### 2. Configure Beta Repository

**Go to**: https://github.com/TrueSightDAO/agroverse_shop_beta/settings/pages

**Steps**:
- [ ] Enable GitHub Pages (if not already enabled)
  - Source: Deploy from branch
  - Branch: `main` (or your Pages branch)
  - Folder: `/ (root)`
- [ ] Add custom domain: `beta.agroverse.shop`
- [ ] Click "Save"
- [ ] If verification TXT record is provided, add it to Route53
- [ ] Click "Verify" (after adding TXT record)

### 3. Verify CNAME Files in Repositories

**Production Repo** (`agroverse_shop_prod`):
- [ ] CNAME file exists in root directory
- [ ] Contains: `agroverse.shop`
- [ ] Committed to the branch that Pages deploys from

**Beta Repo** (`agroverse_shop_beta`):
- [ ] CNAME file exists in root directory
- [ ] Contains: `beta.agroverse.shop`
- [ ] Committed to the branch that Pages deploys from

## How It Works

1. **DNS Resolution**:
   - User visits `agroverse.shop` → DNS resolves to GitHub Pages IPs
   - User visits `beta.agroverse.shop` → DNS resolves via CNAME to `TrueSightDAO.github.io`

2. **GitHub Routing**:
   - GitHub receives request for `agroverse.shop`
   - Checks which repo has CNAME file with `agroverse.shop` → Routes to `agroverse_shop_prod`
   - GitHub receives request for `beta.agroverse.shop`
   - Checks which repo has CNAME file with `beta.agroverse.shop` → Routes to `agroverse_shop_beta`

3. **Result**:
   - `agroverse.shop` and `www.agroverse.shop` → Serve from `agroverse_shop_prod`
   - `beta.agroverse.shop` → Serves from `agroverse_shop_beta`

## Verification Commands

```bash
# Check production domain
dig agroverse.shop +short
# Should return 4 IPs

# Check www
dig www.agroverse.shop CNAME +short
# Should return: TrueSightDAO.github.io

# Check beta
dig beta.agroverse.shop CNAME +short
# Should return: TrueSightDAO.github.io (or truesightdao.github.io - same thing, DNS is case-insensitive)
```

## Troubleshooting

If you still see "NotServedByPagesError":

1. **Wait 10-30 minutes** after adding domains in GitHub
2. **Check CNAME files are committed** to both repos
3. **Verify domains are added** in GitHub Pages settings
4. **Add verification TXT records** if GitHub provides them
5. **Wait 24-48 hours** for full DNS propagation

## Notes

- Both CNAME records point to the same `TrueSightDAO.github.io` - this is correct!
- GitHub uses the CNAME file in each repository to route requests
- DNS is case-insensitive, so `TrueSightDAO.github.io` = `truesightdao.github.io`
- The CNAME file must be in the root of the repository branch that Pages deploys from

