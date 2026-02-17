#!/usr/bin/env node

/**
 * Smart Test Runner with Resume Capability
 * 
 * Tracks test progress and allows resuming from failures.
 * Usage:
 *   node scripts/test-runner.js                    # Run all tests
 *   node scripts/test-runner.js --resume           # Resume from last failure
 *   node scripts/test-runner.js --reset            # Reset progress and start fresh
 *   node scripts/test-runner.js --from <test>     # Start from specific test
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '..', '.test-state.json');
const TEST_RESULTS_DIR = path.join(__dirname, '..', 'test-results');

// Default test files
const TEST_FILES = [
  'tests/cart-icon-consistency.spec.ts',
  'tests/cart-functionality.spec.ts',
  'tests/cart-image-visibility.spec.ts',
  'tests/consistency.spec.ts',
  'tests/footer-consistency.spec.ts',
  'tests/hamburger-menu-functionality.spec.ts',
  'tests/header-footer-consistency.spec.ts',
  'tests/mobile-cart-functionality.spec.ts',
  'tests/mobile-menu-elements.spec.ts',
  'tests/nav-consistency.spec.ts',
  'tests/nav-footer-relationship.spec.ts',
  'tests/seo-content-alignment.spec.ts',
];

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      console.warn('⚠️  Could not load test state, starting fresh');
      return { passed: [], failed: [], currentIndex: 0 };
    }
  }
  return { passed: [], failed: [], currentIndex: 0 };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function resetState() {
  if (fs.existsSync(STATE_FILE)) {
    fs.unlinkSync(STATE_FILE);
  }
  console.log('✅ Test state reset');
}

function getTestName(testFile) {
  return path.basename(testFile, '.spec.ts');
}

function runTest(testFile, options = {}) {
  const { headed = false, baseURL = 'http://localhost:8000' } = options;
  
  console.log(`\n🧪 Running: ${getTestName(testFile)}`);
  console.log(`   File: ${testFile}`);
  console.log(`   Base URL: ${baseURL}`);
  console.log(`   Headed: ${headed ? 'Yes' : 'No (headless)'}`);
  
  const env = {
    ...process.env,
    BASE_URL: baseURL,
    // Ensure colors are enabled for better console output
    FORCE_COLOR: '1',
    NODE_ENV: process.env.NODE_ENV || 'test',
  };
  
  // Only set HEADED if explicitly requested, otherwise ensure headless
  if (headed) {
    env.HEADED = 'true';
  } else {
    // Explicitly unset HEADED to ensure headless mode
    delete env.HEADED;
  }
  
  const command = `npx playwright test "${testFile}" --reporter=list,html`;
  
  console.log(`\n📋 Command: ${command}`);
  console.log(`\n${'='.repeat(80)}\n`);
  
  // Use spawn for real-time console output
  // Parse command properly to handle quoted arguments
  const parts = command.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  const cmd = parts[0];
  const args = parts.slice(1).map(arg => arg.replace(/^"|"$/g, ''));
  
  return new Promise((resolve) => {
    console.log(`\n🚀 Starting test execution...\n`);
    
    const child = spawn(cmd, args, {
      env: {
        ...env,
        // Ensure unbuffered output
        NODE_NO_WARNINGS: '1',
      },
      cwd: path.join(__dirname, '..'),
      shell: false, // Don't use shell to avoid buffering issues
      stdio: 'inherit', // This pipes directly to parent's stdio for real-time output
    });
    
    child.on('close', (code) => {
      console.log(`\n${'='.repeat(80)}\n`);
      if (code === 0) {
        console.log(`✅ ${getTestName(testFile)} passed\n`);
        resolve({ success: true, testFile });
      } else {
        console.log(`❌ ${getTestName(testFile)} failed (exit code: ${code})\n`);
        resolve({ success: false, testFile, error: `Exit code: ${code}` });
      }
    });
    
    child.on('error', (error) => {
      console.error(`\n❌ Error running test: ${error.message}\n`);
      resolve({ success: false, testFile, error: error.message });
    });
  });
}

function findTestIndex(testFiles, testName) {
  return testFiles.findIndex(file => 
    getTestName(file).toLowerCase().includes(testName.toLowerCase()) ||
    file.includes(testName)
  );
}

async function main() {
  const args = process.argv.slice(2);
  const resume = args.includes('--resume');
  const reset = args.includes('--reset');
  const fromIndex = args.findIndex(arg => arg === '--from');
  const fromTest = fromIndex !== -1 ? args[fromIndex + 1] : null;
  
  if (reset) {
    resetState();
    return;
  }
  
  let state = loadState();
  let startIndex = 0;
  
  if (resume) {
    // Resume from last failure or continue from where we left off
    startIndex = state.currentIndex;
    console.log(`\n📋 Resuming from test ${startIndex + 1}/${TEST_FILES.length}`);
    console.log(`   Previously passed: ${state.passed.length}`);
    console.log(`   Previously failed: ${state.failed.length}`);
  } else if (fromTest) {
    // Start from specific test
    const index = findTestIndex(TEST_FILES, fromTest);
    if (index === -1) {
      console.error(`❌ Test not found: ${fromTest}`);
      console.log('Available tests:');
      TEST_FILES.forEach((file, i) => {
        console.log(`  ${i + 1}. ${getTestName(file)}`);
      });
      process.exit(1);
    }
    startIndex = index;
    console.log(`\n🎯 Starting from: ${getTestName(TEST_FILES[startIndex])}`);
  } else {
    // Fresh start
    state = { passed: [], failed: [], currentIndex: 0 };
    saveState(state);
  }
  
  // Get options from environment or defaults
  // Default to headless unless explicitly set to headed
  const options = {
    headed: process.env.HEADED === 'true', // Only headed if explicitly set
    baseURL: process.env.BASE_URL || 'http://localhost:8000',
  };
  
  // Ensure headless mode by default (unset HEADED if not explicitly true)
  if (process.env.HEADED !== 'true') {
    delete process.env.HEADED;
  }
  
  console.log(`\n🚀 Running tests with options:`);
  console.log(`   Headed: ${options.headed}`);
  console.log(`   Base URL: ${options.baseURL}`);
  console.log(`   Starting from index: ${startIndex}`);
  console.log(`\n💡 All test output will be displayed in real-time below:\n`);
  
  // Run tests from startIndex
  for (let i = startIndex; i < TEST_FILES.length; i++) {
      const testFile = TEST_FILES[i];
      state.currentIndex = i;
      saveState(state);
      
      const result = await runTest(testFile, options);
      
      if (result.success) {
      if (!state.passed.includes(testFile)) {
        state.passed.push(testFile);
      }
      // Remove from failed if it was there
      state.failed = state.failed.filter(f => f !== testFile);
      console.log(`✅ ${getTestName(testFile)} passed`);
    } else {
      if (!state.failed.includes(testFile)) {
        state.failed.push(testFile);
      }
      console.log(`\n❌ ${getTestName(testFile)} failed`);
      console.log(`\n💡 To fix and continue:`);
      console.log(`   1. Fix the issue in the code`);
      console.log(`   2. Run: node scripts/test-runner.js --resume`);
      console.log(`\n   Or start from this test:`);
      console.log(`   node scripts/test-runner.js --from "${getTestName(testFile)}"`);
      
      // Save state and exit on failure
      saveState(state);
      process.exit(1);
    }
    
    saveState(state);
  }
  
  // All tests passed
  console.log(`\n✅ All tests passed!`);
  console.log(`   Total: ${state.passed.length}`);
  resetState();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { loadState, saveState, resetState };
