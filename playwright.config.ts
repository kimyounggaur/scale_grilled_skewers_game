import { defineConfig, devices } from '@playwright/test';

/** CI tests intentionally do not start a managed-container preview daemon. */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 12_000 },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-360', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 640 } } },
    { name: 'chromium-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } } },
    { name: 'chromium-1024', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
    { name: 'webkit-360', use: { ...devices['Desktop Safari'], viewport: { width: 360, height: 640 } } },
    { name: 'webkit-390', use: { ...devices['Desktop Safari'], viewport: { width: 390, height: 844 } } },
    { name: 'webkit-1024', use: { ...devices['Desktop Safari'], viewport: { width: 1024, height: 768 } } },
  ],
});
