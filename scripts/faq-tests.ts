import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { businessIdentity } from '../src/config/businessIdentity';
import { customOrderConfig } from '../src/config/customOrder';
import { enabledFaqs, faqCategories, faqs } from '../src/data/faqs';

let checks = 0;
const check = (condition: unknown, message: string) => {
  assert.ok(condition, message);
  checks += 1;
};

const placeholderSource = readFileSync(new URL('../app/[...path]/page.tsx', import.meta.url), 'utf8');
const sitemapSource = readFileSync(new URL('../app/sitemap.ts', import.meta.url), 'utf8');
const faqPageSource = readFileSync(new URL('../app/faq/page.tsx', import.meta.url), 'utf8');
const faqExplorerSource = readFileSync(new URL('../src/components/faq/FaqExplorer.tsx', import.meta.url), 'utf8');
const faqDataSource = readFileSync(new URL('../src/data/faqs.ts', import.meta.url), 'utf8');

check(!placeholderSource.includes("'faq'"), '/faq must not remain in catch-all placeholder params.');
check(sitemapSource.includes("'/faq'"), '/faq must be included in implemented sitemap routes.');
check(sitemapSource.includes("siteConfig.catalogMode === 'live'"), 'Sample Shop must stay out of the sitemap until the catalog is live.');
check(faqPageSource.includes('Frequently Asked Questions | ESHANTVA 3D Studio'), 'FAQ metadata title missing.');
check(faqPageSource.includes('robots: { index: true, follow: true }'), 'FAQ must be indexable.');
check(faqExplorerSource.startsWith("'use client';"), 'Search/filter interaction should be isolated in a Client Component.');
check(faqExplorerSource.includes('<details'), 'FAQ should use accessible native disclosure controls.');
check(faqExplorerSource.includes('Search questions...'), 'FAQ search placeholder missing.');
check(faqExplorerSource.includes('No matching answer found.'), 'FAQ search empty state missing.');
check(faqPageSource.includes('Practical answers for choosing and managing your order.'), 'FAQ hero should use customer-focused guidance.');
check(!/factory secrets|non-public licence details|operational information/i.test(faqPageSource), 'FAQ page must not advertise withheld operational information.');

const requiredCategories = [
  'shop-products', 'custom-orders', 'bulk-orders', 'materials-options',
  'pricing-payment', 'delivery-pickup', 'process-changes', 'business-support',
];
for (const category of requiredCategories) check(faqCategories.some((item) => item.id === category), `Missing FAQ category ${category}.`);

check(enabledFaqs.length >= 20 && enabledFaqs.length <= 28, 'Enabled FAQ count should stay within the intended 20–28 range.');
check(new Set(faqs.map((faq) => faq.id)).size === faqs.length, 'FAQ IDs must be unique.');
check(new Set(faqs.map((faq) => faq.question.trim().toLowerCase())).size === faqs.length, 'FAQ questions must not be duplicated.');
for (const faq of enabledFaqs) {
  check(Boolean(faq.id.trim()), 'Enabled FAQ requires an ID.');
  check(Boolean(faq.question.trim()), `FAQ ${faq.id} requires a question.`);
  check(Boolean(faq.answer.trim()), `FAQ ${faq.id} requires an answer.`);
}

const cod = enabledFaqs.find((faq) => faq.id === 'payment-cod');
check(cod?.answer === 'No. Cash on delivery is not available.', 'COD answer must remain unambiguous.');

const payment = enabledFaqs.find((faq) => faq.id === 'payment-terms')?.answer ?? '';
check(payment.includes('lower-value accepted orders require full payment'), 'Lower-value payment rule missing.');
check(payment.includes('lower-value bulk orders'), 'Lower-value bulk payment rule missing.');
check(payment.includes('individually agreed partial or advance-payment terms'), 'High-value individually agreed terms missing.');
check(payment.includes('no publicly fixed percentage'), 'No-fixed-percentage rule missing.');

const delivery = enabledFaqs.find((faq) => faq.id === 'delivery-pan-india')?.answer ?? '';
check(delivery.includes('Pan-India shipping is enabled'), 'Pan-India shipping rule missing.');
check(delivery.includes('customer pays applicable shipping charges'), 'Customer-paid shipping rule missing.');
check((enabledFaqs.find((faq) => faq.id === 'delivery-pickup')?.answer ?? '').includes('no pickup charge'), 'Free local pickup rule missing.');
check((enabledFaqs.find((faq) => faq.id === 'delivery-local')?.answer ?? '').includes('location-based additional charge'), 'Location-based local delivery rule missing.');
check((enabledFaqs.find((faq) => faq.id === 'delivery-visit')?.answer ?? '').includes('prior appointment'), 'Appointment-based visit rule missing.');

const gst = enabledFaqs.find((faq) => faq.id === 'business-gst')?.answer ?? '';
check(gst.includes(businessIdentity.gstin), 'GST FAQ must use the centralized verified GSTIN.');
check(!faqDataSource.includes("18DHLPG9662M1ZH'"), 'FAQ dataset must not hardcode the GSTIN literal separately from business identity.');

const customStart = enabledFaqs.find((faq) => faq.id === 'custom-starting-information')?.answer ?? '';
for (const extension of customOrderConfig.acceptedExtensions) {
  check(customStart.includes(extension.replace(/^\./, '').toUpperCase()), `FAQ file types must include configured ${extension}.`);
}

const publicText = enabledFaqs.map((faq) => `${faq.question} ${faq.answer}`).join('\n').toLowerCase();
check(!/internal inventory|internal costing formulas|internal scheduling|manufacturing details are not part/i.test(publicText), 'FAQ answers should explain customer decisions without defensive internal-operation language.');
const prohibitedOperationalTerms = [
  'purchaseprice', 'stockkg', 'reorder threshold', 'printer model', 'nozzle size',
  'layer height', 'infill percentage', 'print speed', 'filament supplier', 'internal capacity',
];
for (const term of prohibitedOperationalTerms) check(!publicText.includes(term), `Operational detail leaked into FAQ: ${term}`);

check(!/\b\d+\s*%\s*(discount|advance|partial)/i.test(publicText), 'FAQ must not invent fixed discount/advance percentages.');
check(!/minimum quantity is \d+/i.test(publicText), 'FAQ must not invent a fixed MOQ.');
check(!/\b\d+\s*(hours?|days?|weeks?)\b/i.test(publicText), 'FAQ must not invent turnaround times.');
check(!/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b/.test(publicText), 'FAQ must not invent an email address.');
check(!/\+?\d[\d\s-]{8,}\d/.test(publicText), 'FAQ must not invent a phone number.');

console.log(`FAQ static checks passed: ${checks}`);
