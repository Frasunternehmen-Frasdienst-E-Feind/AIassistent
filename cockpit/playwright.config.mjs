// E2E-Smoke-Tests für das Feind Cockpit (Chromium, file://, claude-Laufzeit gemockt).
import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  testMatch: /.*\.spec\.mjs/,
  timeout: 30000,
  fullyParallel: true,
  reporter: [['list']],
  use: { viewport: { width: 1280, height: 900 }, trace: 'retain-on-failure', locale: 'de-DE', timezoneId: 'Europe/Berlin' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }]
});
