# GitHub Pages Settings Persistence During Sync

## Problem

When syncing from `agroverse_shop_beta` to `agroverse_shop_prod`, the GitHub Pages settings in the repository Settings UI get unset/reset.

## Root Cause

GitHub Pages settings are stored in **two places**:

1. **Repository Settings UI** (GitHub's database) - Branch selection, custom domain, etc.
2. **CNAME file** (in repository) - The actual domain name

When you sync repos:
- Even though the sync script preserves the CNAME file, if it gets modified/committed, GitHub may reset the Pages settings
- GitHub checks the CNAME file on every commit and may auto-disable Pages if it detects inconsistencies
- The Settings UI can show as "unset" even though the CNAME file is correct

## Solution: Configure Pages via Settings UI (Recommended)

**The most persistent way** to configure GitHub Pages is through the repository Settings UI, not just the CNAME file:

### Steps for Production Repo (`agroverse_shop_prod`):

1. Go to: https://github.com/TrueSightDAO/agroverse_shop_prod/settings/pages
2. Under **Source**, select:
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`
3. Under **Custom domain**, enter: `agroverse.shop`
4. Check **"Enforce HTTPS"** (recommended)
5. Click **Save**

GitHub will:
- Automatically create/update the `CNAME` file
- Keep the settings persistent even if CNAME is temporarily modified
- Recreate CNAME if it gets deleted during sync

### Steps for Beta Repo (`agroverse_shop_beta`):

1. Go to: https://github.com/TrueSightDAO/agroverse_shop_beta/settings/pages
2. Under **Source**, select:
   - Branch: `main` (or your Pages branch)
   - Folder: `/ (root)`
3. Under **Custom domain**, enter: `beta.agroverse.shop`
4. Check **"Enforce HTTPS"** (recommended)
5. Click **Save**

## Why This Works Better

- **Settings persist in GitHub's database** - Not just in the CNAME file
- **Auto-recovery** - If CNAME gets deleted/modified, GitHub recreates it
- **Less fragile** - Settings survive sync operations better
- **One-time setup** - Configure once, then sync freely

## Updated Sync Script Behavior

The sync script (`scripts/sync-repos.sh`) has been updated to:

1. **Check if CNAME actually changed** before restoring it
2. **Only commit CNAME if it's different** from what's in git
3. **Prevent unnecessary CNAME commits** that trigger Pages resets

However, **the best practice is still to configure Pages via Settings UI** - this is more reliable.

## Verification

After syncing, verify Pages settings are still configured:

1. Check Settings → Pages → Custom domain shows the correct domain
2. Check that `CNAME` file exists with correct domain
3. If settings got reset, just re-enter the domain in Settings UI and save

## Troubleshooting

**If Pages settings get reset after sync:**

1. Don't panic - the CNAME file is likely still correct
2. Go to Settings → Pages
3. Re-enter the custom domain
4. Click Save
5. GitHub will verify DNS and restore settings

**If CNAME file is missing after sync:**

1. The sync script should restore it, but if not:
2. Go to Settings → Pages
3. Enter custom domain and save
4. GitHub will create the CNAME file automatically

## Best Practice Workflow

1. **Initial Setup** (one-time):
   - Configure Pages via Settings UI in both repos
   - Verify CNAME files are created correctly

2. **Regular Syncs**:
   - Run sync script normally
   - Script preserves CNAME automatically
   - Settings should persist (configured via UI)

3. **If Settings Get Reset**:
   - Re-enter domain in Settings UI
   - This is faster than debugging sync issues

## References

- [GitHub Pages Custom Domain Docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site)
- [Sync Script](../scripts/sync-repos.sh)
- [CNAME Sync Strategy](./CNAME_SYNC_STRATEGY.md)

