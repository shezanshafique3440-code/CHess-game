import { defineConfig } from '@playwright/test';
import base from './playwright.config';
export default defineConfig({
  ...base,
  testDir: './auth-tests',
  use: { ...base.use, baseURL: 'http://localhost:5174' },
  webServer: [
    {
      command: 'npm run dev --workspace @sangat/server',
      url: 'http://localhost:3002/health',
      env: { PORT: '3002', WEB_ORIGIN: 'http://localhost:5174' },
      reuseExistingServer: false,
    },
    {
      command: 'npm run dev -- --port 5174 --strictPort',
      url: 'http://localhost:5174',
      env: { API_PROXY_TARGET: 'http://localhost:3002' },
      reuseExistingServer: false,
    },
  ],
});
