# CI/CD Setup for Visual Consistency Tests

## Overview

Playwright tests run automatically in **GitHub Actions** on every push and pull request. They also run locally for development.

---

## ✅ What's Already Set Up

### GitHub Actions Workflow
**File:** `.github/workflows/visual-consistency.yml`

**Triggers:**
- ✅ Push to `main`/`master` branch
- ✅ Pull requests
- ✅ Manual trigger (workflow_dispatch)

**What it does:**
1. Checks out code
2. Sets up Node.js 18
3. Installs dependencies (`npm ci`)
4. Installs Playwright browsers
5. Runs tests
6. Uploads test reports and screenshots as artifacts
7. Comments on PRs if tests fail

---

## 🚀 Local Development

### First Time Setup

```bash
# Install Node.js dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Running Tests Locally

```bash
# Run all tests (headless)
npm test

# Run with browser visible (see what's happening)
npm run test:headed

# Run in interactive UI mode (best for debugging)
npm run test:ui

# Update snapshots (when design changes are intentional)
npm run test:update

# View last test report
npm run test:report
```

---

## 🔄 CI/CD Workflow

### Automatic Runs

Tests run automatically when you:
- Push to `main` or `master`
- Open a pull request
- Merge a PR

### Manual Trigger

You can also trigger tests manually:
1. Go to GitHub repo → **Actions** tab
2. Select **Visual Consistency Tests** workflow
3. Click **Run workflow** → **Run workflow**

### Viewing Results

1. Go to your repo on GitHub
2. Click **Actions** tab
3. Click on the workflow run
4. See test results:
   - ✅ Green checkmark = all tests passed
   - ❌ Red X = tests failed (click to see details)
5. Download artifacts:
   - **playwright-report** - Full HTML report
   - **test-screenshots** - Screenshots of failures

---

## 📊 Test Reports

### In GitHub Actions

- Test summary appears in the Actions tab
- Failed tests show which assertions failed
- Screenshots of failures are uploaded as artifacts

### Local Reports

After running tests locally:
```bash
npm run test:report
```
Opens an interactive HTML report in your browser.

---

## 🔧 Configuration

### Playwright Config
**File:** `playwright.config.ts`

Key settings:
- `testDir: './tests'` - Where tests are located
- `baseURL: 'https://www.agroverse.shop'` - Base URL for tests
- `retries: 2` in CI - Retries failed tests twice
- `workers: 1` in CI - Run tests sequentially (more stable)

### GitHub Actions Config
**File:** `.github/workflows/visual-consistency.yml`

Key settings:
- `node-version: '18'` - Node.js version
- `timeout-minutes: 30` - Max time for workflow
- Only installs Chromium (faster CI, can add more browsers if needed)

---

## 🐛 Troubleshooting CI Failures

### Tests Pass Locally But Fail in CI

**Common causes:**
1. **Timing issues** - CI is slower
   - **Fix:** Increase timeouts in test files
2. **Different browser versions** - CI uses different Playwright version
   - **Fix:** Pin Playwright version in `package.json`
3. **Network timeouts** - CI network is slower
   - **Fix:** Increase `waitForLoadState` timeouts

### Visual Snapshots Fail in CI

**If design changes are intentional:**
1. Run locally: `npm run test:update`
2. Commit the updated snapshots
3. Push to trigger CI

**If changes are accidental:**
1. Download screenshots from CI artifacts
2. Compare with local screenshots
3. Fix the CSS/HTML issue
4. Don't update snapshots

### CI Takes Too Long

**Optimize:**
- Only test Chromium in CI (fastest)
- Reduce number of pages tested
- Use `fullyParallel: false` for some tests

---

## 📝 Best Practices

### Before Committing

```bash
# Run tests locally first
npm test

# If tests pass, commit and push
git add .
git commit -m "Your changes"
git push
```

### Updating Snapshots

```bash
# 1. Review what changed
npm run test:ui

# 2. If changes are correct, update snapshots
npm run test:update

# 3. Commit snapshot updates separately
git add test-results/
git commit -m "Update visual snapshots for [feature]"
```

### CI/CD Workflow

1. **Develop locally** → Run `npm test`
2. **Commit changes** → Push to branch
3. **CI runs automatically** → Check Actions tab
4. **Review failures** → Download artifacts if needed
5. **Fix issues** → Push fixes
6. **Merge PR** → CI runs again on merge

---

## 🔗 Related Documentation

- **Local Testing:** `tests/RUN_TESTS.md`
- **Testing Strategy:** `docs/TESTING_STRATEGY.md`
- **Playwright Docs:** https://playwright.dev

---

**Last Updated:** 2025-01-30
