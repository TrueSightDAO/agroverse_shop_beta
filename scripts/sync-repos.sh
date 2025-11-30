#!/bin/bash
# sync-repos.sh
# Syncs code between agroverse_shop_prod and agroverse_shop_beta
# Preserves CNAME files for each repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BETA_REPO="$REPO_ROOT"
PROD_REPO_PATH="${PROD_REPO_PATH:-../agroverse_shop_prod}"

# Default sync direction: beta -> prod
SYNC_DIRECTION="${1:-beta-to-prod}"

echo -e "${GREEN}🔄 Repository Sync Script${NC}"
echo "================================"
echo ""

# Determine source and destination
if [ "$SYNC_DIRECTION" == "beta-to-prod" ]; then
    SOURCE="$BETA_REPO"
    DEST="$PROD_REPO_PATH"
    SOURCE_NAME="beta"
    DEST_NAME="prod"
    DEST_CNAME="agroverse.shop"
elif [ "$SYNC_DIRECTION" == "prod-to-beta" ]; then
    SOURCE="$PROD_REPO_PATH"
    DEST="$BETA_REPO"
    SOURCE_NAME="prod"
    DEST_NAME="beta"
    DEST_CNAME="beta.agroverse.shop"
else
    echo -e "${RED}❌ Error: Invalid sync direction${NC}"
    echo "Usage: $0 [beta-to-prod|prod-to-beta]"
    exit 1
fi

# Check if destination exists
if [ ! -d "$DEST" ]; then
    echo -e "${RED}❌ Error: Destination repository not found: $DEST${NC}"
    echo "Set PROD_REPO_PATH environment variable or ensure the path is correct"
    exit 1
fi

echo -e "${YELLOW}Source:${NC} $SOURCE ($SOURCE_NAME)"
echo -e "${YELLOW}Destination:${NC} $DEST ($DEST_NAME)"
echo ""

# Backup destination CNAME
if [ -f "$DEST/CNAME" ]; then
    DEST_CNAME_BACKUP=$(cat "$DEST/CNAME")
    echo -e "${GREEN}✓${NC} Backed up destination CNAME: $DEST_CNAME_BACKUP"
else
    DEST_CNAME_BACKUP="$DEST_CNAME"
    echo -e "${YELLOW}⚠${NC}  No CNAME file found in destination, will create: $DEST_CNAME"
fi

# Confirm before proceeding
read -p "Continue with sync? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Sync cancelled."
    exit 0
fi

# Sync files (excluding .git and CNAME)
echo ""
echo -e "${YELLOW}Syncing files...${NC}"
rsync -av \
    --exclude='.git' \
    --exclude='CNAME' \
    --exclude='.gitignore' \
    --exclude='node_modules' \
    --exclude='.DS_Store' \
    --delete \
    "$SOURCE/" "$DEST/"

# Restore destination CNAME
echo "$DEST_CNAME" > "$DEST/CNAME"
echo -e "${GREEN}✓${NC} Restored destination CNAME: $DEST_CNAME"

# Show what changed
echo ""
echo -e "${YELLOW}Changes in destination:${NC}"
cd "$DEST"
git status --short

# Ask to commit
echo ""
read -p "Commit and push changes? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    git add .
    git commit -m "Sync from $SOURCE_NAME repo (CNAME preserved)"
    
    read -p "Push to remote? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git push
        echo -e "${GREEN}✓${NC} Changes pushed to remote"
    else
        echo -e "${YELLOW}⚠${NC}  Changes committed locally but not pushed"
    fi
else
    echo -e "${YELLOW}⚠${NC}  Changes staged but not committed"
    echo "Run 'git add . && git commit' manually in $DEST"
fi

echo ""
echo -e "${GREEN}✅ Sync complete!${NC}"

