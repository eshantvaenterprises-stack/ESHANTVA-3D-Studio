import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/materials';
const widths = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440];
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = [];
const errors = [];
for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 1000 } });
  page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${width}: ${message.text()}`); });
  await page.goto(`${origin}/materials/`, { waitUntil: 'networkidle' });
  const result = await page.evaluate(() => ({
    title: document.title,
    h1Count: document.querySelectorAll('h1').length,
    needCards: document.querySelectorAll('.mt-need-card').length,
    materialCards: document.querySelectorAll('.mt-material-card').length,
    colourCards: document.querySelectorAll('.mt-swatch').length,
    neutralStatuses: document.querySelectorAll('.mt-status-neutral').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).length,
    mobileComparison: innerWidth <= 700 ? getComputedStyle(document.querySelector('.mt-comparison-cards')).display !== 'none' : null,
  }));
  if (result.h1Count !== 1 || result.needCards !== 6 || result.materialCards !== 3) throw new Error(`${width}: material content incomplete`);
  if (result.overflow) throw new Error(`${width}: horizontal overflow`);
  if (result.missingImages) throw new Error(`${width}: missing images`);
  report.push({ width, ...result });
  if (width === 390 || width === 1440) await page.screenshot({ path: `${outputDirectory}/materials-${width}.png`, fullPage: true });
  await page.close();
}

const direct = await browser.newPage({ viewport: { width: 1024, height: 900 } });
await direct.goto(`${origin}/materials/`, { waitUntil: 'networkidle' });
await direct.reload({ waitUntil: 'networkidle' });
if (!(await direct.getByRole('heading', { name: 'Choose for the result you need.' }).isVisible())) throw new Error('Direct Materials URL failed.');
await direct.getByRole('link', { name: /Ask About My Requirement/ }).click();
await direct.waitForURL('**/custom-order/');
if (!(await direct.getByRole('heading', { name: /Tell us what you want to make/ }).isVisible())) throw new Error('Custom Order route failed.');
await direct.close();

const generatedHtml = await readFile('out/materials/index.html', 'utf8').catch(() => '');
for (const forbidden of ['purchasePrice', 'landedCost', 'stockKg', 'spoolCount', 'reorderAtKg', 'costPerGram', 'machineModel', 'nozzleSize']) {
  if (generatedHtml.includes(forbidden)) throw new Error(`Generated HTML leaked private field: ${forbidden}`);
}
if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
await writeFile(`${outputDirectory}/materials-qa.json`, JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.length }, null, 2));
await browser.close();
