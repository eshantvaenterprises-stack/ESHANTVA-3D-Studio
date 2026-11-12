import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:3000';
const executablePath = process.env.CHROMIUM_PATH || undefined;
const outputDirectory = 'screenshots/services';
const widths = [320, 360, 375, 390, 412, 430, 768, 1024, 1280, 1440];
const anchors = ['custom-3d-printing', 'personalisation', 'design-support', 'prototyping', 'functional-parts', 'small-batch'];
await mkdir(outputDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const report = [];
const errors = [];

for (const width of widths) {
  const page = await browser.newPage({ viewport: { width, height: width < 700 ? 844 : 1000 } });
  page.on('pageerror', (error) => errors.push(`${width}: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${width}: ${message.text()}`); });
  await page.goto(`${origin}/services/`, { waitUntil: 'networkidle' });
  const result = await page.evaluate(() => ({
    title: document.title,
    h1Count: document.querySelectorAll('h1').length,
    startingPoints: document.querySelectorAll('.sv-start-card').length,
    capabilities: document.querySelectorAll('.sv-cap-card').length,
    statuses: document.querySelectorAll('.sv-status').length,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    missingImages: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
  }));
  if (result.h1Count !== 1) throw new Error(`${width}: expected one H1, found ${result.h1Count}`);
  if (result.startingPoints !== 6 || result.capabilities !== 6) throw new Error(`${width}: signature data is incomplete`);
  if (result.overflow) throw new Error(`${width}: horizontal overflow`);
  if (result.missingImages.length) throw new Error(`${width}: missing images`);
  report.push({ width, ...result });
  if (width === 390 || width === 1440) await page.screenshot({ path: `${outputDirectory}/services-${width}.png`, fullPage: true });
  await page.close();
}

for (const anchor of anchors) {
  const page = await browser.newPage({ viewport: { width: 1024, height: 900 } });
  await page.goto(`${origin}/services/#${anchor}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const result = await page.evaluate((id) => {
    const target = document.getElementById(id);
    return { exists: Boolean(target), hash: location.hash, top: target?.getBoundingClientRect().top ?? null };
  }, anchor);
  if (!result.exists || result.hash !== `#${anchor}`) throw new Error(`Direct anchor failed: ${anchor}`);
  if (result.top === null || result.top < 100 || result.top > 190) throw new Error(`Direct anchor offset failed: ${anchor} (${result.top}px)`);
  report.push({ anchor, ...result });
  await page.close();
}

if (errors.length) throw new Error(`Browser errors:\n${errors.join('\n')}`);
await writeFile(`${outputDirectory}/services-qa.json`, JSON.stringify({ passed: true, report }, null, 2));
console.log(JSON.stringify({ passed: true, checks: report.length }, null, 2));
await browser.close();
