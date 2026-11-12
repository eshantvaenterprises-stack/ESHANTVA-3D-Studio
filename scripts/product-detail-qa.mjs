import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/page-3';
const slugs = [
  'sample-desk-nameplate', 'sample-cable-organiser', 'sample-storage-box',
  'sample-geometric-planter', 'sample-key-tag', 'sample-desk-stand',
  'sample-wall-hook', 'sample-qr-display-stand', 'sample-utility-bracket',
  'sample-decorative-form',
];
const widths = [320, 360, 390, 412, 768, 1024, 1440];

await mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = { routes: [], responsive: [], flow: [], browserErrors: [] };

function watch(page, label) {
  page.on('console', (message) => {
    if (message.type() === 'error') report.browserErrors.push(`${label}: ${message.text()}`);
  });
  page.on('pageerror', (error) => report.browserErrors.push(`${label}: ${error.message}`));
}

async function assertNoOverflowOrBrokenImages(page, label) {
  await page.waitForLoadState('networkidle');
  const result = await page.evaluate(() => ({
    title: document.title,
    h1: document.querySelector('h1')?.textContent?.replace(/\s+/g, ' ').trim(),
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc),
  }));
  if (result.overflow) throw new Error(`${label}: horizontal overflow`);
  if (result.brokenImages.length) throw new Error(`${label}: broken images: ${result.brokenImages.join(', ')}`);
  if (!result.h1?.startsWith('SAMPLE')) throw new Error(`${label}: expected product H1`);
  return result;
}

// Verify every generated product URL directly in a fresh page, including JSON-LD and sample noindex.
for (const slug of slugs) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  watch(page, `route-${slug}`);
  const response = await page.goto(`${origin}/shop/${slug}`, { waitUntil: 'networkidle' });
  if (!response?.ok()) throw new Error(`${slug}: direct route returned ${response?.status()}`);
  const visual = await assertNoOverflowOrBrokenImages(page, slug);
  const seo = await page.evaluate(() => ({
    robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
    jsonLdTypes: [...document.querySelectorAll('script[type="application/ld+json"]')].map((node) => JSON.parse(node.textContent || '{}')['@type']),
  }));
  if (!seo.robots.includes('noindex')) throw new Error(`${slug}: sample route is not noindex`);
  if (!seo.jsonLdTypes.includes('Product') || !seo.jsonLdTypes.includes('BreadcrumbList')) throw new Error(`${slug}: JSON-LD missing`);
  report.routes.push({ slug, status: response.status(), ...visual, ...seo });
  await page.close();
}

// Verify the connected user journey and configuration-aware cart.
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
watch(page, 'connected-flow');
await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
if ((await page.locator('main > section').count()) !== 13) throw new Error('Home page section count changed');
await page.getByRole('link', { name: /Shop Products/i }).first().click();
await page.waitForURL(/\/shop\/?$/);
await page.locator('a[href="/shop/sample-desk-nameplate/"]').first().click();
await page.waitForURL(/\/shop\/sample-desk-nameplate\/?$/);
await page.reload({ waitUntil: 'networkidle' });
await page.screenshot({ path: `${outputDirectory}/00-product-desktop-top.png`, fullPage: false });
if (await page.locator('.pdp-thumbnails button').count() !== 3) throw new Error('Nameplate gallery did not render 3 images');
await page.locator('.pdp-main-media').click();
await page.getByRole('dialog').waitFor();
await page.getByLabel('Next image').click();
await page.keyboard.press('Escape');
await page.locator('fieldset', { hasText: 'Display name' }).locator('input').fill('Aarav');
await page.locator('fieldset', { hasText: 'Colour' }).getByText('Sample Orange', { exact: true }).click();
await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().click();
await page.getByText('Product added', { exact: true }).waitFor();
await page.screenshot({ path: `${outputDirectory}/01-product-desktop-configured.png`, fullPage: false });
await page.getByRole('link', { name: 'View Cart' }).click();
await page.waitForURL(/\/cart\/?$/);
if (await page.locator('.cart-line').count() !== 1) throw new Error('Configured cart line was not created');
for (const expected of ['Aarav', 'Sample Orange', 'Sample Standard']) {
  if (!(await page.locator('.cart-line').getByText(expected, { exact: true }).isVisible())) throw new Error(`Cart lost option: ${expected}`);
}
await page.screenshot({ path: `${outputDirectory}/02-cart-desktop.png`, fullPage: false });
report.flow.push('Home → Shop → Product → gallery → configuration → cart passed');

