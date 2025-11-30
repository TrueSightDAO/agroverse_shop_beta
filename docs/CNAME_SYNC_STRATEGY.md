# CNAME File Sync Strategy for Two Repositories

## Problem

When syncing `agroverse_shop_prod` with `agroverse_shop_beta`:
- **Production repo** needs: `CNAME` file with `agroverse.shop`
- **Beta repo** needs: `CNAME` file with `beta.agroverse.shop`
- **Conflict**: If you sync files directly, the CNAME will overwrite and break GitHub Pages configuration

## Solution Options

### Option 1: Exclude CNAME from Sync (Recommended) ✅

**Strategy**: Keep CNAME files out of sync, managed separately in each repo.

**Implementation**:

1. **Add CNAME to .gitignore in sync script**:
   ```bash
   # When syncing, exclude CNAME
   rsync -av --exclude='CNAME' source/ dest/
   ```

2. **Or use git to sync, excluding CNAME**:
   ```bash
   # Sync everything except CNAME
   git checkout prod-branch -- . ':!CNAME'
   ```

3. **Manually manage CNAME in each repo**:
   - Production: `echo "agroverse.shop" > CNAME`
   - Beta: `echo "beta.agroverse.shop" > CNAME`
   - Commit separately in each repo

### Option 2: Use GitHub Pages Settings (Best Practice) ✅

**Strategy**: Let GitHub manage the CNAME file automatically via Settings → Pages.

**How it works**:
- When you add a custom domain in GitHub Pages settings, GitHub automatically creates/updates the CNAME file
- You don't need to manually manage the CNAME file
- If the file gets overwritten during sync, GitHub will recreate it

**Steps**:
1. Configure custom domain in GitHub Pages settings (one-time setup)
2. Sync code between repos normally
3. If CNAME gets overwritten, GitHub will auto-fix it on next deployment

### Option 3: Post-Sync CNAME Restoration Script

**Strategy**: Sync everything, then restore the correct CNAME in each repo.

**Script Example**:
```bash
#!/bin/bash
# sync-repos.sh

# Sync from beta to prod (or vice versa)
SOURCE_REPO="agroverse_shop_beta"
DEST_REPO="agroverse_shop_prod"

# Backup CNAME files
cp "$DEST_REPO/CNAME" "$DEST_REPO/CNAME.backup"

# Sync everything
rsync -av --exclude='.git' "$SOURCE_REPO/" "$DEST_REPO/"

# Restore correct CNAME for destination repo
if [ "$DEST_REPO" == "agroverse_shop_prod" ]; then
    echo "agroverse.shop" > "$DEST_REPO/CNAME"
elif [ "$DEST_REPO" == "agroverse_shop_beta" ]; then
    echo "beta.agroverse.shop" > "$DEST_REPO/CNAME"
fi

# Commit the changes
cd "$DEST_REPO"
git add .
git commit -m "Sync from $SOURCE_REPO (CNAME preserved)"
git push
```

### Option 4: Use .gitattributes with merge strategy

**Strategy**: Configure Git to handle CNAME differently in each branch.

**Implementation**:
```bash
# In .gitattributes
CNAME merge=ours
```

This tells Git to always keep the local version of CNAME during merges.

## Recommended Approach

**Best Practice**: **Option 2 (GitHub Pages Settings) + Option 1 (Exclude from Sync)**

1. **Configure domains in GitHub Pages settings** (one-time):
   - Production repo: Settings → Pages → Custom domain: `agroverse.shop`
   - Beta repo: Settings → Pages → Custom domain: `beta.agroverse.shop`

2. **Exclude CNAME from sync operations**:
   - When syncing code, exclude the CNAME file
   - Let GitHub manage it automatically

3. **If CNAME gets overwritten**:
   - GitHub will recreate it on next deployment
   - Or manually restore via GitHub Pages settings

## Sync Script Example

```bash
#!/bin/bash
# sync-beta-to-prod.sh
# Syncs code from beta repo to prod repo, preserving CNAME files

BETA_REPO="/path/to/agroverse_shop_beta"
PROD_REPO="/path/to/agroverse_shop_prod"

# Backup CNAME files
PROD_CNAME=$(cat "$PROD_REPO/CNAME" 2>/dev/null || echo "agroverse.shop")
BETA_CNAME=$(cat "$BETA_REPO/CNAME" 2>/dev/null || echo "beta.agroverse.shop")

# Sync everything except CNAME and .git
rsync -av \
  --exclude='.git' \
  --exclude='CNAME' \
  --exclude='.gitignore' \
  "$BETA_REPO/" "$PROD_REPO/"

# Restore CNAME files
echo "$PROD_CNAME" > "$PROD_REPO/CNAME"
echo "$BETA_CNAME" > "$BETA_REPO/CNAME"

# Commit in prod repo
cd "$PROD_REPO"
git add .
git commit -m "Sync from beta repo (CNAME preserved)"
git push origin main
```

## Alternative: Use GitHub Actions for Automated Sync

Create a GitHub Action that syncs repos while preserving CNAME:

```yaml
# .github/workflows/sync-repos.yml
name: Sync Beta to Prod

on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 * * *'  # Daily at midnight

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          repository: TrueSightDAO/agroverse_shop_beta
          token: ${{ secrets.SYNC_TOKEN }}
          path: beta
      
      - uses: actions/checkout@v3
        with:
          repository: TrueSightDAO/agroverse_shop_prod
          token: ${{ secrets.SYNC_TOKEN }}
          path: prod
      
      - name: Backup CNAME
        run: |
          cp prod/CNAME prod/CNAME.backup || echo "agroverse.shop" > prod/CNAME.backup
      
      - name: Sync files
        run: |
          rsync -av --exclude='.git' --exclude='CNAME' beta/ prod/
      
      - name: Restore CNAME
        run: |
          cp prod/CNAME.backup prod/CNAME
      
      - name: Commit and push
        run: |
          cd prod
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add .
          git commit -m "Auto-sync from beta repo" || exit 0
          git push
```

## Best Practices Summary

1. ✅ **Configure domains in GitHub Pages settings** (not in code)
2. ✅ **Exclude CNAME from sync operations**
3. ✅ **Let GitHub auto-manage CNAME files**
4. ✅ **Document the sync process** so team members know CNAME is special
5. ✅ **Add CNAME to sync exclusion list** in any automation scripts

## Quick Reference

**To sync beta → prod while preserving CNAME**:
```bash
# Exclude CNAME from sync
rsync -av --exclude='CNAME' --exclude='.git' beta/ prod/

# Restore prod CNAME
echo "agroverse.shop" > prod/CNAME

# Commit
cd prod && git add . && git commit -m "Sync from beta" && git push
```

**To sync prod → beta while preserving CNAME**:
```bash
# Exclude CNAME from sync
rsync -av --exclude='CNAME' --exclude='.git' prod/ beta/

# Restore beta CNAME
echo "beta.agroverse.shop" > beta/CNAME

# Commit
cd beta && git add . && git commit -m "Sync from prod" && git push
```

