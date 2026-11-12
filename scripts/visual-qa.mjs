import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch({ headless: true });
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';

for (const viewport of [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${origin}/shop/`, { waitUntil: 'networkidle' });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    h1Count: document.querySelectorAll('h1').length,
    missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
    visibleButtons: [...document.querySelectorAll('a,button')].filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }).length,
  }));

  if (viewport.name === 'mobile') {
    await page.getByLabel('Open navigation menu').click();
    const mobileMenuVisible = await page.getByRole('navigation', { name: 'Mobile navigation' }).isVisible();
    await page.getByLabel('Close navigation menu').click();
    await page.getByLabel('Open product search').click();
    const searchVisible = await page.getByRole('dialog').isVisible();
    await page.getByLabel('Close search').first().click();
    metrics.mobileMenuVisible = mobileMenuVisible;
    metrics.searchVisible = searchVisible;
    await page.getByRole('button', { name: /Filters/ }).click();
    metrics.filterDrawerVisible = await page.getByText('Filter products').last().isVisible();
    await page.getByLabel('Close filters').first().click();
  }

  await page.screenshot({ path: `screenshots/${viewport.name}-full.png`, fullPage: true });
  await page.screenshot({ path: `screenshots/${viewport.name}-fold.png`, fullPage: false });
  console.log(JSON.stringify({ viewport, metrics, consoleErrors, pageErrors }));
  await page.close();
}

await browser.close();
