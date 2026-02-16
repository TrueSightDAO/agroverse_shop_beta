# Visual Consistency Testing Strategy

## Overview

We use **Playwright** to ensure visual and layout consistency across both **agroverse.shop** and **truesight.me**. This prevents regressions and ensures a consistent user experience.

---

## What We Test

### 1. **Visual Consistency**
- ✅ Navigation header appears on all pages
- ✅ Footer appears on all pages
- ✅ Logo/branding elements are consistent
- ✅ Color scheme matches brand guidelines
- ✅ Typography (fonts) is consistent

### 2. **Layout Consistency**
- ✅ Page structure is consistent across similar page types
- ✅ Product pages have the same layout
- ✅ Category pages follow the same pattern
- ✅ No unexpected layout shifts

### 3. **Responsive Design**
- ✅ Pages work on mobile (375px)
- ✅ Pages work on tablet (768px)
- ✅ Pages work on desktop (1920px)
- ✅ No horizontal scrolling issues
- ✅ Navigation adapts correctly (hamburger menu on mobile)

### 4. **Functional Consistency**
- ✅ All internal links work (no 404s)
- ✅ Images load correctly (no broken images)
- ✅ Meta tags are present and consistent
- ✅ Product JSON-LD schema is present on product pages

### 5. **Cross-Browser Consistency**
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari (WebKit)
- ✅ Mobile browsers

---

## Test Structure

### Agroverse.shop Tests
**Location:** `agroverse_shop/tests/consistency.spec.ts`

**Key Pages Tested:**
- Homepage
- Category pages (retail-packs, wholesale-bulk)
- Product pages (all 9 products)
- Farm pages
- Shipment pages
- Partners page
- Blog

**Brand Checks:**
- Colors: `#3b3333` (primary), `#4d4d4d` (secondary), `#fefc8f` (accent)
- Fonts: Playfair Display (headings), Open Sans (body)

### TrueSight.me Tests
**Location:** `truesight_me/tests/consistency.spec.ts`

**Key Pages Tested:**
- Homepage
- DApp
- Ledger
- Exchange
- Governors
- Roadmap
- Quests
- Shipments

**Brand Checks:**
- Fonts: Space Grotesk, Inter

---

## Running Tests

### Setup (First Time)

```bash
# For Agroverse.shop
cd agroverse_shop
npm install
npx playwright install

# For TrueSight.me
cd truesight_me
npm install
npx playwright install
```

### Run Tests

```bash
# Run all tests
npm test

# Run with UI (interactive)
npm run test:ui

# Run with browser visible
npm run test:headed

# Update snapshots (if visual changes are intentional)
npm run test:update
```

### Run Both Sites

```bash
# From agroverse_shop directory
./tests/run-all-tests.sh
```

---

## Visual Regression Testing

Playwright captures screenshots of key pages. If the visual appearance changes, tests will fail.

**When to update snapshots:**
- ✅ Intentional design changes
- ✅ New features added
- ✅ Layout improvements

**When NOT to update snapshots:**
- ❌ Accidental CSS breaks
- ❌ Missing elements
- ❌ Layout shifts

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Visual Consistency Tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd agroverse_shop && npm install
          cd ../truesight_me && npm install
      
      - name: Install Playwright
        run: |
          cd agroverse_shop && npx playwright install --with-deps
          cd ../truesight_me && npx playwright install --with-deps
      
      - name: Run Agroverse tests
        run: cd agroverse_shop && npm test
      
      - name: Run TrueSight tests
        run: cd truesight_me && npm test
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-reports
          path: |
            agroverse_shop/playwright-report/
            truesight_me/playwright-report/
```

---

## Adding New Tests

### When Adding a New Page Type

1. **Add to KEY_PAGES array:**
   ```typescript
   const KEY_PAGES = [
     '/',
     '/your-new-page-type'
   ];
   ```

2. **Add specific checks if needed:**
   ```typescript
   test('New page type has required elements', async ({ page }) => {
     await page.goto(`${BASE_URL}/your-new-page-type`);
     await expect(page.locator('.required-element')).toBeVisible();
   });
   ```

### When Adding a New Product

Products are automatically tested if they follow the standard structure. Ensure:
- Product folder name matches URL
- Product JSON-LD is present
- Standard product page elements exist

---

## Troubleshooting

### Tests Failing Due to Dynamic Content

**Problem:** Screenshots differ due to timestamps, dynamic data, etc.

**Solution:** Use `mask` option to ignore dynamic elements:
```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('.dynamic-content')]
});
```

### Tests Timing Out

**Problem:** Pages take too long to load.

**Solution:** Increase timeout or check network:
```typescript
test.setTimeout(60000); // 60 seconds
```

### False Positives in Visual Regression

**Problem:** Minor visual differences causing failures.

**Solution:** Adjust `maxDiffPixels`:
```typescript
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 5000 // Allow more tolerance
});
```

---

## Best Practices

1. **Run tests before deploying** - Catch issues early
2. **Update snapshots intentionally** - Don't auto-update on failures
3. **Test on multiple browsers** - Ensure cross-browser consistency
4. **Test responsive breakpoints** - Mobile experience matters
5. **Keep tests fast** - Focus on key pages, not every single page

---

## Future Enhancements

Potential additions:
- [ ] Accessibility testing (a11y)
- [ ] Performance testing (Lighthouse)
- [ ] SEO checks (meta tags, structured data)
- [ ] Link crawling (all internal links)
- [ ] Form validation testing
- [ ] Cart/checkout flow testing

---

**Last Updated:** 2025-01-30