// Different personalization must create a separate cart line.
await page.goto(`${origin}/shop/sample-desk-nameplate`, { waitUntil: 'networkidle' });
await page.locator('fieldset', { hasText: 'Display name' }).locator('input').fill('Meera');
await page.locator('fieldset', { hasText: 'Colour' }).getByText('Sample Charcoal', { exact: true }).click();
await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().click();
await page.getByRole('link', { name: 'View Cart' }).click();
await page.waitForURL(/\/cart\/?$/);
const distinctLineCount = await page.locator('.cart-line').count();
if (distinctLineCount !== 2) {
  const storedCart = await page.evaluate(() => localStorage.getItem('eshantva-cart-v2'));
  throw new Error(`Distinct configuration created ${distinctLineCount} lines instead of 2. Stored cart: ${storedCart}`);
}
report.flow.push('Unique cart configuration passed');

// Direct, modifier, out-of-stock, and request-only states.
await page.goto(`${origin}/shop/sample-cable-organiser`, { waitUntil: 'networkidle' });
if (!(await page.getByRole('button', { name: 'Add to Cart', exact: true }).first().isEnabled())) throw new Error('Direct-purchase CTA is disabled');
await page.goto(`${origin}/shop/sample-storage-box`, { waitUntil: 'networkidle' });
await page.locator('label', { has: page.locator('input[value="sample-medium"]') }).click();
if (!(await page.locator('.pdp-price-status').getByText('₹509').isVisible())) throw new Error('Option price modifier not reflected');
await page.goto(`${origin}/shop/sample-desk-stand`, { waitUntil: 'networkidle' });
if (!(await page.getByRole('button', { name: 'Out of Stock', exact: true }).isDisabled())) throw new Error('Out-of-stock state is not disabled');
await page.goto(`${origin}/shop/sample-qr-display-stand`, { waitUntil: 'networkidle' });
if (!(await page.getByRole('link', { name: 'Request This Product', exact: true }).isVisible())) throw new Error('Request-only CTA missing');
if (!(await page.getByRole('button', { name: 'Secure upload unavailable' }).isDisabled())) throw new Error('Sample upload safeguard missing');
report.flow.push('Direct, modifier, unavailable, and request-only states passed');

// Responsive rendering and mobile action visibility at all requested widths.
for (const width of widths) {
  await page.setViewportSize({ width, height: width <= 412 ? 844 : 900 });
  await page.goto(`${origin}/shop/sample-desk-nameplate`, { waitUntil: 'networkidle' });
  const visual = await assertNoOverflowOrBrokenImages(page, `responsive-${width}`);
  const mobileBarVisible = await page.locator('.mobile-purchase-bar').isVisible();
  if (width <= 640 && !mobileBarVisible) throw new Error(`${width}px: mobile purchase bar missing`);
  if (width > 640 && mobileBarVisible) throw new Error(`${width}px: mobile purchase bar visible on desktop/tablet`);
  report.responsive.push({ width, mobileBarVisible, ...visual });
  if (width === 390) await page.screenshot({ path: `${outputDirectory}/03-product-mobile-390.png`, fullPage: false });
}

if (report.browserErrors.length) throw new Error(`Browser errors:\n${report.browserErrors.join('\n')}`);
const missingPage = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const missing = await missingPage.goto(`${origin}/shop/not-a-real-product`, { waitUntil: 'networkidle' });
if (missing?.status() !== 404) throw new Error(`Unknown product route returned ${missing?.status()}, expected 404`);
await missingPage.close();
report.flow.push('Unknown product 404 passed');

report.passed = true;
await writeFile(`${outputDirectory}/page-3-qa.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await browser.close();
