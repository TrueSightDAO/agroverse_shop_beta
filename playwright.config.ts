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
    baseURL: process.env.CI 
      ? 'https://www.agroverse.shop' // Production in CI
      : 'http://localhost:8000', // Local development server
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    headless: process.env.CI ? true : false, // Show browser locally
    viewport: { width: 1920, height: 1080 },
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        headless: process.env.CI ? true : false, // Show browser locally
      },
    },
  ],

  // Local development server
  webServer: process.env.CI ? undefined : {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    port: 8000,
    reuseExistingServer: true, // Reuse if already running
    timeout: 120000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
