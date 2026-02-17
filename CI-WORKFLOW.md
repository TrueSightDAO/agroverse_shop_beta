# CI Test Workflow - Run, Fix, Resume Protocol

## Standard Workflow for Local CI Runs

When running CI tests locally, follow this protocol:

### 1. Initial Run
```bash
HEADED=true BASE_URL=http://localhost:8000 npm run test:smart
```

### 2. If Tests Fail
- **DO NOT restart from the beginning**
- Fix the failing test(s) in the code
- Resume from the failure point using:

```bash
npm run test:resume
# or
HEADED=true BASE_URL=http://localhost:8000 node scripts/test-runner.js --resume
```

### 3. Repeat Until All Pass
- Continue fixing and resuming until all tests pass
- The test runner automatically tracks progress in `.test-state.json`
- Tests resume from the last failure point, not from the beginning

### 4. Reset When Needed
If you need to start completely fresh:
```bash
npm run test:reset
```

## Key Principles

1. **Never restart from top** - Always use `--resume` after fixing failures
2. **Fix incrementally** - Fix one failure at a time, then resume
3. **State is preserved** - Progress is saved in `.test-state.json` (gitignored)
4. **Automatic cleanup** - State file is deleted when all tests pass

## Test Runner Commands

- `npm run test:smart` - Run all tests with progress tracking
- `npm run test:resume` - Resume from last failure point
- `npm run test:reset` - Reset progress and start fresh
- `node scripts/test-runner.js --from <test-name>` - Start from specific test

## Environment Variables

- `HEADED=true` - Run tests in headed mode (see browser)
- `BASE_URL=http://localhost:8000` - Target local server
- `CI=true` - Use CI mode (headless, different timeouts)

## Example Session

```bash
# 1. Start tests
HEADED=true BASE_URL=http://localhost:8000 npm run test:smart

# Output shows failure:
# ❌ cart-icon-consistency failed

# 2. Fix the issue in css/cart.css or css/navigation.css

# 3. Resume (continues from cart-icon-consistency, doesn't restart)
npm run test:resume

# 4. If another test fails, fix and resume again
# Repeat until all pass ✅
```

## Common Issues Fixed

### Cart Icon Display Inconsistency
- **Issue**: Cart icon shows `display: flex` vs `display: inline-flex`
- **Fix**: Updated `css/cart.css` to use `inline-flex` and added `!important` rules in `navigation.css` for desktop
- **Files**: `css/cart.css`, `css/navigation.css`

## Notes

- Test state file (`.test-state.json`) is gitignored - don't commit it
- The test runner runs tests sequentially, one file at a time
- Each test file is treated as a unit - if it passes, it's marked as passed
- On failure, the runner exits and saves state for resumption
