import { defineConfig, devices } from "@playwright/test";

const PORT = 4310;

/** E2E against the MSW mock backend (`vite --mode mock`), no real services needed. */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}/agent-desk/`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node node_modules/vite/bin/vite.js --mode mock --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/agent-desk/`,
    // `pnpm mock` opens every case page to every login and starts with live chats (.env.mock); tests need each
    // user's real roles and an empty desk.
    env: { VITE_MOCK_FULL_CASE_ACCESS: "false", VITE_MOCK_LIVE_CHATS: "false" },
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
