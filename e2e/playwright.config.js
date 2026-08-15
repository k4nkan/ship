const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: ".",
  use: {
    browserName: "chromium",
    launchOptions: {
      executablePath:
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    },
  },
  webServer: [
    {
      command: "make -C ../backend dev",
      url: "http://127.0.0.1:4173/api/health",
      reuseExistingServer: true,
    },
    {
      command: "make -C ../frontend dev",
      url: "http://127.0.0.1:5173/",
      reuseExistingServer: true,
    },
  ],
});
