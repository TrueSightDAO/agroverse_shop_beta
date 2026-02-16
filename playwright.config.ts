import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Agroverse.shop consistency tests
 */
export default defineConfig({
  testDir: './tests',
  outputDir: './test-results',
  fullyParallel: false, // Run sequentially to avoid conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0, // No retries locally to see failures immediately
  workers: 1, // Single worker for better console output and debugging
  timeout: 60000, // 60 second timeout per test
  reporter: process.env.CI 
    ? [['html'], ['github'], ['list']] // GitHub Actions format + HTML report + list
    : [['list'], ['html']], // Local: list (console) + HTML report
  
  use: {
    // In CI, test against the appropriate environment based on repository
    // Locally, test against local server
    baseURL: process.env.CI 
      ? (process.env.GITHUB_REPOSITORY === 'TrueSightDAO/agroverse_shop_prod'
          ? 'https://www.agroverse.shop' // Production repo → production URL
          : 'https://beta.agroverse.shop') // Beta repo → beta URL
      : 'http://localhost:8000', // Local development server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Always headless in CI for performance, headed locally for debugging
    headless: !!process.env.CI, // Explicit boolean conversion
    viewport: { width: 1920, height: 1080 },
    // Increase timeout for CI (network may be slower)
    actionTimeout: process.env.CI ? 30000 : 10000,
    navigationTimeout: process.env.CI ? 60000 : 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Always headless in CI, headed locally for debugging
        headless: !!process.env.CI, // Explicit boolean conversion
      },
    },
  ],

  // Local development server - only start when NOT in CI
  // In CI, tests run against production (https://www.agroverse.shop)
  webServer: process.env.CI ? undefined : {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    port: 8000,
    reuseExistingServer: true, // Reuse if already running (local only)
    timeout: 120000, // 2 minutes to start server
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
