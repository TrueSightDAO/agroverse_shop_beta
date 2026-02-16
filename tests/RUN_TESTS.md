# Running Visual Consistency Tests

## Local Development

### Quick Start

```bash
# Install dependencies (first time only)
npm install
npx playwright install

# Run all tests
npm test

# Run tests with browser visible (see what's happening)
npm run test:headed

# Run tests in interactive UI mode (recommended!)
npm run test:ui
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm test` | Run all tests headless |
| `npm run test:ui` | Run tests in interactive UI mode (best for debugging) |
| `npm run test:headed` | Run tests with browser visible |
| `npm run test:update` | Update visual snapshots (when design changes are intentional) |
| `npm run test:report` | Open last test report in browser |

### Running Specific Tests

```bash
# Run a specific test file
npx playwright test consistency.spec.ts

# Run tests matching a pattern
npx playwright test -g "navigation"

# Run tests on specific browser
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

---

## CI/CD (GitHub Actions)

Tests automatically run on:
- ✅ Every push to `main`/`master` branch
- ✅ Every pull request
- ✅ Manual trigger (workflow_dispatch)

### Viewing Results

1. Go to your GitHub repo
2. Click **Actions** tab
3. Click on the workflow run
4. View test results and download artifacts (HTML report, screenshots)

### Test Artifacts

- **playwright-report/** - Full HTML test report (available for 30 days)
- **test-screenshots/** - Screenshots of failures (available for 7 days)

---

## Troubleshooting

### Tests Fail Locally But Work in CI

**Check:**
- Are you testing against production URLs? (`https://www.agroverse.shop`)
- Is your local network blocking anything?
- Try: `npm run test:headed` to see what's happening

### Tests Fail in CI But Work Locally

**Common causes:**
- Timing issues (CI is slower)
- Different browser versions
- Network timeouts

**Fix:** Increase timeouts in test files or `playwright.config.ts`

### Visual Snapshots Keep Failing

**If design changes are intentional:**
```bash
npm run test:update
```

**If changes are accidental:**
- Check what changed in the screenshots
- Fix the CSS/HTML issue
- Don't update snapshots

---

## Best Practices

1. **Run tests before committing:**
   ```bash
   npm test
   ```

2. **Use UI mode for debugging:**
   ```bash
   npm run test:ui
   ```

3. **Update snapshots intentionally:**
   - Review changes first
   - Only update if design changes are correct
   - Commit snapshot updates separately

4. **Check CI results:**
   - Always review GitHub Actions results
   - Download and review HTML reports for failures

---

## CI/CD Configuration

The GitHub Actions workflow (`.github/workflows/visual-consistency.yml`) is already configured to:
- ✅ Run on push/PR
- ✅ Install dependencies
- ✅ Install Playwright browsers
- ✅ Run tests
- ✅ Upload reports and screenshots
- ✅ Comment on PRs if tests fail

No additional setup needed - just push to GitHub!
