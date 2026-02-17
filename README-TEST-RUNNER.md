# Smart Test Runner with Resume Capability

This test runner allows you to fix test failures and continue from where you left off, instead of restarting all tests.

## Features

- ✅ **Tracks test progress** - Saves which tests have passed/failed
- 🔄 **Resume capability** - Continue from last failure point
- 🎯 **Start from specific test** - Jump to any test by name
- 📊 **Progress tracking** - See which tests passed/failed
- 🔁 **Reset option** - Start fresh when needed

## Usage

### Run all tests (normal)
```bash
npm run test:smart
# or
node scripts/test-runner.js
```

### Resume from last failure
After fixing a test failure, resume from where it stopped:
```bash
npm run test:resume
# or
node scripts/test-runner.js --resume
# or
./scripts/resume-tests.sh
```

### Start from a specific test
```bash
node scripts/test-runner.js --from "hamburger-menu"
# or
node scripts/test-runner.js --from "mobile-cart"
```

### Reset and start fresh
```bash
npm run test:reset
# or
node scripts/test-runner.js --reset
```

### With environment variables
```bash
HEADED=true BASE_URL=http://localhost:8000 npm run test:smart
```

## Workflow Example

1. **Run tests:**
   ```bash
   npm run test:smart
   ```

2. **If a test fails:**
   ```
   ❌ hamburger-menu-functionality failed
   
   💡 To fix and continue:
      1. Fix the issue in the code
      2. Run: node scripts/test-runner.js --resume
   ```

3. **Fix the issue** in your code

4. **Resume tests:**
   ```bash
   npm run test:resume
   ```
   
   Tests will continue from the failed test, skipping already-passed tests.

## How It Works

- Creates `.test-state.json` to track progress
- Runs tests sequentially, one file at a time
- Saves state after each test (pass or fail)
- On failure, exits and saves current position
- On resume, continues from saved position
- Automatically cleans up state when all tests pass

## Test State File

The `.test-state.json` file tracks:
- `passed`: Array of test files that passed
- `failed`: Array of test files that failed
- `currentIndex`: Current position in test queue

This file is automatically created and managed. It's gitignored so it won't be committed.

## Integration with CI

For CI environments, use the standard Playwright commands:
```bash
npm test  # Standard Playwright runner
```

The smart test runner is designed for local development where you want to fix issues incrementally.
