import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/custom-order';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = [];

async function inspect(page, label) {
  const result = await page.evaluate(() => ({
    path: location.pathname + location.search,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    step: document.querySelector('.co-step-heading h2')?.textContent?.trim() || null,
  }));
  if (result.overflow) throw new Error(`${label}: horizontal overflow`);
  report.push({ label, ...result });
  return result;
}

async function openRequest(page, suffix = '') {
  await page.goto(`${origin}/custom-order/${suffix}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  if (suffix) await page.reload({ waitUntil: 'networkidle' });
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
desktop.on('pageerror', (error) => errors.push(error.message));
desktop.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await openRequest(desktop, '?sourceProduct=sample-custom-keytag');
const desktopStart = await inspect(desktop, 'desktop-request-start');
if (!desktopStart.h1?.includes('Tell us what you want to make')) throw new Error('Custom Order heading is missing.');
if (await desktop.locator('.co-request-types > label').count() !== 7) throw new Error('Expected seven request type cards.');
if (!(await desktop.getByText('Product reference: sample-custom-keytag').isVisible())) throw new Error('PDP source product context was not preserved.');
await desktop.screenshot({ path: `${outputDirectory}/01-custom-order-desktop.png`, fullPage: true });

await desktop.getByLabel('Create a custom product').check();
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('Request title').fill('Custom desk organiser');
await desktop.getByLabel('Describe what you need').fill('A compact desk organiser for pens, notes and small workshop tools.');
await desktop.getByLabel('What will it be used for?').fill('Keeping small tools organised on a desk.');
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('Quantity').fill('3');
await desktop.getByLabel('Local pickup').check();
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('Your name').fill('QA Customer');
await desktop.getByLabel('Email').fill('qa@example.com');
await desktop.getByText(/I have the right to share/).click();
await desktop.getByText(/I reviewed the supplied files/).click();
await desktop.getByRole('button', { name: /Continue/ }).click();
const review = await inspect(desktop, 'desktop-review');
if (review.step !== 'Review before submitting') throw new Error('Review step was not reached.');
if (!(await desktop.getByText('Pricing will be confirmed after review').isVisible())) throw new Error('Review pricing rule is missing.');
await desktop.screenshot({ path: `${outputDirectory}/02-custom-order-review-desktop.png`, fullPage: true });
await desktop.getByRole('button', { name: /Submit Custom Request/ }).click();
if (!(await desktop.getByText('Production submission is disabled').isVisible())) throw new Error('Unconfigured production backend must fail closed.');

await openRequest(desktop);
await desktop.getByLabel('Replacement or functional part').check();
await desktop.getByRole('button', { name: /Continue/ }).click();
if (!(await desktop.getByText('Manual review required').isVisible())) throw new Error('Functional-part review notice is missing.');
await desktop.screenshot({ path: `${outputDirectory}/03-functional-request-desktop.png`, fullPage: true });

for (const width of [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 } });
  page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`));
  await page.goto(`${origin}/custom-order/`, { waitUntil: 'networkidle' });
  await inspect(page, `responsive-${width}`);
  if (width === 390) await page.screenshot({ path: `${outputDirectory}/04-custom-order-mobile-390.png`, fullPage: true });
  await page.close();
}

const success = await browser.newPage({ viewport: { width: 390, height: 844 } });
await success.goto(`${origin}/custom-order/success/`, { waitUntil: 'networkidle' });
if (!(await success.getByText('No verified submission was found').isVisible())) throw new Error('Direct success URL should not fabricate a confirmation.');
await success.screenshot({ path: `${outputDirectory}/05-success-safe-state-mobile.png`, fullPage: true });
await success.close();

if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
await writeFile(`${outputDirectory}/custom-order-qa.json`, JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, report }, null, 2));
await browser.close();

