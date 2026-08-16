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
      command:
        "ALLOWED_ORIGIN=http://127.0.0.1:5174 OPENAI_ENABLED=false SUPABASE_URL= SUPABASE_SECRET_KEY= SUPABASE_SERVICE_ROLE_KEY= SUPABASE_STORAGE_BUCKET= make -C ../backend dev PORT=8010",
      url: "http://127.0.0.1:8010/api/health",
      reuseExistingServer: false,
    },
    {
      command:
        "cd ../frontend && VITE_API_BASE_URL=http://127.0.0.1:8010 npm run dev -- --host 127.0.0.1 --port 5174",
      url: "http://127.0.0.1:5174/",
      reuseExistingServer: false,
    },
  ],
});
