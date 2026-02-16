# Playwright Consistency Tests for Agroverse.shop

Automated tests to ensure visual and layout consistency across all pages.

## Setup

```bash
# Install Playwright
npm install -D @playwright/test
npx playwright install

# Or with yarn
yarn add -D @playwright/test
yarn playwright install
```

## Running Tests

```bash
# Run all tests
npx playwright test

# Run specific test file
npx playwright test consistency.spec.ts

# Run in UI mode (interactive)
npx playwright test --ui

# Run with browser visible
npx playwright test --headed

# Run on specific browser
npx playwright test --project=chromium
```

## Test Coverage

### Visual Consistency Tests
- ✅ Navigation header consistency
- ✅ Footer consistency
- ✅ Brand colors consistency
- ✅ Font consistency
- ✅ Responsive design (mobile/tablet/desktop)
- ✅ Product page structure consistency
- ✅ No broken images
- ✅ Valid internal links
- ✅ Meta tags consistency

### Visual Regression Tests
- ✅ Homepage snapshots (desktop/mobile)
- ✅ Product page snapshots
- ✅ Cross-browser visual consistency

## What Gets Tested

### Key Pages Tested
- Homepage (`/`)
- Category pages (`/category/retail-packs`, `/category/wholesale-bulk`)
- Product pages (all 9 products)
- Farm pages (`/farms/*`)
- Shipment pages (`/shipments/*`)
- Partners page
- Blog

### Breakpoints Tested
- Mobile: 375x667 (iPhone SE)
- Tablet: 768x1024 (iPad)
- Desktop: 1920x1080

### Browsers Tested
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Updating Snapshots

If visual changes are intentional:

```bash
# Update snapshots
npx playwright test --update-snapshots
```

## CI Integration

Add to GitHub Actions or CI pipeline:

```yaml
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run tests
  run: npx playwright test

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## Troubleshooting

**Tests failing due to dynamic content?**
- Adjust `maxDiffPixels` in screenshot assertions
- Use `mask` option to ignore dynamic elements

**Tests timing out?**
- Increase timeout in `playwright.config.ts`
- Check network conditions

**Need to test more pages?**
- Add URLs to `KEY_PAGES` array in `consistency.spec.ts`
