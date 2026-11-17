const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir:'./e2e',
  fullyParallel:false,
  workers:1,
  timeout:90000,
  expect:{timeout:15000},
  use:{baseURL:process.env.BASE_URL || 'http://127.0.0.1:3100', screenshot:'only-on-failure', trace:'retain-on-failure'},
  reporter:[['list'],['json',{outputFile:'docs/validation/evidence/browser-results.json'}]],
  projects:[{name:'chromium',use:{browserName:'chromium'}},{name:'firefox',use:{browserName:'firefox'}},{name:'webkit',use:{browserName:'webkit'}}],
});
