const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:8888');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'debug_screenshot.png', fullPage: true });
  await browser.close();
})();
