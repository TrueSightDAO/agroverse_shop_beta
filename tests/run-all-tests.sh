#!/bin/bash
# Combined test runner for both Agroverse.shop and TrueSight.me

set -e

echo "🧪 Running Playwright Consistency Tests"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test Agroverse.shop
echo -e "${BLUE}Testing Agroverse.shop...${NC}"
cd "$(dirname "$0")/.."
if [ -f "package.json" ]; then
  npm test
else
  echo "⚠️  No package.json found. Run 'npm install' first."
fi

echo ""
echo -e "${BLUE}Testing TrueSight.me...${NC}"
cd ../truesight_me
if [ -f "package.json" ]; then
  npm test
else
  echo "⚠️  No package.json found. Run 'npm install' first."
fi

echo ""
echo -e "${GREEN}✅ All tests completed!${NC}"
