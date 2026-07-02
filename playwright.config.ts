import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// .env.test.local holds E2E_TEST_EMAIL/E2E_TEST_PASSWORD for the dedicated
// test account (gitignored, isolated by RLS — never touches the real
// account's rows). If this throws, create that file first.
process.loadEnvFile(".env.test.local");

// Some remote/CI containers pre-install Chromium at this path (to skip a slow
// download) but at a browser revision that may not match this package's
// expected one. Only use it when present — everywhere else (a normal machine,
// a fresh CI runner), let Playwright manage its own version-matched browser.
const preInstalledChromium = "/opt/pw-browsers/chromium";
const chromiumLaunchOptions = {
  args: ["--no-sandbox"], // needed when running as root in a container
  ...(existsSync(preInstalledChromium)
    ? { executablePath: preInstalledChromium }
    : {}),
};

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: "list",
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["iPhone 14"],
        launchOptions: chromiumLaunchOptions,
      },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
