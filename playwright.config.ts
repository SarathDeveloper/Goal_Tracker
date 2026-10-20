import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: 'e2e',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://127.0.0.1:3456',
  },
  webServer: {
    command: 'npx tsx --tsconfig tsconfig.server.json server/index.ts',
    url: 'http://127.0.0.1:3456/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      PORT: '3456',
      GOALTRACKER_DATA_DIR: '.e2e-data',
    },
  },
})
