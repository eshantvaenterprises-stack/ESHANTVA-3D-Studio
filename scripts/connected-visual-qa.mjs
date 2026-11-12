import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/connected';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = [];

async function loadLazyImages(page) {
  await page.evaluate(async () => {
    const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
    for (let position = 0; position < document.documentElement.scrollHeight; position += Math.max(400, innerHeight * 0.7)) {
      scrollTo(0, position);
      await delay(120);
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await delay(150);
    scrollTo(0, 0);
  });
  await page.waitForTimeout(500);
}

async function inspect(page, label) {
  const result = await page.evaluate(() => ({
    url: location.pathname + location.search,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || null,
    homeSectionCount: location.pathname === '/' ? document.querySelectorAll('main > section').length : null,
    productCardCount: document.querySelectorAll('.shop-product-card').length,
    missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
    horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  report.push({ label, ...result });
  if (result.missingImages.length) throw new Error(`${label}: missing images found`);
  if (result.horizontalOverflow) throw new Error(`${label}: horizontal overflow found`);
  return result;
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const desktopErrors = [];
desktop.on('console', (message) => { if (message.type() === 'error') desktopErrors.push(message.text()); });
desktop.on('pageerror', (error) => desktopErrors.push(error.message));
await desktop.goto(`${origin}/`, { waitUntil: 'networkidle' });
await loadLazyImages(desktop);
const home = await inspect(desktop, 'desktop-home');
if (!home.h1?.includes('From Idea to')) throw new Error('Home Page H1 was not preserved.');
if (home.homeSectionCount !== 13) throw new Error(`Expected 13 Home sections, found ${home.homeSectionCount}.`);
await desktop.screenshot({ path: `${outputDirectory}/01-home-desktop.png`, fullPage: true });
await desktop.getByRole('link', { name: /Shop Products/i }).click();
await desktop.waitForURL(/\/shop\/?$/);
await loadLazyImages(desktop);
const shop = await inspect(desktop, 'desktop-shop-after-home-click');
if (!shop.h1?.includes('Shop 3D printed products')) throw new Error('Home → Shop navigation failed.');
if (shop.productCardCount !== 9) throw new Error(`Expected first-page 9 product cards, found ${shop.productCardCount}.`);
await desktop.screenshot({ path: `${outputDirectory}/02-shop-desktop.png`, fullPage: true });
await desktop.locator('.shop-product-card').first().getByRole('link', { name: /View SAMPLE/i }).click();
await desktop.waitForURL(/\/shop\/sample-/);
await loadLazyImages(desktop);
const product = await inspect(desktop, 'desktop-product-after-shop-click');
if (!product.h1?.startsWith('SAMPLE')) throw new Error('Shop → Product navigation failed.');
await desktop.screenshot({ path: `${outputDirectory}/03-product-desktop.png`, fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
const mobileErrors = [];
mobile.on('console', (message) => { if (message.type() === 'error') mobileErrors.push(message.text()); });
mobile.on('pageerror', (error) => mobileErrors.push(error.message));
await mobile.goto(`${origin}/`, { waitUntil: 'networkidle' });
await loadLazyImages(mobile);
await inspect(mobile, 'mobile-home');
await mobile.screenshot({ path: `${outputDirectory}/04-home-mobile.png`, fullPage: true });
await mobile.getByRole('link', { name: /Shop Products/i }).click();
await mobile.waitForURL(/\/shop\/?$/);
await loadLazyImages(mobile);
await inspect(mobile, 'mobile-shop-after-home-click');
await mobile.getByRole('button', { name: /Filters/i }).click();
const mobileDrawerHeading = mobile.locator('.filter-drawer').getByText('Filter products');
await mobileDrawerHeading.waitFor({ state: 'visible' });
if (!(await mobileDrawerHeading.isVisible())) throw new Error('Mobile filter drawer did not open.');
await mobile.locator('.filter-drawer .filter-heading').getByLabel('Close filters').click();
await mobile.screenshot({ path: `${outputDirectory}/05-shop-mobile.png`, fullPage: true });

if (desktopErrors.length || mobileErrors.length) {
  throw new Error(`Browser errors:\n${[...desktopErrors, ...mobileErrors].join('\n')}`);
}

await writeFile(`${outputDirectory}/connected-qa.json`, JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, report }, null, 2));
await browser.close();
