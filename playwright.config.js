// Configuration des tests automatiques (navigateur Chromium sans affichage)
const { defineConfig } = require("@playwright/test");
module.exports = defineConfig({
  testDir: "tests",
  timeout: 60000,
  retries: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure" }
});
