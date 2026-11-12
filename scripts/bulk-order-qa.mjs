import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/bulk-order';
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = [];
const errors = [];

async function inspect(page, label) {
  const result = await page.evaluate(() => ({
    path: location.pathname + location.search,
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim() || null,
    step: document.querySelector('.co-step-heading h2')?.textContent?.trim() || null,
    stepCount: document.querySelectorAll('.co-stepper ol li').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
  }));
  if (result.overflow) throw new Error(`${label}: horizontal overflow`);
  if (result.missingImages.length) throw new Error(`${label}: missing images`);
  report.push({ label, ...result });
  return result;
}

async function openFresh(page, path) {
  await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'networkidle' });
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
desktop.on('pageerror', (error) => errors.push(`desktop: ${error.message}`));
desktop.on('console', (message) => { if (message.type() === 'error') errors.push(`desktop: ${message.text()}`); });

await openFresh(desktop, '/bulk-order/?product=sample-cable-organiser');
const start = await inspect(desktop, 'desktop-prefilled-start');
if (!start.h1?.includes('Need more than one?')) throw new Error('Bulk Order heading is missing.');
if (start.stepCount !== 6) throw new Error(`Existing-product flow should have 6 steps, found ${start.stepCount}.`);
await desktop.getByRole('button', { name: /Continue/ }).click();
if (!(await desktop.getByText('Bulk enquiry for').isVisible())) throw new Error('Valid product prefill context was not shown.');
if (!(await desktop.getByText('SAMPLE Cable Organiser', { exact: true }).isVisible())) throw new Error('Prefilled product was not selected.');

await desktop.getByRole('button', { name: 'Select product' }).click();
await desktop.getByPlaceholder('Search name, SKU, category or tag').fill('desk stand');
await desktop.getByRole('button', { name: 'Select SAMPLE Desk Stand' }).click();
if (await desktop.locator('.bo-item').count() !== 2) throw new Error('Multiple-product selection failed.');
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('Quantity — item 1').fill('50');
await desktop.getByLabel('Quantity — item 2').fill('20');
await desktop.getByLabel('Repeat / Recurring').check();
await desktop.getByLabel('Expected frequency').selectOption('monthly');
await desktop.getByLabel('Approximate quantity per cycle').fill('70');
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('PIN code').fill('784176');
await desktop.getByLabel('City').fill('Biswanath Chariali');
await desktop.getByLabel('State').fill('Assam');
await desktop.getByRole('button', { name: /Continue/ }).click();
await desktop.getByLabel('Who is this order for?').selectOption('business');
await desktop.getByLabel('Organization name').fill('QA Procurement Team');
await desktop.getByLabel('Contact person').fill('QA Customer');
await desktop.getByLabel('Email').fill('qa@example.com');
await desktop.getByText('I confirm that the information provided is accurate').click();
await desktop.getByRole('button', { name: /Continue/ }).click();
const review = await inspect(desktop, 'desktop-existing-review');
if (review.step !== 'Review before submitting') throw new Error('Existing-product review was not reached.');
if (!(await desktop.getByText('70 total units').isVisible())) throw new Error('Multiple-item quantity summary is incorrect.');
if (!(await desktop.getByText('Pricing will be confirmed after review.').isVisible())) throw new Error('Quotation boundary is missing.');
await desktop.screenshot({ path: `${outputDirectory}/01-existing-review-desktop.png`, fullPage: true });
await desktop.getByRole('button', { name: /Submit Bulk Enquiry/ }).click();
if (!(await desktop.getByText('Production submission is disabled while the sample catalog is active.').isVisible())) throw new Error('Sample-catalog submission did not fail closed.');

const customized = await browser.newPage({ viewport: { width: 390, height: 844 } });
customized.on('pageerror', (error) => errors.push(`mobile-customized: ${error.message}`));
await openFresh(customized, '/bulk-order/');
await customized.getByLabel('Customize an Existing Product in Bulk').check();
await customized.getByRole('button', { name: /Continue/ }).click();
await customized.getByRole('button', { name: 'Select product' }).click();
await customized.getByPlaceholder('Search name, SKU, category or tag').fill('key tag');
await customized.getByRole('button', { name: 'Select SAMPLE Key Tag' }).click();
await customized.getByLabel('Personalised text').fill('TEAM');
await customized.getByRole('button', { name: /Continue/ }).click();
await customized.getByLabel('Quantity').fill('25');
await customized.getByRole('button', { name: /Continue/ }).click();
await customized.getByLabel('Different Per Unit').check();
await customized.getByLabel('Customization details').fill('Each unit will use a different authorized name supplied as plain text.');
await customized.getByRole('button', { name: /Continue/ }).click();
const customFileStep = await inspect(customized, 'mobile-customized-files');
if (customFileStep.step !== 'Attach files and references') throw new Error('Customized file step was not reached.');
if (!(await customized.getByText('CSV cells are treated as untrusted text').isVisible())) throw new Error('CSV security boundary is missing.');
await customized.screenshot({ path: `${outputDirectory}/02-customized-files-mobile.png`, fullPage: true });
await customized.close();

const custom = await browser.newPage({ viewport: { width: 1024, height: 900 } });
await openFresh(custom, '/bulk-order/');
await custom.getByLabel('Submit a Custom Bulk Requirement').check();
await custom.getByRole('button', { name: /Continue/ }).click();
const customStart = await inspect(custom, 'desktop-custom-requirement');
if (customStart.stepCount !== 8) throw new Error(`Custom requirement flow should have 8 steps, found ${customStart.stepCount}.`);
await custom.getByLabel('Requirement title').fill('Event table identifiers');
await custom.getByLabel('Describe the custom bulk requirement').fill('A coordinated set of branded table identifiers for an indoor community event.');
await custom.getByLabel('Intended use').fill('Guest table identification');
await custom.getByRole('button', { name: /Continue/ }).click();
await custom.getByLabel('Quantity').fill('1');
await custom.getByRole('button', { name: /Continue/ }).click();
if (!(await custom.getByText('For a single custom item').isVisible())) throw new Error('Quantity-one Custom Order cross-link is missing.');
await custom.close();

const invalid = await browser.newPage({ viewport: { width: 390, height: 844 } });
await openFresh(invalid, '/bulk-order/?product=not-a-real-product');
if (await invalid.locator('.co-source-product').count()) throw new Error('Invalid product slug was trusted.');
if (await invalid.locator('.bo-item').count()) throw new Error('Invalid product slug created a line item.');
await inspect(invalid, 'mobile-invalid-prefill-safe');
await invalid.close();

for (const width of [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 900 } });
  page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`));
  await page.goto(`${origin}/bulk-order/`, { waitUntil: 'networkidle' });
  await inspect(page, `responsive-${width}`);
  await page.close();
}

const success = await browser.newPage({ viewport: { width: 390, height: 844 } });
await success.goto(`${origin}/bulk-order/success/`, { waitUntil: 'networkidle' });
if (!(await success.getByText('No verified submission was found').isVisible())) throw new Error('Direct success URL fabricated a confirmation.');
await success.screenshot({ path: `${outputDirectory}/03-success-safe-state-mobile.png`, fullPage: true });
await success.close();

if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
await writeFile(`${outputDirectory}/bulk-order-qa.json`, JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, report }, null, 2));
await desktop.close();
await browser.close();
