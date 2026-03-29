import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  webServer: {
    command: 'npm run serve',
    port: 3000,
    reuseExistingServer: true,
  },
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    viewport: { width: 375, height: 667 }, // mobile-like
    actionTimeout: 5000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Pixel 5'] } },
  ],
});
