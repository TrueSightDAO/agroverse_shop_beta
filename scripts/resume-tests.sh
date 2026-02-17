#!/bin/bash

# Convenience script to resume tests after fixing failures
# Usage: ./scripts/resume-tests.sh

cd "$(dirname "$0")/.."

echo "🔄 Resuming tests from last failure point..."
echo ""

# Check if state file exists
if [ ! -f ".test-state.json" ]; then
    echo "⚠️  No test state found. Running all tests from start..."
    node scripts/test-runner.js
    exit $?
fi

# Resume tests
node scripts/test-runner.js --resume
