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
    // Priority: BASE_URL env var > CI check > localhost:8000
    // For local testing, always use localhost:8000 unless BASE_URL is explicitly set
    baseURL: process.env.BASE_URL 
      ? process.env.BASE_URL
      : (process.env.CI && process.env.GITHUB_ACTIONS === 'true'
          ? (process.env.GITHUB_REPOSITORY === 'TrueSightDAO/agroverse_shop_prod'
              ? 'https://www.agroverse.shop' // Production repo → production URL
              : 'https://beta.agroverse.shop') // Beta repo → beta URL
          : 'http://localhost:8000'), // Local development server (default)
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    // Default to headless mode unless HEADED=true is explicitly set
    headless: process.env.HEADED !== 'true',
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
        // Default to headless mode unless HEADED=true is explicitly set
        headless: process.env.HEADED !== 'true',
      },
    },
  ],

  // Local development server - start when not in actual GitHub Actions CI
  // Can be disabled by setting START_SERVER=false
  webServer: (process.env.CI && process.env.GITHUB_ACTIONS === 'true') || process.env.START_SERVER === 'false' ? undefined : {
    command: 'python3 -m http.server 8000 --bind 127.0.0.1',
    port: 8000,
    reuseExistingServer: true, // Reuse if already running (local only)
    timeout: 120000, // 2 minutes to start server
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
